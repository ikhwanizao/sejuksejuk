from django.core.management.base import BaseCommand
from accounts.models import User, Branch


SEED_USERS = [
    {"username": "admin", "first_name": "Admin", "last_name": "User", "role": "admin", "phone": "0111000000", "password": "admin1234"},
    {"username": "manager", "first_name": "Manager", "last_name": "User", "role": "manager", "phone": "0111000001", "password": "manager1234"},
    {"username": "ali", "first_name": "Ali", "last_name": "Ahmad", "role": "technician", "phone": "0111000002", "password": "tech1234"},
    {"username": "john", "first_name": "John", "last_name": "Tan", "role": "technician", "phone": "0111000003", "password": "tech1234"},
    {"username": "bala", "first_name": "Bala", "last_name": "Murugan", "role": "technician", "phone": "0111000004", "password": "tech1234"},
    {"username": "yusoff", "first_name": "Yusoff", "last_name": "Idris", "role": "technician", "phone": "0111000005", "password": "tech1234"},
]


class Command(BaseCommand):
    help = "Seed initial users and a default branch"

    def handle(self, *args, **options):
        branch, _ = Branch.objects.get_or_create(
            code="HQ", defaults={"name": "Headquarters", "address": "No. 1, Jalan Sejuk, Shah Alam"}
        )

        for data in SEED_USERS:
            password = data.pop("password")
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={**data, "branch": branch},
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"  Created: {user.username} ({user.role})"))
            else:
                self.stdout.write(f"  Already exists: {user.username}")

        self.stdout.write(self.style.SUCCESS("Seed complete."))
