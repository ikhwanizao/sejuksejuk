from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from .models import Order, OrderEvent


class AssignOrderTests(TestCase):
	def setUp(self):
		self.admin = User.objects.create_user(
			username="admin", password="pass", role="admin"
		)
		self.technician_a = User.objects.create_user(
			username="tech-a", password="pass", role="technician"
		)
		self.technician_b = User.objects.create_user(
			username="tech-b", password="pass", role="technician"
		)
		self.client = APIClient()
		self.client.force_authenticate(self.admin)

	def test_reassign_assigned_order_keeps_status(self):
		order = Order.objects.create(
			customer_name="Priya Nair",
			customer_phone="0123456711",
			customer_address="No. 45, Jalan Seroja, Kepong",
			problem_description="Mould build-up inside unit",
			assigned_technician=self.technician_a,
			status=Order.Status.ASSIGNED,
			created_by=self.admin,
		)

		response = self.client.post(
			f"/api/orders/{order.id}/assign/",
			{"technician_id": self.technician_b.id},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		order.refresh_from_db()
		self.assertEqual(order.assigned_technician, self.technician_b)
		self.assertEqual(order.status, Order.Status.ASSIGNED)
		event = order.events.latest("id")
		self.assertEqual(event.event_type, OrderEvent.EventType.NOTE)
		self.assertEqual(event.from_status, Order.Status.ASSIGNED)
		self.assertEqual(event.to_status, Order.Status.ASSIGNED)
