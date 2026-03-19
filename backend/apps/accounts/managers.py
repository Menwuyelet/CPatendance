"""Module backend/apps/accounts/managers.py

This file contains the User manager.
"""

# accounts/managers.py
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """Custom user manager using email as the unique identifier."""

    def normalize_code(self, code):
        """Normalize the employee code by lowercasing it."""
        code = code.strip()
        for char in code:
            if char not in "0123456789-":
                code = code.replace(char, char.lower())
        return code

    def create_user(
        self, employee_code, full_name, phone_number, password=None, **extra_fields
    ):
        """
        Create and persist a `User` given an employee code, full_ name, phone_number and optional extras.
        Raises `ValueError` when `employee_code` is missing.
        """
        if not employee_code:
            raise ValueError("Employee code is required")

        employee_code = self.normalize_code(employee_code)

        user = self.model(
            employee_code=employee_code,
            full_name=full_name,
            phone_number=phone_number,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(
        self, employee_code, full_name, phone_number, password=None, **extra_fields
    ):
        """
        Create a superuser with required admin flags set.
        Ensures `is_staff` and `is_superuser` are True for superuser accounts.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(
            employee_code, full_name, phone_number, password, **extra_fields
        )
