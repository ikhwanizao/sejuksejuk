"""
Registry of safe, read-only ORM tools exposed to the AI assistant.

Each function returns plain Python data (dicts/lists) -- no ORM objects.
The AI never sees raw SQL; all queries are scoped to completed/reviewed/closed
orders only unless status is specified explicitly.
"""
from datetime import date, timedelta
from typing import Literal, Optional

from django.db.models import Count, Sum
from langchain_core.tools import tool


# -- Date helpers --------------------------------------------------------------

def _period_range(period: str):
    today = date.today()
    if period == "today":
        return today, today
    if period == "week":
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    if period == "month":
        return today.replace(day=1), today
    return today, today


# -- Tools --------------------------------------------------------------------

@tool
def list_jobs_by_technician(
    technician_name: str = "",
    period: Literal["today", "week", "month"] = "week",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """List jobs completed by a specific technician within a date range.

    Args:
        technician_name: Username or first name of the technician.
        period: Relative period (today/week/month). Ignored if start_date and end_date are provided.
        start_date: Start date in ISO format YYYY-MM-DD.
        end_date: End date in ISO format YYYY-MM-DD.
    """
    from orders.models import Order
    from accounts.models import User

    if start_date and end_date:
        start, end = date.fromisoformat(start_date), date.fromisoformat(end_date)
    else:
        start, end = _period_range(period)

    techs = User.objects.filter(role="technician")
    if technician_name:
        techs = techs.filter(
            username__icontains=technician_name
        ) | techs.filter(first_name__icontains=technician_name)
    if not techs.exists():
        return {"error": f"No technician matching '{technician_name}' found."}

    tech = techs.first()
    orders = Order.objects.filter(
        assigned_technician=tech,
        status__in=["job_done", "reviewed", "closed"],
        updated_at__date__gte=start,
        updated_at__date__lte=end,
    ).select_related("service_type")

    jobs = [
        {
            "order_no": o.order_no,
            "customer": o.customer_name,
            "service": o.service_type.name if o.service_type else "--",
            "status": o.status,
            "final_amount": float(getattr(getattr(o, "report", None), "final_amount", 0) or 0),
            "completed_at": str(o.updated_at.date()),
        }
        for o in orders
    ]
    return {
        "technician": tech.get_full_name() or tech.username,
        "period": f"{start} to {end}",
        "count": len(jobs),
        "jobs": jobs,
    }


@tool
def count_jobs(
    period: Literal["today", "week", "month"],
    status: Optional[Literal["new", "assigned", "in_progress", "job_done", "reviewed", "closed"]] = None,
) -> dict:
    """Count total jobs within a period, optionally filtered by status.

    Args:
        period: Relative period -- today, week, or month.
        status: Optional order status to filter by.
    """
    from orders.models import Order

    start, end = _period_range(period)
    qs = Order.objects.filter(updated_at__date__gte=start, updated_at__date__lte=end)
    if status:
        qs = qs.filter(status=status)
    return {"period": f"{start} to {end}", "status_filter": status or "all", "count": qs.count()}


@tool
def top_technicians(
    period: Literal["today", "week", "month"],
    by: Literal["jobs", "amount"] = "jobs",
    limit: int = 5,
) -> dict:
    """Rank technicians by jobs completed or total revenue.

    Args:
        period: Relative period -- today, week, or month.
        by: Rank by number of jobs completed or by total revenue amount.
        limit: Maximum number of technicians to return.
    """
    from orders.models import Order

    start, end = _period_range(period)
    rows = (
        Order.objects.filter(
            status__in=["job_done", "reviewed", "closed"],
            updated_at__date__gte=start,
            updated_at__date__lte=end,
            assigned_technician__isnull=False,
        )
        .values(
            "assigned_technician__username",
            "assigned_technician__first_name",
            "assigned_technician__last_name",
        )
        .annotate(jobs_completed=Count("id"), total_amount=Sum("report__final_amount"))
        .order_by(f"-{'jobs_completed' if by == 'jobs' else 'total_amount'}")[:limit]
    )
    result = []
    for r in rows:
        full = f"{r['assigned_technician__first_name']} {r['assigned_technician__last_name']}".strip()
        result.append(
            {
                "technician": full or r["assigned_technician__username"],
                "jobs_completed": r["jobs_completed"],
                "total_amount": float(r["total_amount"] or 0),
            }
        )
    return {"period": f"{start} to {end}", "ranked_by": by, "top": result}


@tool
def get_order_summary(order_no: str) -> dict:
    """Retrieve details of a specific order by order number (e.g. ORD123456).

    Args:
        order_no: The order number, e.g. ORD123456.
    """
    from orders.models import Order

    try:
        o = Order.objects.select_related(
            "service_type", "assigned_technician", "created_by"
        ).get(order_no=order_no.strip().upper())
    except Order.DoesNotExist:
        return {"error": f"Order '{order_no}' not found."}

    report = getattr(o, "report", None)
    return {
        "order_no": o.order_no,
        "customer": o.customer_name,
        "phone": o.customer_phone,
        "address": o.customer_address,
        "service": o.service_type.name if o.service_type else "--",
        "status": o.status,
        "quoted_price": float(o.quoted_price),
        "technician": o.assigned_technician.get_full_name() if o.assigned_technician else None,
        "created_at": str(o.created_at.date()),
        "report": {
            "work_done": report.work_done,
            "extra_charges": float(report.extra_charges),
            "final_amount": float(report.final_amount),
            "completed_at": str(report.completed_at.date()),
        }
        if report
        else None,
    }


@tool
def technician_workload(period: Literal["today", "week", "month"]) -> dict:
    """Show each technician's job count and total amount for the given period.

    Args:
        period: Relative period -- today, week, or month.
    """
    from kpi.aggregations import technician_stats

    stats, start, end = technician_stats(period)
    return {"period": f"{start} to {end}", "technicians": stats}


# -- Tool registry ------------------------------------------------------------

TOOLS = [
    list_jobs_by_technician,
    count_jobs,
    top_technicians,
    get_order_summary,
    technician_workload,
]
