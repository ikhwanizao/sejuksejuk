from .models import Order


def visible_orders(user, queryset=None):
    """Apply the same order visibility rules to orders and related resources."""
    qs = Order.objects.all() if queryset is None else queryset
    if not user.is_authenticated:
        return qs.none()
    if user.role == "technician":
        return qs.filter(assigned_technician=user)
    if user.role == "manager":
        if not user.branch_id:
            return qs.none()
        return qs.filter(created_by__branch_id=user.branch_id)
    if user.role == "admin":
        return qs
    return qs.none()
