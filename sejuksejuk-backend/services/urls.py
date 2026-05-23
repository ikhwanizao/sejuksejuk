from django.urls import path
from .views import (
    AttachmentDeleteView,
    AttachmentListCreateView,
    PaymentCreateView,
    ReportDetailView,
)

urlpatterns = [
    path("orders/<int:order_pk>/report/", ReportDetailView.as_view(), name="report-detail"),
    path("reports/<int:report_pk>/attachments/", AttachmentListCreateView.as_view(), name="attachment-list"),
    path("reports/<int:report_pk>/attachments/<int:att_pk>/", AttachmentDeleteView.as_view(), name="attachment-delete"),
    path("reports/<int:report_pk>/payment/", PaymentCreateView.as_view(), name="payment-create"),
]
