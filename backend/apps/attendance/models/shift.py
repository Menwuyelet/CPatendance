"""Module backend/apps/attendance/models/shift.py

This file contains the implimentation of the representation of shift.
"""
from django.db import models

class Shift(models.Model):
    """
    Represents a work shift with schedule and day flags.

    Stores start/end times and which weekdays the shift applies to. Used by
    scheduling and attendance session logic.
    """
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()

    description = models.TextField(blank=True)

    department = models.ForeignKey(
        "employees.Department",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Department this shift belongs to (needed for Manager session visibility)"
    )

    # days this shift applies to
    monday = models.BooleanField(default=False)
    tuesday = models.BooleanField(default=False)
    wednesday = models.BooleanField(default=False)
    thursday = models.BooleanField(default=False)
    friday = models.BooleanField(default=False)
    saturday = models.BooleanField(default=False)
    sunday = models.BooleanField(default=False)

    class Meta:
        """Model metadata for `Shift`.

        Declares unique constraints to avoid duplicate named shifts with the
        same time range.
        """
        unique_together = ("name", "start_time", "end_time")

    def applies_today(self, date):
        """Return whether this shift is active on the given date.

        Parameters:
        - `date` (datetime.date): the date to evaluate.

        Returns:
        - bool: True when the shift's weekday flag is set for `date`.
        """
        weekday = date.weekday()  # 0 = Monday
        return [
            self.monday,
            self.tuesday,
            self.wednesday,
            self.thursday,
            self.friday,
            self.saturday,
            self.sunday,
        ][weekday]

    def department_name(self):
        """Return the name of the department this shift belongs to, or None."""
        return self.department.name if self.department else None
    
    def __str__(self):
        """Return the human-readable name for the shift."""
        return self.name
