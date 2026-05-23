import random
import string
from django.db import models
from django.conf import settings


class ServiceType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    default_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return self.name


def _generate_order_no():
    chars = string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"ORD{suffix}"


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        JOB_DONE = "job_done", "Job Done"
        REVIEWED = "reviewed", "Reviewed"
        CLOSED = "closed", "Closed"

    order_no = models.CharField(max_length=20, unique=True, editable=False)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20)
    customer_address = models.TextField()
    problem_description = models.TextField()
    service_type = models.ForeignKey(
        ServiceType, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    quoted_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    assigned_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_orders",
        limit_choices_to={"role": "technician"},
    )
    admin_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_no:
            # Ensure uniqueness with retry loop
            for _ in range(10):
                candidate = _generate_order_no()
                if not Order.objects.filter(order_no=candidate).exists():
                    self.order_no = candidate
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_no} – {self.customer_name}"


class OrderEvent(models.Model):
    """Audit trail for order status transitions."""

    class EventType(models.TextChoices):
        STATUS_CHANGE = "status_change", "Status Change"
        RESCHEDULE = "rescheduled", "Rescheduled"
        NOTE = "note", "Note"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    note = models.TextField(blank=True)
    at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.order.order_no} {self.event_type} at {self.at}"
