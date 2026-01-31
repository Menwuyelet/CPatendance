"""Module backend/apps/attendance/services/employee_shift_service.py

This file contains the services used to manage shift and employee relation.
"""

from attendance.models import EmployeeShift
from django.core.exceptions import ValidationError
from attendance.services.shift_resolution_service import ShiftResolutionService
from django.utils import timezone
from config.logging import get_logger

logger = get_logger(__name__)


class EmployeeShiftService:
    """Service helpers for assigning and querying EmployeeShift records."""

    @staticmethod
    def assign_shift(employee, shift):
        """Assign `shift` to `employee` enforcing business rules.

        Raises `ValidationError` when assignment would violate constraints
        (e.g. more than two applicable shifts for the same day).
        """
        logger.info(
            "EMPLOYEE_SHIFT_ASSIGN_STARTED | employee_id=%s | shift_id=%s",
            employee.id,
            shift.id,
        )
        today = timezone.now().date()
        existing_shifts = ShiftResolutionService.get_employee_shifts_for_date(
            employee, today
        )

        if len(existing_shifts) >= 2:
            logger.warning(
                "EMPLOYEE_SHIFT_ASSIGN_DENIED | reason=max_shifts_reached | employee_id=%s | shift_id=%s | existing_count=%s",
                employee.id,
                shift.id,
                len(existing_shifts),
            )
            raise ValidationError(
                "Employee already has maximum shifts for applicable days."
            )

        employee_shift = EmployeeShift.objects.create(employee=employee, shift=shift)

        logger.info(
            "EMPLOYEE_SHIFT_ASSIGN_SUCCESS | employee_id=%s | shift_id=%s | employee_shift_id=%s",
            employee.id,
            shift.id,
            employee_shift.id,
        )

        return employee_shift

    @staticmethod
    def list_employee_shifts(employee=None):
        """Return employee shift assignments, optionally filtered by employee.

        Parameters:
        - `employee`: optional `Employee` instance or id to filter assignments.
        """
        logger.info(
            "EMPLOYEE_SHIFT_LIST_REQUEST | employee_filter=%s",
            getattr(employee, "id", employee),
        )

        qs = EmployeeShift.objects.select_related("employee", "shift")
        if employee:
            qs = qs.filter(employee=employee)

            logger.info(
                "EMPLOYEE_SHIFT_LIST_FILTERED | employee_id=%s",
                getattr(employee, "id", employee),
            )
        return qs

    @staticmethod
    def remove_shift(employee_shift):
        """Remove the given `EmployeeShift` assignment from the database."""
        logger.info(
            "EMPLOYEE_SHIFT_REMOVE_STARTED | employee_shift_id=%s | employee_id=%s | shift_id=%s",
            employee_shift.id,
            employee_shift.employee_id,
            employee_shift.shift_id,
        )
        employee_shift.delete()

        logger.info(
            "EMPLOYEE_SHIFT_REMOVE_SUCCESS | employee_shift_id=%s",
            employee_shift.id,
        )
