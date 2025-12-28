# attendance/models/session_entry.py
from django.db import models    
from .atendance_session import AttendanceSession    
class AttendanceSessionEntry(models.Model):
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
        unique_together = ("session", "employee")
