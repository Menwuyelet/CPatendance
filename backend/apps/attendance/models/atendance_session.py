"""Module backend/apps/attendance/models/atendance_session.py

This file contains the implimentation of the representation of attendance sessions.
"""

from django.db import models
from django.utils import timezone


class AttendanceSession(models.Model):
    """A single attendance session initiated for a given shift.

    Tracks who started the session, start/end timestamps and processing
    flags used during attendance collection and post-processing.
    """

    PHASE_CHECK_IN = "CHECK_IN"
    PHASE_SLEEP = "SLEEP"
    PHASE_CHECK_OUT = "CHECK_OUT"
    PHASE_CLOSED = "CLOSED"

    PHASE_CHOICES = (
        (PHASE_CHECK_IN, "Check In"),
        (PHASE_SLEEP, "Sleep"),
        (PHASE_CHECK_OUT, "Check Out"),
        (PHASE_CLOSED, "Closed"),
    )

    shift = models.ForeignKey(
        "attendance.Shift", on_delete=models.CASCADE, related_name="attendance_sessions"
    )

    started_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True
    )

    started_at = models.DateTimeField(default=timezone.now)
    check_in_closed_at = models.DateTimeField(null=True, blank=True)
    check_out_started_at = models.DateTimeField(null=True, blank=True)
    check_out_closed_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_processed = models.BooleanField(default=False)
    phase = models.CharField(
        max_length=20,
        choices=PHASE_CHOICES,
        default=PHASE_CHECK_IN,
    )

    @property
    def date(self):
        """Return the date of the session (date of started_at)"""
        return self.started_at.date() if self.started_at else timezone.now().date()

    def close(self):
        """Mark the session as closed by setting timestamps and persisting.

        This sets `is_active` to False, records the closing time and saves
        the model instance.
        """
        now = timezone.now()
        self.is_active = False
        self.phase = self.PHASE_CLOSED
        self.check_out_closed_at = self.check_out_closed_at or now
        self.ended_at = now
        self.save(
            update_fields=[
                "is_active",
                "phase",
                "check_out_closed_at",
                "ended_at",
            ]
        )
