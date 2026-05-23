from django.db import models


class Notification(models.Model):
    class Channel(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"

    class RecipientType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        TECHNICIAN = "technician", "Technician"
        MANAGER = "manager", "Manager"

    class NotificationStatus(models.TextChoices):
        GENERATED = "generated", "Generated"
        SENT = "sent", "Sent"

    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, related_name="notifications"
    )
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.WHATSAPP)
    recipient_type = models.CharField(max_length=20, choices=RecipientType.choices)
    recipient_phone = models.CharField(max_length=20)
    message = models.TextField()
    deep_link_url = models.TextField()
    notification_status = models.CharField(
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.GENERATED,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.channel} to {self.recipient_type} for {self.order.order_no}"
