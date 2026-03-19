"""Module backend/apps/accounts/models/user.py

This file contains the implimentation of the user entitie.
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from ..managers import UserManager
from ..constants import Roles


class User(AbstractBaseUser, PermissionsMixin):
    """Application user model storing authentication and role details.

    Extends Django's `AbstractBaseUser` and `PermissionsMixin` to provide
    customizable authentication, role membership and utility helpers used
    by the rest of the system.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    employee_code = models.CharField(null=False, blank=False, unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    roles = models.ManyToManyField("accounts.Role", related_name="users", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "employee_code"
    REQUIRED_FIELDS = ["full_name", "phone_number"]

    def __str__(self):
        """Return a readable identifier for the user (email)."""
        return self.employee_code

    def has_role(self, role_name: str) -> bool:
        """
        Checks if user has a specific role.
        """
        return self.roles.filter(name=role_name).exists()

    def is_admin(self):
        """Return True when the user has the administrator role."""
        return self.has_role(Roles.ADMIN)

    def is_department_manager(self):
        """Return True when the user has the department manager role."""
        return self.has_role(Roles.MANAGER)

    def is_employee(self):
        """Return True when the user has the employee role."""
        return self.has_role(Roles.EMPLOYEE)

    def check_password(self, raw_password):
        return super().check_password(raw_password)
