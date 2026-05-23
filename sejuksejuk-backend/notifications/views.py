from rest_framework import serializers as drf_serializers
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.permissions import IsManagerOrAdmin
from orders.models import Order

from .models import Notification
from .services import NotificationService


class NotificationSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "channel", "recipient_type", "recipient_phone",
            "message", "deep_link_url", "notification_status", "created_at",
        ]


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=NotificationSerializer(many=True))
    def get(self, request, order_pk):
        order = get_object_or_404(Order, pk=order_pk)
        if request.user.role == "technician" and order.assigned_technician_id != request.user.pk:
            return Response({"detail": "Forbidden."}, status=403)
        notifications = order.notifications.all()
        return Response(NotificationSerializer(notifications, many=True).data)


class NotificationRegenerateView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(request=None, responses={201: NotificationSerializer(many=True)})
    def post(self, request, order_pk):
        order = get_object_or_404(Order, pk=order_pk)
        notifications = NotificationService.notify_job_done(order)
        return Response(NotificationSerializer(notifications, many=True).data, status=201)
