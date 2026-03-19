"""Module backend/apps/attendance/models/employee_leave.py

Defines long-term leave windows applied during attendance evaluation.
"""

import uuid
from django.db import models


class EmployeeLeave(models.Model):
    """Represents an approved leave window for an employee."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="leave_periods"
    )
    start_date = models.DateField()
    end_date = models.DateField()

    reason = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_leaves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["employee", "start_date", "end_date"])]

    def is_active_on(self, date):
        """Return True when `date` is within the leave window (inclusive)."""
        return self.start_date <= date <= self.end_date
