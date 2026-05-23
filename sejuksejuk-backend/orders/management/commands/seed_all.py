"""
Seed realistic demo data for the Sejuk Sejuk system.

Creates:
  - 1 HQ branch (if missing)
  - 6 users: 1 admin, 1 manager, 4 technicians (if missing)
  - 10 service types (if missing)
  - 60 orders spread over the last 35 days:
      ~45 completed  (job_done / reviewed / closed) with ServiceReport + Payment
      ~8  in_progress / assigned
      ~7  new
  - OrderEvents for status transitions and ~12 reschedules
  - Notifications (generated) for completed orders

Run:
    python manage.py seed_all           # safe to re-run (skips existing)
    python manage.py seed_all --flush   # wipe orders/reports/payments first
"""

import random
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Branch, User
from orders.models import Order, OrderEvent, ServiceType
from services.models import ServiceReport, Payment
from notifications.models import Notification


# ---------------------------------------------------------------------------
# Static seed data
# ---------------------------------------------------------------------------

SEED_USERS = [
    {"username": "admin",   "first_name": "Admin",   "last_name": "User",    "role": "admin",      "phone": "0111000000", "password": "admin1234"},
    {"username": "manager", "first_name": "Manager", "last_name": "User",    "role": "manager",    "phone": "0111000001", "password": "manager1234"},
    {"username": "ali",     "first_name": "Ali",     "last_name": "Ahmad",   "role": "technician", "phone": "0111000002", "password": "tech1234"},
    {"username": "john",    "first_name": "John",    "last_name": "Tan",     "role": "technician", "phone": "0111000003", "password": "tech1234"},
    {"username": "bala",    "first_name": "Bala",    "last_name": "Murugan", "role": "technician", "phone": "0111000004", "password": "tech1234"},
    {"username": "yusoff",  "first_name": "Yusoff",  "last_name": "Idris",   "role": "technician", "phone": "0111000005", "password": "tech1234"},
]

SERVICE_TYPES = [
    ("Air-Cond Service & Clean",  "120.00"),
    ("Air-Cond Repair",           "200.00"),
    ("Gas Refill (R32)",          "180.00"),
    ("Gas Refill (R22)",          "150.00"),
    ("Compressor Replacement",    "800.00"),
    ("Fan Coil Cleaning",          "80.00"),
    ("Installation (1.0HP)",      "350.00"),
    ("Installation (1.5HP)",      "380.00"),
    ("Installation (2.0HP)",      "420.00"),
    ("Inspection & Diagnostic",    "60.00"),
]

CUSTOMERS = [
    ("Tan Wei Ming",    "0123456701", "No. 12, Jalan Mawar, Petaling Jaya"),
    ("Siti Aminah",     "0123456702", "Lot 5, Jalan Melati, Shah Alam"),
    ("Rajan Kumar",     "0123456703", "Unit 3A, Jalan Kenanga, Subang Jaya"),
    ("Faridah Othman",  "0123456704", "No. 88, Jalan Semarak, Klang"),
    ("Lim Chee Keong",  "0123456705", "Block C, Jalan Cempaka, Puchong"),
    ("Norhaida Yusof",  "0123456706", "No. 7, Jalan Anggerik, Ampang"),
    ("David Wong",      "0123456707", "No. 22, Jalan Raya, Cheras"),
    ("Zulkifli Hassan", "0123456708", "Lot 14, Jalan Teratai, Rawang"),
    ("May Ling Ong",    "0123456709", "Unit 6B, Jalan Dahlia, Sepang"),
    ("Hafiz Razali",    "0123456710", "No. 3, Jalan Wangi, Cyberjaya"),
    ("Priya Nair",      "0123456711", "No. 45, Jalan Seroja, Kepong"),
    ("Ahmad Fadzil",    "0123456712", "Lot 99, Jalan Pelangi, Bangi"),
    ("Christine Lau",   "0123456713", "No. 18, Jalan Lembah, Setia Alam"),
    ("Mohd Haziq",      "0123456714", "Unit 2C, Jalan Nilam, Nilai"),
    ("Susan Teoh",      "0123456715", "No. 60, Jalan Orkid, Kajang"),
]

