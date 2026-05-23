from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["at", "actor", "action", "target_type", "target_id"]
    list_filter = ["action", "target_type"]
    search_fields = ["actor__username", "action", "target_id"]
    readonly_fields = ["at", "actor", "action", "target_type", "target_id", "payload_json"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
