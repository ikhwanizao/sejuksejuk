from django.contrib import admin
from .models import ServiceAttachment, ServiceReport, Payment


class AttachmentInline(admin.TabularInline):
    model = ServiceAttachment
    extra = 0


@admin.register(ServiceReport)
class ServiceReportAdmin(admin.ModelAdmin):
    list_display = ["order", "technician", "final_amount", "completed_at"]
    inlines = [AttachmentInline]


admin.site.register(Payment)
