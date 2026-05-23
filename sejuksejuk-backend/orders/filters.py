from django_filters import rest_framework as filters
from .models import Order


class OrderFilter(filters.FilterSet):
    status = filters.ChoiceFilter(choices=Order.Status.choices)
    assigned_technician = filters.NumberFilter(field_name="assigned_technician__id")
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    service_type = filters.NumberFilter(field_name="service_type__id")
    has_payment = filters.BooleanFilter(
        field_name="report__payment",
        lookup_expr="isnull",
        exclude=True,
    )

    class Meta:
        model = Order
        fields = ["status", "assigned_technician", "created_after", "created_before", "service_type", "has_payment"]
