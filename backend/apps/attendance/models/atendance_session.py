"""Module backend/apps/attendance/models/atendance_session.py

This file contains the implimentation of the representation of attendance sessions.
"""

from django.db import models
from django.utils import timezone


class SessionPhase(models.TextChoices):
    """Phases for a single attendance session lifecycle."""

    CHECK_IN = "CHECK_IN", "Check-in"
    CHECK_OUT = "CHECK_OUT", "Check-out"
    CLOSED = "CLOSED", "Closed"


class AttendanceSession(models.Model):
    """
    A single attendance session initiated for a given shift.

    Tracks who started the session, start/end timestamps and processing
    flags used during attendance collection and post-processing.
    """

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
    is_sleep = models.BooleanField(default=False)
    is_processed = models.BooleanField(default=False)

    phase = models.CharField(
        max_length=20, choices=SessionPhase.choices, default=SessionPhase.CHECK_IN
    )

    check_in_processed_at = models.DateTimeField(null=True, blank=True)
    check_out_processed_at = models.DateTimeField(null=True, blank=True)

    @property
    def date(self):
        """Return the date of the session (date of started_at)"""
        return self.started_at.date() if self.started_at else timezone.now().date()

    def make_sleep(self):
        """Mark the session as a 'sleep' session for late attendance collection."""
        self.is_sleep = True
        self.is_active = False
        self.phase = SessionPhase.CHECK_OUT
        self.check_in_processed_at = timezone.now()
        self.save(
            update_fields=[
                "is_sleep",
                "is_active",
                "phase",
                "check_in_processed_at",
            ]
        )

    def activate_checkout(self):
        """Wake the session for the checkout window."""
        self.is_sleep = False
        self.is_active = True
        self.phase = SessionPhase.CHECK_OUT
        self.save(update_fields=["is_sleep", "is_active", "phase"])

    def close(self):
        """
        Mark the session as closed by setting timestamps and persisting.

        This sets `is_active` to False, records the closing time and saves
        the model instance.
        """
        now = timezone.now()
        self.is_active = False
        self.is_sleep = False
        self.phase = SessionPhase.CLOSED
        self.ended_at = timezone.now()
        self.check_out_processed_at = self.check_out_processed_at or timezone.now()
        self.save(
            update_fields=[
                "is_active",
                "is_sleep",
                "phase",
                "ended_at",
                "check_out_processed_at",
            ]
        )
