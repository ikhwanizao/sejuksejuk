from django.db import models
from django.conf import settings


def attachment_upload_path(instance, filename):
    return f"orders/{instance.report.order.order_no}/attachments/{filename}"


def receipt_upload_path(instance, filename):
    return f"orders/{instance.report.order.order_no}/receipt/{filename}"


class ServiceReport(models.Model):
    order = models.OneToOneField(
        "orders.Order", on_delete=models.CASCADE, related_name="report"
    )
    work_done = models.TextField()
    extra_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    remarks = models.TextField(blank=True)
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for {self.order.order_no}"


class ServiceAttachment(models.Model):
    class Kind(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"
        PDF = "pdf", "PDF"

    report = models.ForeignKey(ServiceReport, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=attachment_upload_path)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.kind} – {self.report.order.order_no}"


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        TRANSFER = "transfer", "Bank Transfer"
        CARD = "card", "Card"
        EWALLET = "ewallet", "E-Wallet"

    report = models.OneToOneField(ServiceReport, on_delete=models.CASCADE, related_name="payment")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices)
    receipt_photo = models.ImageField(upload_to=receipt_upload_path, null=True, blank=True)
    captured_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.method} {self.amount} – {self.report.order.order_no}"
