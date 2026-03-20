"""Module backend/apps/employees/models/department.py

This file contains the implimentation for the department representation.
"""

from django.db import models
import uuid


class Department(models.Model):
    """
    Logical working unit.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)

    code = models.CharField(
        max_length=20, unique=True, help_text="Unique department code"
    )

    manager = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_departments",
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        """Model `Meta`: database indexes for lookups on department code."""

        indexes = [
            models.Index(fields=["code"]),
        ]

    def __str__(self):
        """Return the department's human-readable name."""
        return self.name

    def get_manager_name(self):
        """Return the employee code of the department manager, or None if not assigned."""
        return self.manager.employee_code if self.manager else None
