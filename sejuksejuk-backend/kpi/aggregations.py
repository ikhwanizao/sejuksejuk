from datetime import date, timedelta
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDate
from orders.models import Order, OrderEvent


def _date_range(period: str, start=None, end=None):
    today = date.today()
    if start and end:
        return start, end
    if period == "week":
        # ISO week: Monday → Sunday
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    elif period == "month":
        start = today.replace(day=1)
        end = today
    else:
        start = today - timedelta(days=6)
        end = today
    return start, end


def technician_stats(period="week", start=None, end=None):
    start, end = _date_range(period, start, end)

    jobs = (
        Order.objects.filter(
            status__in=["job_done", "reviewed", "closed"],
            updated_at__date__gte=start,
            updated_at__date__lte=end,
            assigned_technician__isnull=False,
        )
        .values("assigned_technician__id", "assigned_technician__username",
                "assigned_technician__first_name", "assigned_technician__last_name")
        .annotate(
            jobs_completed=Count("id"),
            total_amount=Sum("report__final_amount"),
        )
        .order_by("-jobs_completed")
    )

    reschedules = (
        OrderEvent.objects.filter(
            event_type=OrderEvent.EventType.RESCHEDULE,
            at__date__gte=start,
            at__date__lte=end,
            order__assigned_technician__isnull=False,
        )
        .values("order__assigned_technician__id")
        .annotate(reschedule_count=Count("id"))
    )
    reschedule_map = {r["order__assigned_technician__id"]: r["reschedule_count"] for r in reschedules}

    result = []
    for row in jobs:
        tech_id = row["assigned_technician__id"]
        full_name = f"{row['assigned_technician__first_name']} {row['assigned_technician__last_name']}".strip()
        result.append({
            "technician_id": tech_id,
            "technician_name": full_name or row["assigned_technician__username"],
            "jobs_completed": row["jobs_completed"],
            "total_amount": float(row["total_amount"] or 0),
            "reschedule_count": reschedule_map.get(tech_id, 0),
        })
    return result, str(start), str(end)


def team_summary(period="week", start=None, end=None):
    start, end = _date_range(period, start, end)
    agg = Order.objects.filter(
        status__in=["job_done", "reviewed", "closed"],
        updated_at__date__gte=start,
        updated_at__date__lte=end,
    ).aggregate(
        total_jobs=Count("id"),
        total_amount=Sum("report__final_amount"),
    )
    return {
        "period": period,
        "start": str(start),
        "end": str(end),
        "total_jobs": agg["total_jobs"] or 0,
        "total_amount": float(agg["total_amount"] or 0),
    }
