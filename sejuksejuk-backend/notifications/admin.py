from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["order", "channel", "recipient_type", "recipient_phone", "notification_status", "created_at"]
    list_filter = ["channel", "recipient_type", "notification_status"]
    readonly_fields = ["deep_link_url", "message", "created_at"]
