from urllib.parse import quote
from zoneinfo import ZoneInfo
from django.utils import timezone
from .models import Notification

_MYT = ZoneInfo("Asia/Kuala_Lumpur")


class WhatsAppDeepLinkProvider:
    """Builds a wa.me deep-link URL with a pre-filled message."""

    @staticmethod
    def build(phone: str, message: str) -> str:
        # Strip non-digit chars; normalise to digits only
        digits = "".join(c for c in phone if c.isdigit())
        if not digits:
            return ""
        # Convert Malaysian local format (leading 0) to international (60...)
        if digits.startswith("0"):
            digits = "60" + digits[1:]
        encoded = quote(message, safe="")
        return f"https://wa.me/{digits}?text={encoded}"


class NotificationService:
    provider = WhatsAppDeepLinkProvider()

    CUSTOMER_TEMPLATE = (
        "Hi {customer_name},\n"
        "Job {order_no} has been completed by Technician {technician_name} at {time}.\n"
        "Please check and leave feedback.\nThank you!"
    )

    MANAGER_TEMPLATE = (
        "Job {order_no} for {customer_name} has been marked as done by "
        "Technician {technician_name} at {time}. Please review."
    )

    TECHNICIAN_ASSIGNED_TEMPLATE = (
        "Hi {technician_name},\n"
        "You have been assigned to job {order_no} for {customer_name}.\n"
        "Address: {customer_address}\n"
        "Service: {service_type}\n"
        "Please proceed accordingly. Thank you!"
    )

    @classmethod
    def notify_job_done(cls, order) -> list:
        """
        Generate customer + manager WhatsApp deep-link notifications.
        Returns a list of Notification instances created.
        """
        time_str = timezone.now().astimezone(_MYT).strftime("%d %b %Y %H:%M")
        tech_name = (
            order.assigned_technician.get_full_name() or order.assigned_technician.username
            if order.assigned_technician
            else "Technician"
        )

        created = []

        # Customer notification
        customer_msg = cls.CUSTOMER_TEMPLATE.format(
            customer_name=order.customer_name,
            order_no=order.order_no,
            technician_name=tech_name,
            time=time_str,
        )
        customer_url = cls.provider.build(order.customer_phone, customer_msg)
        notif = Notification.objects.create(
            order=order,
            recipient_type=Notification.RecipientType.CUSTOMER,
            recipient_phone=order.customer_phone,
            message=customer_msg,
            deep_link_url=customer_url,
        )
        created.append(notif)

        # Manager notification (if technician has a branch manager)
        if order.assigned_technician and order.assigned_technician.branch:
            from accounts.models import User
            managers = User.objects.filter(
                role="manager", branch=order.assigned_technician.branch
            )
            for manager in managers:
                if manager.phone:
                    mgr_msg = cls.MANAGER_TEMPLATE.format(
                        order_no=order.order_no,
                        customer_name=order.customer_name,
                        technician_name=tech_name,
                        time=time_str,
                    )
                    mgr_url = cls.provider.build(manager.phone, mgr_msg)
                    notif = Notification.objects.create(
                        order=order,
                        recipient_type=Notification.RecipientType.MANAGER,
                        recipient_phone=manager.phone,
                        message=mgr_msg,
                        deep_link_url=mgr_url,
                    )
                    created.append(notif)

        return created

    @classmethod
    def notify_technician_assigned(cls, order) -> "Notification | None":
        """
        Generate a WhatsApp deep-link notification for the assigned technician.
        Returns the Notification instance, or None if the technician has no phone number.
        """
        technician = order.assigned_technician
        if not technician or not technician.phone:
            return None
        service_name = order.service_type.name if order.service_type else "Service"
        tech_name = technician.get_full_name() or technician.username
        msg = cls.TECHNICIAN_ASSIGNED_TEMPLATE.format(
            technician_name=tech_name,
            order_no=order.order_no,
            customer_name=order.customer_name,
            customer_address=order.customer_address,
            service_type=service_name,
        )
        url = cls.provider.build(technician.phone, msg)
        if not url:
            return None
        return Notification.objects.create(
            order=order,
            recipient_type=Notification.RecipientType.TECHNICIAN,
            recipient_phone=technician.phone,
            message=msg,
            deep_link_url=url,
        )
