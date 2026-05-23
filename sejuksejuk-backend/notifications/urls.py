from django.urls import path
from .views import NotificationListView, NotificationRegenerateView, InboxView, MarkReadView, ClearAllView, ClearOneView

urlpatterns = [
    path("notifications/inbox/", InboxView.as_view(), name="notification-inbox"),
    path("notifications/inbox/mark-read/", MarkReadView.as_view(), name="notification-mark-read"),
    path("notifications/inbox/clear/", ClearAllView.as_view(), name="notification-clear-all"),
    path("notifications/inbox/<int:pk>/", ClearOneView.as_view(), name="notification-clear-one"),
    path("orders/<int:order_pk>/notifications/", NotificationListView.as_view(), name="notification-list"),
    path("orders/<int:order_pk>/notifications/regenerate/", NotificationRegenerateView.as_view(), name="notification-regenerate"),
]
