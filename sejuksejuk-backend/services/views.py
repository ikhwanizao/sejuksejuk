from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import IsAssignedTechnician, IsManagerOrAdmin
from audit.utils import record_action
from notifications.services import NotificationService
from orders.models import Order, OrderEvent
from orders.serializers import OrderDetailSerializer
from orders.state import validate_transition

from .models import ServiceAttachment, ServiceReport
from .serializers import (
    PaymentSerializer,
    ServiceAttachmentCreateSerializer,
    ServiceAttachmentSerializer,
    ServiceReportCreateSerializer,
    ServiceReportSerializer,
)


def complete_order(request, pk):
    """Called from orders.views.OrderViewSet.complete action."""
    order = get_object_or_404(Order, pk=pk)

    # Permission: must be assigned technician
    perm = IsAssignedTechnician()
    if not perm.has_permission(request, None) or not perm.has_object_permission(request, None, order):
        return Response({"detail": "Only the assigned technician can complete this order."},
                        status=status.HTTP_403_FORBIDDEN)

    validate_transition(order.status, "job_done")

    ser = ServiceReportCreateSerializer(data=request.data)
    ser.is_valid(raise_exception=True)

    with transaction.atomic():
        quoted = order.quoted_price or 0
        extra = ser.validated_data.get("extra_charges", 0)
        report = ServiceReport.objects.create(
            order=order,
            work_done=ser.validated_data["work_done"],
            extra_charges=extra,
            final_amount=quoted + extra,
            remarks=ser.validated_data.get("remarks", ""),
            technician=request.user,
        )
        from_status = order.status
        order.status = "job_done"
        order.save(update_fields=["status", "updated_at"])
        OrderEvent.objects.create(
            order=order,
            event_type=OrderEvent.EventType.STATUS_CHANGE,
            from_status=from_status,
            to_status="job_done",
            actor=request.user,
        )

    # Trigger WhatsApp notification (non-blocking)
    try:
        NotificationService.notify_job_done(order)
    except Exception:
        pass  # Do not fail the completion if notification errors

    record_action(request.user, "order_job_done", order)
    return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


class ReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ServiceReportSerializer)
    def get(self, request, order_pk):
        order = get_object_or_404(Order, pk=order_pk)
        report = get_object_or_404(ServiceReport, order=order)
        return Response(ServiceReportSerializer(report).data)


class AttachmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ServiceAttachmentSerializer(many=True))
    def get(self, request, report_pk):
        report = get_object_or_404(ServiceReport, pk=report_pk)
        return Response(ServiceAttachmentSerializer(report.attachments.all(), many=True).data)

    @extend_schema(request=ServiceAttachmentCreateSerializer, responses={201: ServiceAttachmentSerializer})
    def post(self, request, report_pk):
        report = get_object_or_404(ServiceReport, pk=report_pk)
        # Only assigned technician or admin can add attachments before review
        if request.user.role == "technician" and report.order.assigned_technician_id != request.user.pk:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        ser = ServiceAttachmentCreateSerializer(
            data=request.data, context={"report": report, "request": request}
        )
        ser.is_valid(raise_exception=True)
        attachment = ser.save()
        return Response(ServiceAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


class AttachmentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={204: None})
    def delete(self, request, report_pk, att_pk):
        report = get_object_or_404(ServiceReport, pk=report_pk)
        if report.order.status in ("reviewed", "closed"):
            return Response({"detail": "Cannot delete attachment after review."},
                            status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == "technician" and report.order.assigned_technician_id != request.user.pk:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        att = get_object_or_404(ServiceAttachment, pk=att_pk, report=report)
        att.file.delete(save=False)
        att.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PaymentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PaymentSerializer, responses={201: PaymentSerializer})
    def post(self, request, report_pk):
        report = get_object_or_404(ServiceReport, pk=report_pk)
        if hasattr(report, "payment"):
            return Response({"detail": "Payment already recorded."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == "technician" and report.order.assigned_technician_id != request.user.pk:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        ser = PaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment = ser.save(report=report)
        record_action(request.user, "payment_captured", report.order)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
