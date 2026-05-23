from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Branch

admin.site.register(Branch)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "role", "phone", "branch", "is_active"]
    list_filter = ["role", "branch"]
    fieldsets = UserAdmin.fieldsets + (
        ("Role & Contact", {"fields": ("role", "phone", "branch")}),
    )
