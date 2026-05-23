from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsTechnician(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "technician"


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "manager"


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("manager", "admin")


class IsAssignedTechnician(BasePermission):
    """Object-level: only the technician assigned to the order may act on it."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "technician"

    def has_object_permission(self, request, view, obj):
        # obj is either an Order or a ServiceReport; resolve to order
        order = obj if hasattr(obj, "assigned_technician") else getattr(obj, "order", None)
        if order is None:
            return False
        return order.assigned_technician_id == request.user.pk
