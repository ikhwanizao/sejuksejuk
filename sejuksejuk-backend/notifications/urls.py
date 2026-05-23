from django.urls import path
from .views import NotificationListView, NotificationRegenerateView

urlpatterns = [
    path("orders/<int:order_pk>/notifications/", NotificationListView.as_view(), name="notification-list"),
    path("orders/<int:order_pk>/notifications/regenerate/", NotificationRegenerateView.as_view(), name="notification-regenerate"),
]
