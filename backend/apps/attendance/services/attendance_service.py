"""Module backend/apps/attendance/services/attendance_service.py

This file contains the attendance taking services for marking attendance status.
"""

from django.utils import timezone
from accounts.policies.attendance import AttendancePolicy
from attendance.models import AttendanceRecord, AttendanceSessionEntry, EmployeeLeave
from .status import evaluate_status, evaluate_final_status
from django.db import transaction
from attendance.models import EmployeeShift
from employees.models import Employee
from datetime import timedelta

from config.logging import get_logger

logger = get_logger(__name__)


def mark_attendance(employee, user, session, check_in_time=None):
    """
    Record a check-in for `employee` taken by `user` during `session`.

    Inputs:
    - `employee`: Employee instance
    - `user`: User instance performing the action
    - `session`: AttendanceSession instance
    - `check_in_time` (optional): explicit timestamp to use

    Returns:
    - `AttendanceRecord` instance when created/updated, or `None` when
        the caller is not permitted to record attendance.
    """
    if not AttendancePolicy.can_take_attendance(user, employee):
        logger.warning(
            "ATTENDANCE_MARK_DENIED | user_id=%s | employee_id=%s | session_id=%s",
            user.id,
            employee.id,
            session.id,
        )
        return None

    logger.info(
        "ATTENDANCE_MARK_STARTED | employee_id=%s | session_id=%s | taken_by=%s",
        employee.id,
        session.id,
        user.id,
    )

    shift = session.shift

    employee_shift = [EmployeeShift.objects.get(employee=employee, shift=shift)]

    record, created = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=session.date,
        employee_shift=employee_shift,
        defaults={"taken_by": user},
    )

    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)
    record.save()

    logger.info(
        "ATTENDANCE_MARK_COMPLETED | employee_id=%s | session_id=%s | created=%s | status=%s",
        employee.id,
        session.id,
        created,
        record.status,
    )

    return record


class AttendanceAbsenceService:
    """
    Marks ABSENT employees for a session by comparing:
    - Employees assigned to the session's shift
    - Employees detected in the session
    """

    @staticmethod
    def _resolve_leave_employee_ids(leave_employee_codes):
        """Return a set of employee IDs for the provided employee codes."""
        if not leave_employee_codes:
            return set()

        from accounts.models import User

        return set(
            User.objects.filter(employee_code__in=leave_employee_codes).values_list(
                "employee__id", flat=True
            )
        )

    @staticmethod
    def _employees_with_active_leave(date):
        """Return a set of employee IDs that have long-term leave on `date`."""
        return set(
            EmployeeLeave.objects.filter(
                start_date__lte=date, end_date__gte=date
            ).values_list("employee_id", flat=True)
        )

    @staticmethod
    def process_check_in(session, leave_employee_codes=None):
        """Persist check-in times and mark absences for the check-in window.

        - Creates/updates AttendanceRecord per shift employee
        - Applies ON_LEAVE for provided codes or long-term leave
        - Marks ABSENT when no check-in was captured
        """
        shift = session.shift
        session_date = session.date

        leave_employee_ids = AttendanceAbsenceService._resolve_leave_employee_ids(
            leave_employee_codes
        ) | AttendanceAbsenceService._employees_with_active_leave(session_date)

        check_in_map = {
            entry.employee_id: entry.recognized_at
            for entry in AttendanceSessionEntry.objects.filter(session=session).exclude(
                recognized_at__isnull=True
            )
        }

        employee_ids = list(
            EmployeeShift.objects.filter(shift=shift).values_list(
                "employee_id", flat=True
            )
        )

        absent_count = 0

        for employee_id in employee_ids:
            employee_shift = EmployeeShift.objects.get(
                employee_id=employee_id, shift=shift
            )
            record, _ = AttendanceRecord.objects.get_or_create(
                employee_id=employee_id,
                date=session_date,
                employee_shift=employee_shift,
                defaults={"taken_by": session.started_by},
            )

            if employee_id in leave_employee_ids:
                record.status = "ON_LEAVE"
                record.check_in_time = None
                record.check_out_time = None
                record.save(update_fields=["status", "check_in_time", "check_out_time"])
                continue

            if employee_id in check_in_map:
                record.check_in_time = check_in_map[employee_id]
                record.status = evaluate_status(record)
                record.save(update_fields=["check_in_time", "status"])
                continue

            record.status = "ABSENT"
            record.check_in_time = None
            record.save(update_fields=["status", "check_in_time"])
            absent_count += 1

        return absent_count

    @staticmethod
    @transaction.atomic
    def mark_absent_for_session(session):
        """
        Mark employees as ABSENT for a finished attendance session.

        This examines assigned employees for the session's shift and any
        successfully recognized entries; employees without a record are
        marked ABSENT.
        """
        shift = session.shift

        logger.info(
            "ABSENCE_EVALUATION_STARTED | session_id=%s | shift_id=%s",
            session.id,
            shift.id,
        )

        employee_ids = [
            emp_id
            for emp_id in EmployeeShift.objects.filter(shift=shift).values_list(
                "employee_id", flat=True
            )
        ]

        session_records = [
            record for record in AttendanceSessionEntry.objects.filter(session=session)
        ]

        detected_employee_ids = set(
            session_records.filter(recognized_at__isnull=False).values_list(
                "employee_id", flat=True
            )
        )

        absent_count = 0

        for employee in employee_ids:
            if employee in detected_employee_ids:
                continue

            employee_shift = EmployeeShift.objects.get(
                employee_id=employee, shift=shift
            )

            record, created = AttendanceRecord.objects.get_or_create(
                employee=Employee.objects.get(id=employee),
                date=session.date,
                employee_shift=employee_shift,
                defaults={
                    "status": "ABSENT",
                    "created_at": timezone.now(),
                    "taken_by": session.started_by,
                },
            )

            if not created and record.status is None:
                record.status = "ABSENT"
                record.save(update_fields=["status", "created_at"])

            absent_count += 1

            logger.info(
                "ABSENCE_MARKED | employee_id=%s | session_id=%s | created=%s",
                employee,
                session.id,
                created,
            )

        logger.info(
            "ABSENCE_EVALUATION_COMPLETED | session_id=%s | absent_count=%s",
            session.id,
            absent_count,
        )

        return absent_count

    @staticmethod
    def process_check_out(session, leave_employee_codes=None):
        """Finalize checkout times and recompute final attendance status."""
        shift = session.shift
        session_date = session.date

        leave_employee_ids = AttendanceAbsenceService._resolve_leave_employee_ids(
            leave_employee_codes
        ) | AttendanceAbsenceService._employees_with_active_leave(session_date)

        checkout_map = {
            entry.employee_id: entry.checkout_recognized_at
            for entry in AttendanceSessionEntry.objects.filter(session=session).exclude(
                checkout_recognized_at__isnull=True
            )
        }

        # Use records already created during check-in processing
        records = AttendanceRecord.objects.filter(
            employee_shift__shift=shift, date=session_date
        ).select_related("employee_shift")

        for record in records:
            employee_id = record.employee_id
            leave_applies = employee_id in leave_employee_ids

            if leave_applies:
                record.status = "ON_LEAVE"
                record.check_in_time = None
                record.check_out_time = None
                record.save(update_fields=["status", "check_in_time", "check_out_time"])
                continue

            if employee_id in checkout_map:
                record.check_out_time = checkout_map[employee_id]

            record.status = evaluate_final_status(record)
            record.save(update_fields=["check_out_time", "status"])

        return records.count()
