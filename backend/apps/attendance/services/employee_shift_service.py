"""Module backend/apps/attendance/services/employee_shift_service.py

Auto-generated module docstring.
"""

from attendance.models import EmployeeShift
from django.core.exceptions import ValidationError
from attendance.services.shift_resolution_service import ShiftResolutionService

class EmployeeShiftService:
    """Service helpers for assigning and querying EmployeeShift records."""
    @staticmethod
    def assign_shift(employee, shift):
        """Assign `shift` to `employee` enforcing business rules.

        Raises `ValidationError` when assignment would violate constraints
        (e.g. more than two applicable shifts for the same day).
        """
        from django.utils import timezone

        today = timezone.now().date()
        existing_shifts = ShiftResolutionService.get_employee_shifts_for_date(
            employee, today
        )

        if len(existing_shifts) >= 2:
            raise ValidationError(
                "Employee already has maximum shifts for applicable days."
            )

        return EmployeeShift.objects.create(
            employee=employee,
            shift=shift
        )

    @staticmethod
    def list_employee_shifts(employee=None):
        """Return employee shift assignments, optionally filtered by employee.

        Parameters:
        - `employee`: optional `Employee` instance or id to filter assignments.
        """
        qs = EmployeeShift.objects.select_related("employee", "shift")
        if employee:
            qs = qs.filter(employee=employee)
        return qs

    @staticmethod
    def remove_shift(employee_shift):
        """Remove the given `EmployeeShift` assignment from the database."""
        employee_shift.delete()