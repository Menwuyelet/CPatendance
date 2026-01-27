"""Module backend/apps/attendance/models/session_entry.py

Auto-generated module docstring.
"""

from django.db import models    
from .atendance_session import AttendanceSession    
class AttendanceSessionEntry(models.Model):
    """Records a single recognition event within an attendance session.

    Links a detected/recognized employee to the session and records the
    timestamp when recognition occurred.
    """
    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name="entries"
    )

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE
    )

    recognized_at = models.DateTimeField()

    class Meta:
        """Model `Meta`: enforces uniqueness of (session, employee) entries."""
        unique_together = ("session", "employee")
