from django.urls import path
from .views import AIQueryView, ConversationDetailView

urlpatterns = [
    path("query/", AIQueryView.as_view(), name="ai-query"),
    path("conversations/<int:pk>/", ConversationDetailView.as_view(), name="ai-conversation"),
]
