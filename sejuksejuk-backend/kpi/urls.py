from django.urls import path
from .views import TechnicianKPIView, SummaryKPIView, LeaderboardKPIView

urlpatterns = [
    path("technicians/", TechnicianKPIView.as_view(), name="kpi-technicians"),
    path("summary/", SummaryKPIView.as_view(), name="kpi-summary"),
    path("leaderboard/", LeaderboardKPIView.as_view(), name="kpi-leaderboard"),
]
