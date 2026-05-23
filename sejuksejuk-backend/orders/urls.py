from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, ServiceTypeViewSet

router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"service-types", ServiceTypeViewSet, basename="servicetype")

urlpatterns = [
    path("", include(router.urls)),
]
