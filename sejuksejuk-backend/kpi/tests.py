from datetime import datetime, timezone

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Branch, User
from orders.models import Order
from services.models import ServiceReport
from .aggregations import team_summary, technician_stats


class ReportingFixtures:
    @classmethod
    def setUpTestData(cls):
        cls.branch = Branch.objects.create(name="Local", code="LOCAL")
        cls.other_branch = Branch.objects.create(name="Other", code="OTHER")
        cls.admin = User.objects.create_user(username="admin", role="admin", branch=cls.branch)
        cls.other_admin = User.objects.create_user(
            username="other-admin", role="admin", branch=cls.other_branch
        )
        cls.manager = User.objects.create_user(username="manager", role="manager", branch=cls.branch)
        cls.technician = User.objects.create_user(username="local-tech", role="technician")
        cls.other_technician = User.objects.create_user(username="other-tech", role="technician")
        cls.completed_at = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)
        cls.start = cls.end = "2026-10-01"
        cls.order = cls.make_order(cls.admin, cls.technician, "100.00")
        cls.other_order = cls.make_order(cls.other_admin, cls.other_technician, "900.00")

    @classmethod
    def make_order(cls, creator, technician, amount):
        order = Order.objects.create(
            customer_name="Customer", customer_phone="0123456789",
            customer_address="Address", problem_description="Repair",
            created_by=creator, assigned_technician=technician, status="job_done",
        )
        report = ServiceReport.objects.create(
            order=order, technician=technician, work_done="Repaired", final_amount=amount
        )
        ServiceReport.objects.filter(pk=report.pk).update(completed_at=cls.completed_at)
        return order


class CompletionDateKpiTests(ReportingFixtures, TestCase):
    def assert_completion_totals(self):
        summary = team_summary(start=self.start, end=self.end)
        self.assertEqual(summary["total_jobs"], 2)
        self.assertEqual(summary["total_amount"], 1000.0)
        stats, _, _ = technician_stats(start=self.start, end=self.end)
        self.assertEqual(sum(row["jobs_completed"] for row in stats), 2)
        self.assertEqual(sum(row["total_amount"] for row in stats), 1000.0)

    def test_review_close_and_edits_do_not_move_completion_totals(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        self.assert_completion_totals()
        for action in ("review", "close"):
            self.assertEqual(client.post(f"/api/orders/{self.order.pk}/{action}/").status_code, 200)
            self.assert_completion_totals()
        self.assertEqual(client.patch(
            f"/api/orders/{self.order.pk}/", {"admin_notes": "Follow-up"}, format="json"
        ).status_code, 200)
        self.assert_completion_totals()
        self.assertEqual(team_summary(start="2026-10-02", end="2026-10-02")["total_jobs"], 0)

    def test_manager_kpi_endpoints_are_branch_scoped(self):
        client = APIClient()
        client.force_authenticate(self.manager)
        params = {"start": self.start, "end": self.end}
        summary = client.get("/api/kpi/summary/", params)
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["total_amount"], 100.0)
        for endpoint, key in (("technicians", "technicians"), ("leaderboard", "leaderboard")):
            response = client.get(f"/api/kpi/{endpoint}/", params)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data[key]), 1)
            self.assertEqual(response.data[key][0]["technician_id"], self.technician.pk)
