from django.contrib.auth.models import AbstractUser
from django.db import models


class Branch(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "branches"

    def __str__(self):
        return f"{self.code} – {self.name}"


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        TECHNICIAN = "technician", "Technician"
        MANAGER = "manager", "Manager"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TECHNICIAN)
    phone = models.CharField(max_length=20, blank=True)
    branch = models.ForeignKey(
        Branch, null=True, blank=True, on_delete=models.SET_NULL, related_name="users"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_technician(self):
        return self.role == self.Role.TECHNICIAN

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER
