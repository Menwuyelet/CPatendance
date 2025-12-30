from django.db import models
from django.utils import timezone

class AttendanceSession(models.Model):
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
    def close(self):
        self.is_active = False
        self.ended_at = timezone.now()
        self.save()
