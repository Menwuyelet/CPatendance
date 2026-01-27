"""Module backend/apps/attendance/services/shift_resolution_service.py

Auto-generated module docstring.
"""

from django.core.exceptions import ValidationError
from django.utils import timezone

from attendance.models import Shift


class ShiftResolutionService:
    """Resolve which `Shift` instances apply to an employee on a date.

    This service contains helpers that encapsulate business rules for
    shift applicability and limits (for example, enforcing a maximum of
    two applicable shifts per day).
    """
    @staticmethod
    def get_employee_shifts_for_date(employee, date):
        """Return shifts assigned to `employee` that apply on `date`.

        Enforces the rule that an employee cannot have more than two
        applicable shifts on a single day.
        """
        shifts = Shift.objects.filter(
            employeeshift__employee=employee
        )

        applicable_shifts = [
            shift for shift in shifts
            if shift.applies_today(date)
        ]

        # 🔒 enforce max 2 shifts per day
        if len(applicable_shifts) > 2:
            raise ValidationError(
                "Employee cannot have more than 2 shifts per day."
            )

        return applicable_shifts

    @staticmethod
    def get_today_shifts(employee):
        """Convenience helper returning today's applicable shifts for `employee`.

        Raises `ValidationError` when no shifts are found for today.
        """
        today = timezone.now().date()
        shifts = ShiftResolutionService.get_employee_shifts_for_date(
            employee, today
        )

        if not shifts:
            raise ValidationError("No shift assigned for today.")

        return shifts
