"""Module backend/apps/attendance/models/session_entry.py

This file contains the implimentation of the representation of temp attendance records
for one specific session.
"""

from django.db import models
from .atendance_session import AttendanceSession


class AttendanceSessionEntry(models.Model):
    """
    Records a single recognition event within an attendance session.

    Links a detected/recognized employee to the session and records the
    timestamp when recognition occurred.
    """

    session = models.ForeignKey(
        AttendanceSession, on_delete=models.CASCADE, related_name="entries"
    )

    employee = models.ForeignKey("employees.Employee", on_delete=models.CASCADE)

    recognized_at = models.DateTimeField()
    check_out_at = models.DateTimeField(null=True, blank=True)

    checkout_recognized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Model `Meta`: enforces uniqueness of (session, employee) entries."""

        unique_together = ("session", "employee")
