# attendance/models/employee_shift.py
from django.db import models

class EmployeeShift(models.Model):
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="shift_assignments"
    )
    shift = models.ForeignKey(
        "attendance.Shift",
        on_delete=models.PROTECT
    )
    date = models.DateField()

    assigned_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="assigned_shifts"
    )

    class Meta:
        unique_together = ("employee", "date")
        indexes = [
            models.Index(fields=["employee", "date"]),
        ]

    def __str__(self):
        return f"{self.employee} → {self.shift} on {self.date}"
