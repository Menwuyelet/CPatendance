"""Module backend/apps/attendance/models/employee_shift.py

This file contains the implimentation of the representation of employee and shift relation.
"""

from django.db import models
from attendance.models.shift import Shift

class EmployeeShift(models.Model):
    """
    Assignment linking an employee to a shift.

    Represents which `Shift` instances are assigned to an `Employee`.
    Used when resolving which shift an employee should follow on a date.
    """
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="shifts"
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE
    )

    class Meta:
        """Model `Meta`: enforces uniqueness of (employee, shift) pairs."""
        unique_together = ("employee", "shift")