PROBLEMS = [
    "Air-cond not cooling properly, need service",
    "Unit making loud noise, vibrating",
    "Gas leaking, no cold air",
    "Water dripping from indoor unit",
    "Air-cond not turning on at all",
    "Need full cleaning service",
    "Compressor trips the circuit breaker",
    "Remote control not working, unit unresponsive",
    "Smell coming from unit during operation",
    "New unit installation required",
    "Old unit replacement and installation",
    "Routine annual maintenance",
    "Unit freezing up and shutting off",
    "Mould build-up inside unit",
    "Low cooling efficiency despite running",
]

WORK_DONE_TEMPLATES = [
    "Cleaned filters, coils and drainage tray. Topped up gas. Unit now cooling efficiently.",
    "Replaced capacitor, cleaned coils. Tested unit — operating normally.",
    "Found refrigerant leak at evaporator coil joint. Re-soldered, pressure-tested, topped up R32 gas.",
    "Cleared blocked drainage pipe. Cleaned drain pan. Applied anti-mould treatment.",
    "Replaced PCB main board. Reset unit and tested all functions.",
    "Full deep-clean service: disassembled, washed all parts, chemical flush, reassembled.",
    "Replaced faulty contactor and thermal overload relay. Compressor running normally.",
    "Replaced remote receiver module and paired new remote control.",
    "Cleaned evaporator coil thoroughly. Applied anti-bacterial spray. Odour resolved.",
    "Supplied and installed new 1.5HP split unit. Pressure-tested and commissioned.",
]

PAYMENT_METHODS = ["cash", "transfer", "ewallet", "card"]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _dt(d: date, hour: int = 10, minute: int = 0) -> datetime:
    """Return an aware datetime at the given time on date d."""
    return datetime(d.year, d.month, d.day, hour, minute, tzinfo=timezone.utc)


def _add_event(order, event_type, from_status, to_status, actor, at):
    OrderEvent.objects.create(
        order=order,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        actor=actor,
        note="",
    )
    # Back-date the event
    OrderEvent.objects.filter(order=order, event_type=event_type,
                               from_status=from_status, to_status=to_status).update(at=at)


