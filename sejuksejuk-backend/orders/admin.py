from django.contrib import admin
from .models import Order, OrderEvent, ServiceType


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    readonly_fields = ["event_type", "from_status", "to_status", "actor", "at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_no", "customer_name", "service_type", "status", "assigned_technician", "created_at"]
    list_filter = ["status", "service_type"]
    search_fields = ["order_no", "customer_name", "customer_phone"]
    inlines = [OrderEventInline]
    readonly_fields = ["order_no", "created_at", "updated_at"]


admin.site.register(ServiceType)
admin.site.register(OrderEvent)
