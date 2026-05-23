from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter, inline_serializer
from rest_framework import serializers as s

from accounts.permissions import IsManagerOrAdmin
from .aggregations import technician_stats, team_summary

_PERIOD_PARAM = OpenApiParameter("period", str, description="week | month | today")
_START_PARAM = OpenApiParameter("start", str, description="ISO date YYYY-MM-DD")
_END_PARAM = OpenApiParameter("end", str, description="ISO date YYYY-MM-DD")

_KPI_ROW = inline_serializer("KPIRow", fields={
    "technician_id": s.IntegerField(), "technician_name": s.CharField(),
    "jobs_completed": s.IntegerField(), "total_amount": s.FloatField(),
    "reschedule_count": s.IntegerField(),
})
_LEADERBOARD_ROW = inline_serializer("LeaderboardRow", fields={
    "rank": s.IntegerField(), "technician_id": s.IntegerField(),
    "technician_name": s.CharField(), "jobs_completed": s.IntegerField(),
    "total_amount": s.FloatField(), "reschedule_count": s.IntegerField(),
})


class TechnicianKPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(parameters=[_PERIOD_PARAM, _START_PARAM, _END_PARAM], responses={200: _KPI_ROW})
    def get(self, request):
        period = request.query_params.get("period", "week")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        stats, start_str, end_str = technician_stats(period, start, end)
        return Response({"period": period, "start": start_str, "end": end_str, "technicians": stats})


class SummaryKPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(parameters=[_PERIOD_PARAM, _START_PARAM, _END_PARAM], responses={200: inline_serializer("KPISummary", fields={
        "period": s.CharField(), "start": s.CharField(), "end": s.CharField(),
        "total_jobs": s.IntegerField(), "total_amount": s.FloatField(),
    })})
    def get(self, request):
        period = request.query_params.get("period", "week")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        return Response(team_summary(period, start, end))


class LeaderboardKPIView(APIView):
    permission_classes = [IsManagerOrAdmin]

    @extend_schema(parameters=[
        _PERIOD_PARAM,
        OpenApiParameter("metric", str, description="jobs | amount"),
        _START_PARAM, _END_PARAM,
    ], responses={200: _LEADERBOARD_ROW})
    def get(self, request):
        period = request.query_params.get("period", "week")
        metric = request.query_params.get("metric", "jobs")
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        stats, start_str, end_str = technician_stats(period, start, end)
        sort_key = "jobs_completed" if metric == "jobs" else "total_amount"
        ranked = sorted(stats, key=lambda r: r[sort_key], reverse=True)
        for i, row in enumerate(ranked, start=1):
            row["rank"] = i
        return Response({"period": period, "metric": metric, "start": start_str, "end": end_str, "leaderboard": ranked})
