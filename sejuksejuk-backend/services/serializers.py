from rest_framework import serializers
from .models import ServiceAttachment, ServiceReport, Payment
from .validators import detect_kind, validate_attachment_count, validate_attachment_file


class ServiceAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url 
        return None

    class Meta:
        model = ServiceAttachment
        fields = ["id", "file", "file_url", "kind", "uploaded_at"]
        read_only_fields = ["id", "kind", "uploaded_at"]


class ServiceAttachmentCreateSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, file):
        validate_attachment_file(file)
        return file

    def validate(self, attrs):
        report = self.context["report"]
        validate_attachment_count(report)
        return attrs

    def create(self, validated_data):
        file = validated_data["file"]
        kind = detect_kind(file)
        return ServiceAttachment.objects.create(
            report=self.context["report"], file=file, kind=kind
        )


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "amount", "method", "receipt_photo", "captured_at"]
        read_only_fields = ["id", "captured_at"]


class ServiceReportSerializer(serializers.ModelSerializer):
    attachments = ServiceAttachmentSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model = ServiceReport
        fields = [
            "id", "order_id", "work_done", "extra_charges", "final_amount",
            "remarks", "technician_id", "completed_at", "attachments", "payment",
        ]
        read_only_fields = ["id", "order_id", "final_amount", "technician_id", "completed_at"]


class ServiceReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceReport
        fields = ["work_done", "extra_charges", "remarks"]

    def validate_extra_charges(self, value):
        if value < 0:
            raise serializers.ValidationError("Extra charges cannot be negative.")
        return value
