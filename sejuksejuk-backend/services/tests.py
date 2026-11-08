from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Branch, User
from orders.models import Order, OrderEvent
from .models import Payment, ServiceAttachment, ServiceReport


@override_settings(STORAGES={
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
})
class OrderResourceAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.branch = Branch.objects.create(name="Local", code="LOCAL")
        cls.other_branch = Branch.objects.create(name="Other", code="OTHER")
        cls.admin = User.objects.create_user(
            username="admin", role="admin", branch=cls.branch
        )
        cls.other_admin = User.objects.create_user(
            username="other-admin", role="admin", branch=cls.other_branch
        )
        cls.manager = User.objects.create_user(
            username="manager", role="manager", branch=cls.branch
        )
        cls.technician = User.objects.create_user(username="tech", role="technician")
        cls.other_technician = User.objects.create_user(
            username="other-tech", role="technician"
        )
        cls.order = Order.objects.create(
            customer_name="Customer", customer_phone="0123456789",
            customer_address="Address", problem_description="Repair",
            created_by=cls.admin, assigned_technician=cls.technician,
            status="job_done",
        )
        cls.report = ServiceReport.objects.create(
            order=cls.order, technician=cls.technician,
            work_done="Repaired", final_amount="100.00",
        )
        cls.attachment = ServiceAttachment.objects.create(
            report=cls.report, file="orders/test/photo.jpg", kind="photo"
        )
        cls.payment = Payment.objects.create(
            report=cls.report, amount="100.00", method="cash"
        )
        cls.event = OrderEvent.objects.create(
            order=cls.order, event_type="status_change",
            from_status="in_progress", to_status="job_done", actor=cls.technician,
        )
        cls.other_order = Order.objects.create(
            customer_name="Other customer", customer_phone="0123456780",
            customer_address="Other address", problem_description="Repair",
            created_by=cls.other_admin, assigned_technician=cls.other_technician,
        )
        cls.other_report = ServiceReport.objects.create(
            order=cls.other_order, technician=cls.other_technician, work_done="Repaired"
        )

    def setUp(self):
        self.client = APIClient()

    def assert_read_access(self, user, order, report, expected_status):
        self.client.force_authenticate(user)
        for url in (
            f"/api/orders/{order.pk}/",
            f"/api/orders/{order.pk}/report/",
            f"/api/reports/{report.pk}/attachments/",
        ):
            with self.subTest(user=user.username, url=url):
                self.assertEqual(self.client.get(url).status_code, expected_status)

    def test_assigned_technician_can_read_own_resources(self):
        self.assert_read_access(self.technician, self.order, self.report, 200)

    def test_technician_cannot_read_another_technicians_resources(self):
        self.assert_read_access(self.other_technician, self.order, self.report, 404)

    def test_manager_can_read_own_branch_resources(self):
        self.assert_read_access(self.manager, self.order, self.report, 200)

    def test_manager_cannot_read_other_branch_resources(self):
        self.assert_read_access(self.manager, self.other_order, self.other_report, 404)

    def test_admin_can_read_resources_across_branches(self):
        self.assert_read_access(self.admin, self.other_order, self.other_report, 200)

    def test_anonymous_reads_require_authentication(self):
        for url in (
            f"/api/orders/{self.order.pk}/report/",
            f"/api/reports/{self.report.pk}/attachments/",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 401)

    def test_order_deletion_is_disabled_for_all_roles_and_preserves_records(self):
        for user in (self.technician, self.manager, self.admin):
            self.client.force_authenticate(user)
            with self.subTest(role=user.role):
                response = self.client.delete(f"/api/orders/{self.order.pk}/")
                self.assertEqual(response.status_code, 405)
                for model, instance in (
                    (Order, self.order), (ServiceReport, self.report),
                    (ServiceAttachment, self.attachment), (Payment, self.payment),
                    (OrderEvent, self.event),
                ):
                    self.assertTrue(model.objects.filter(pk=instance.pk).exists())
