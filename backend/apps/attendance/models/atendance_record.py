"""Module backend/apps/attendance/models/atendance_record.py

This file contains the implimentation of the representation of attendance records.
"""

from django.db import models


class AttendanceRecord(models.Model):
    """Stores a single employee attendance entry for a date and shift.

    Includes check-in/check-out timestamps, status and who recorded the
    entry. Used by reporting and manual correction endpoints.
    """

    STATUS_CHOICES = (
        ("PRESENT", "Present"),
        ("LATE", "Late"),
        ("ABSENT", "Absent"),
        ("ON_LEAVE", "On Leave"),
    )

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    employee_shift = models.ForeignKey(
        "attendance.EmployeeShift",
        on_delete=models.PROTECT,
        related_name="attendance_records",
    )

    date = models.DateField()

    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)

    left_early = models.BooleanField(default=False)
    no_check_out = models.BooleanField(default=False)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ABSENT")

    taken_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="taken_attendance",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        """Model `Meta`: unique constraints and useful indexes for queries."""

        unique_together = ("employee_shift", "employee", "date")
        indexes = [
            models.Index(fields=["employee", "date"]),
            models.Index(fields=["date"]),
        ]