# ---------------------------------------------------------------------------
# Main command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed realistic demo data (orders, reports, payments, events)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing orders (and related records) before seeding",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing orders, reports, payments, events, notifications…"))
            Notification.objects.all().delete()
            OrderEvent.objects.all().delete()
            Payment.objects.all().delete()
            ServiceReport.objects.all().delete()
            Order.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Flushed."))

        # ── 1. Branch ──────────────────────────────────────────────────────
        branch, _ = Branch.objects.get_or_create(
            code="HQ",
            defaults={"name": "Headquarters", "address": "No. 1, Jalan Sejuk, Shah Alam"},
        )
        self.stdout.write(f"Branch: {branch}")

        # ── 2. Users ───────────────────────────────────────────────────────
        for data in SEED_USERS:
            password = data.pop("password")
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={**data, "branch": branch},
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Created user: {user.username}")
            else:
                self.stdout.write(f"  Exists user:  {user.username}")
            data["password"] = password  # restore for idempotency

        admin_user   = User.objects.get(username="admin")
        technicians  = list(User.objects.filter(role="technician"))

        # ── 3. Service types ───────────────────────────────────────────────
        svc_objs = []
        for name, price in SERVICE_TYPES:
            obj, created = ServiceType.objects.get_or_create(
                name=name, defaults={"default_price": Decimal(price)}
            )
            svc_objs.append(obj)
            if created:
                self.stdout.write(f"  Created service type: {name}")

        # ── 4. Orders ──────────────────────────────────────────────────────
        today       = date.today()
        rng         = random.Random(42)   # deterministic seed

        # Define date buckets so KPI periods are well populated
        # last 35 days → buckets: [0-6 days ago], [7-13], [14-20], [21-34]
        def days_ago(n): return today - timedelta(days=n)

        order_specs = []

        # --- Completed orders (job_done / reviewed / closed) ---
        completed_statuses = ["job_done", "reviewed", "closed"]

        for i in range(45):
            age = rng.randint(0, 34)          # days ago
            status = rng.choice(completed_statuses)
            tech = rng.choice(technicians)
            cust = rng.choice(CUSTOMERS)
            svc  = rng.choice(svc_objs)
            base_price = float(svc.default_price)
            extra = rng.choice([0, 0, 0, 20, 30, 50, 80])
            final = base_price + extra
            order_specs.append({
                "age": age,
                "status": status,
                "tech": tech,
                "cust": cust,
                "svc": svc,
                "quoted": base_price,
                "extra": extra,
                "final": final,
                "complete": True,
                "reschedule": rng.random() < 0.20,  # 20% chance of reschedule event
            })

        # --- In-progress / assigned ---
        for i in range(8):
            age = rng.randint(0, 5)
            status = rng.choice(["in_progress", "assigned"])
            tech = rng.choice(technicians)
            cust = rng.choice(CUSTOMERS)
            svc  = rng.choice(svc_objs)
            order_specs.append({
                "age": age,
                "status": status,
                "tech": tech,
                "cust": cust,
                "svc": svc,
                "quoted": float(svc.default_price),
                "extra": 0,
                "final": float(svc.default_price),
                "complete": False,
                "reschedule": False,
            })

        # --- New (unassigned) ---
        for i in range(7):
            age = rng.randint(0, 3)
            cust = rng.choice(CUSTOMERS)
            svc  = rng.choice(svc_objs)
            order_specs.append({
                "age": age,
                "status": "new",
                "tech": None,
                "cust": cust,
                "svc": svc,
                "quoted": float(svc.default_price),
                "extra": 0,
                "final": float(svc.default_price),
                "complete": False,
                "reschedule": False,
            })

        created_count = 0
        for spec in order_specs:
            order_date = days_ago(spec["age"])
            cust_name, cust_phone, cust_addr = spec["cust"]

            order = Order.objects.create(
                customer_name=cust_name,
                customer_phone=cust_phone,
                customer_address=cust_addr,
                problem_description=rng.choice(PROBLEMS),
                service_type=spec["svc"],
                quoted_price=Decimal(str(spec["quoted"])),
                assigned_technician=spec["tech"],
                status=spec["status"],
                created_by=admin_user,
            )

            # Back-date created_at and updated_at
            Order.objects.filter(pk=order.pk).update(
                created_at=_dt(order_date, rng.randint(8, 11)),
                updated_at=_dt(order_date, rng.randint(14, 17)),
            )

            # OrderEvents for status trail
            _add_event(order, OrderEvent.EventType.STATUS_CHANGE,
                       "new", "assigned", admin_user,
                       _dt(order_date, rng.randint(8, 10)))

            if spec["status"] not in ("new", "assigned"):
                _add_event(order, OrderEvent.EventType.STATUS_CHANGE,
                           "assigned", "in_progress", spec["tech"] or admin_user,
                           _dt(order_date, rng.randint(10, 12)))

            # Reschedule event
            if spec["reschedule"]:
                _add_event(order, OrderEvent.EventType.RESCHEDULE,
                           spec["status"], spec["status"], spec["tech"] or admin_user,
                           _dt(order_date, rng.randint(9, 13)))

            # ServiceReport + Payment for completed orders
            if spec["complete"]:
                _add_event(order, OrderEvent.EventType.STATUS_CHANGE,
                           "in_progress", "job_done", spec["tech"],
                           _dt(order_date, rng.randint(13, 16)))

                report = ServiceReport.objects.create(
                    order=order,
                    work_done=rng.choice(WORK_DONE_TEMPLATES),
                    extra_charges=Decimal(str(spec["extra"])),
                    final_amount=Decimal(str(spec["final"])),
                    technician=spec["tech"],
                )
                # Back-date completed_at
                ServiceReport.objects.filter(pk=report.pk).update(
                    completed_at=_dt(order_date, rng.randint(14, 17))
                )

                Payment.objects.create(
                    report=report,
                    amount=Decimal(str(spec["final"])),
                    method=rng.choice(PAYMENT_METHODS),
                )

                # Notification for completed order
                Notification.objects.create(
                    order=order,
                    channel="whatsapp",
                    recipient_type="customer",
                    recipient_phone=cust_phone,
                    message=f"Dear {cust_name}, your service is complete. Amount: RM {spec['final']:.2f}. Thank you!",
                    deep_link_url=f"https://wa.me/60{cust_phone.lstrip('0')}",
                    notification_status="sent",
                )

            created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created {created_count} orders "
            f"({sum(1 for s in order_specs if s['complete'])} completed, "
            f"{sum(1 for s in order_specs if not s['complete'] and s['status'] != 'new')} in-progress/assigned, "
            f"{sum(1 for s in order_specs if s['status'] == 'new')} new)"
        ))
        self.stdout.write(self.style.SUCCESS(
            "Login credentials:\n"
            "  admin / admin1234\n"
            "  manager / manager1234\n"
            "  ali / tech1234   (and john, bala, yusoff)"
        ))
