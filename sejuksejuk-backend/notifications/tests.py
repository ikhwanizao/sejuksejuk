from django.test import TestCase

from accounts.models import Branch, User
from notifications.models import Notification
from notifications.services import NotificationService
from orders.models import Order, ServiceType


class NotifyJobDoneIdempotencyTests(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(name="Central", code="CEN")
        self.technician = User.objects.create_user(
            username="tech1",
            password="pass123",
            role=User.Role.TECHNICIAN,
            branch=self.branch,
            phone="0123456789",
        )
        self.manager = User.objects.create_user(
            username="mgr1",
            password="pass123",
            role=User.Role.MANAGER,
            branch=self.branch,
            phone="0111111111",
        )
        self.admin = User.objects.create_user(
            username="admin1",
            password="pass123",
            role=User.Role.ADMIN,
            phone="0199999999",
        )
        service_type = ServiceType.objects.create(name="Aircond Service")
        self.order = Order.objects.create(
            customer_name="Alice",
            customer_phone="0133333333",
            customer_address="Some address",
            problem_description="No cooling",
            service_type=service_type,
            assigned_technician=self.technician,
        )

    def test_notify_job_done_is_idempotent(self):
        first = NotificationService.notify_job_done(self.order)
        second = NotificationService.notify_job_done(self.order)

        # customer + manager + admin
        self.assertEqual(len(first), 3)
        self.assertEqual(len(second), 3)
        self.assertEqual(Notification.objects.filter(order=self.order).count(), 3)

    def test_notify_job_done_updates_existing_recipient_notifications(self):
        NotificationService.notify_job_done(self.order)

        manager_notif = Notification.objects.get(order=self.order, recipient_user=self.manager)
        manager_notif.message = "stale"
        manager_notif.save(update_fields=["message"])

        NotificationService.notify_job_done(self.order)

        manager_notif.refresh_from_db()
        self.assertNotEqual(manager_notif.message, "stale")
