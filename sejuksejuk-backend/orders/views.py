from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsManagerOrAdmin, IsAssignedTechnician
from audit.utils import record_action
from .filters import OrderFilter
from .models import Order, OrderEvent, ServiceType
from .serializers import (
    AssignSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderUpdateSerializer,
    ServiceTypeSerializer,
)
from .state import validate_transition


class ServiceTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer
    permission_classes = [IsAuthenticated]


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = OrderFilter
    search_fields = ["order_no", "customer_name", "customer_phone"]
    ordering_fields = ["created_at", "status", "quoted_price"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Guard for drf-spectacular schema introspection
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()
        user = self.request.user
        qs = Order.objects.select_related(
            "service_type", "assigned_technician", "created_by"
        ).prefetch_related("events__actor")
        if user.role == "technician":
            return qs.filter(assigned_technician=user)
        if user.role == "manager" and user.branch:
            return qs.filter(created_by__branch=user.branch)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        if self.action in ("update", "partial_update"):
            return OrderUpdateSerializer
        if self.action in ("list",):
            return OrderListSerializer
        return OrderDetailSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAdmin()]
        if self.action in ("update", "partial_update"):
            return [IsAdmin()]
        if self.action == "assign":
            return [IsAdmin()]
        if self.action == "start":
            return [IsAssignedTechnician()]
        if self.action == "complete":
            return [IsAssignedTechnician()]
        if self.action == "review":
            return [IsManagerOrAdmin()]
        if self.action == "close":
            return [IsManagerOrAdmin()]
        return [IsAuthenticated()]

    def _transition(self, request, pk, to_status, extra_event_type=None):
        order = self.get_object()
        validate_transition(order.status, to_status)
        from_status = order.status
        with transaction.atomic():
            order.status = to_status
            order.save(update_fields=["status", "updated_at"])
            OrderEvent.objects.create(
                order=order,
                event_type=extra_event_type or OrderEvent.EventType.STATUS_CHANGE,
                from_status=from_status,
                to_status=to_status,
                actor=request.user,
            )
        record_action(request.user, f"order_{to_status}", order)
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        order = self.get_object()
        ser = AssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        technician = ser.validated_data["technician_id"]
        from_status = order.status
        previous_technician = order.assigned_technician

        if from_status == "new":
            validate_transition(order.status, "assigned")
            to_status = "assigned"
            event_type = OrderEvent.EventType.STATUS_CHANGE
            note = f"Assigned to {technician.username}"
            update_fields = ["assigned_technician", "status", "updated_at"]
        elif from_status in {"assigned", "in_progress"}:
            to_status = from_status
            event_type = OrderEvent.EventType.NOTE
            previous = previous_technician.username if previous_technician else "unassigned"
            note = f"Reassigned from {previous} to {technician.username}"
            update_fields = ["assigned_technician", "updated_at"]
        else:
            raise ValidationError("Technician can only be assigned before the job is done.")

        with transaction.atomic():
            order.assigned_technician = technician
            order.status = to_status
            order.save(update_fields=update_fields)
            OrderEvent.objects.create(
                order=order,
                event_type=event_type,
                from_status=from_status,
                to_status=to_status,
                actor=request.user,
                note=note,
            )
        record_action(
            request.user,
            "order_reassigned" if previous_technician else "order_assigned",
            order,
        )
        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        self.check_object_permissions(request, self.get_object())
        return self._transition(request, pk, "in_progress")

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Handled by services app; this action delegates to ServiceReport creation."""
        from services.views import complete_order
        return complete_order(request, pk)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        return self._transition(request, pk, "reviewed")

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        return self._transition(request, pk, "closed")
