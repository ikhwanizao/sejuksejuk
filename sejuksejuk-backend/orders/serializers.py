from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Order, OrderEvent, ServiceType


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ["id", "name", "default_price"]


class OrderEventSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = OrderEvent
        fields = ["id", "event_type", "from_status", "to_status", "actor", "note", "at"]


class OrderListSerializer(serializers.ModelSerializer):
    assigned_technician = UserSerializer(read_only=True)
    service_type = ServiceTypeSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_no", "customer_name", "customer_phone",
            "service_type", "status", "quoted_price",
            "assigned_technician", "created_at",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    assigned_technician = UserSerializer(read_only=True)
    service_type = ServiceTypeSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    events = OrderEventSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_no", "customer_name", "customer_phone", "customer_address",
            "problem_description", "service_type", "quoted_price", "admin_notes",
            "status", "assigned_technician", "created_by", "created_at", "updated_at",
            "events",
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    service_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceType.objects.all(), source="service_type", required=False, allow_null=True
    )

    class Meta:
        model = Order
        fields = [
            "id", "order_no", "customer_name", "customer_phone", "customer_address",
            "problem_description", "service_type_id", "quoted_price", "admin_notes",
        ]
        read_only_fields = ["id", "order_no"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class OrderUpdateSerializer(serializers.ModelSerializer):
    service_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceType.objects.all(), source="service_type", required=False, allow_null=True
    )

    class Meta:
        model = Order
        fields = [
            "customer_name", "customer_phone", "customer_address",
            "problem_description", "service_type_id", "quoted_price", "admin_notes",
        ]


class AssignSerializer(serializers.Serializer):
    technician_id = serializers.IntegerField()

    def validate_technician_id(self, value):
        from accounts.models import User
        try:
            user = User.objects.get(pk=value, role="technician")
        except User.DoesNotExist:
            raise serializers.ValidationError("No active technician with this ID.")
        return user
