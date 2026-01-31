"""Module backend/apps/attendance/services/shift_resolution_service.py

This file contains the shift resolution services used to manage shift and user relations.
"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from attendance.models import Shift
from config.logging import get_logger

logger = get_logger(__name__)


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
        logger.info(
            "SHIFT_RESOLUTION_STARTED | employee_id=%s | date=%s",
            employee.id,
            date,
        )
        shifts = Shift.objects.filter(employeeshift__employee=employee)

        applicable_shifts = [shift for shift in shifts if shift.applies_today(date)]

        logger.info(
            "SHIFT_RESOLUTION_APPLICABLE_COUNT | employee_id=%s | count=%s",
            employee.id,
            len(applicable_shifts),
        )

        if len(applicable_shifts) > 2:
            logger.warning(
                "SHIFT_RESOLUTION_LIMIT_EXCEEDED | employee_id=%s | count=%s",
                employee.id,
                len(applicable_shifts),
            )
            raise ValidationError("Employee cannot have more than 2 shifts per day.")

        return applicable_shifts

    @staticmethod
    def get_today_shifts(employee):
        """Convenience helper returning today's applicable shifts for `employee`.

        Raises `ValidationError` when no shifts are found for today.
        """
        today = timezone.now().date()
        logger.info(
            "SHIFT_RESOLUTION_TODAY_STARTED | employee_id=%s | date=%s",
            employee.id,
            today,
        )

        shifts = ShiftResolutionService.get_employee_shifts_for_date(employee, today)

        if not shifts:
            logger.warning(
                "SHIFT_RESOLUTION_NONE_FOUND | employee_id=%s | date=%s",
                employee.id,
                today,
            )
            raise ValidationError("No shift assigned for today.")

        logger.info(
            "SHIFT_RESOLUTION_TODAY_SUCCESS | employee_id=%s | count=%s",
            employee.id,
            len(shifts),
        )
        return shifts
