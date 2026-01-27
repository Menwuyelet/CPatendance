"""Module backend/apps/attendance/models/atendance_session.py

Auto-generated module docstring.
"""

from django.db import models
from django.utils import timezone

class AttendanceSession(models.Model):
    """A single attendance session initiated for a given shift.

    Tracks who started the session, start/end timestamps and processing
    flags used during attendance collection and post-processing.
    """
    shift = models.ForeignKey(
        "attendance.Shift",
        on_delete=models.CASCADE,
        related_name="attendance_sessions"
    )

    started_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True
    )

    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_processed = models.BooleanField(default=False)
    
    @property
    def date(self):
        """Return the date of the session (date of started_at)"""
        return self.started_at.date() if self.started_at else timezone.now().date()
    
    def close(self):
        """Mark the session as closed by setting timestamps and persisting.

        This sets `is_active` to False, records the closing time and saves
        the model instance.
        """
        self.is_active = False
        self.ended_at = timezone.now()
        self.save()
