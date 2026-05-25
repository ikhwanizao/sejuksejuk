from rest_framework import serializers as drf_serializers
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from orders.models import Order

from .models import Notification


class NotificationSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "channel", "recipient_type", "recipient_phone",
            "message", "deep_link_url", "notification_status", "created_at",
        ]


class InboxNotificationSerializer(drf_serializers.ModelSerializer):
    order_no = drf_serializers.CharField(source="order.order_no", read_only=True)
    order_id = drf_serializers.IntegerField(source="order.id", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "message", "order_no", "order_id", "recipient_type", "is_read", "created_at"]


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=NotificationSerializer(many=True))
    def get(self, request, order_pk):
        order = get_object_or_404(Order, pk=order_pk)
        if request.user.role == "technician" and order.assigned_technician_id != request.user.pk:
            return Response({"detail": "Forbidden."}, status=403)
        notifications = order.notifications.all()
        return Response(NotificationSerializer(notifications, many=True).data)


class InboxView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=InboxNotificationSerializer(many=True))
    def get(self, request):
        notifications = (
            Notification.objects
            .filter(recipient_user=request.user)
            .select_related("order")
            .order_by("-created_at")[:50]
        )
        return Response(InboxNotificationSerializer(notifications, many=True).data)


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: {"type": "object", "properties": {"marked_read": {"type": "integer"}}}})
    def post(self, request):
        count = Notification.objects.filter(
            recipient_user=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": count})


class ClearAllView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: {"type": "object", "properties": {"deleted": {"type": "integer"}}}})
    def delete(self, request):
        count, _ = Notification.objects.filter(recipient_user=request.user).delete()
        return Response({"deleted": count})


class ClearOneView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, pk):
        notif = get_object_or_404(Notification, pk=pk, recipient_user=request.user)
        notif.delete()
        return Response(status=204)
