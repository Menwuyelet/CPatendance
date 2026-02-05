"""Module backend/apps/attendance/services/attendance_service.py

This file contains the attendance taking services for marking attendance status.
"""

from django.utils import timezone
from accounts.policies.attendance import AttendancePolicy
from attendance.models import AttendanceRecord, AttendanceSessionEntry
from .status import evaluate_status, evaluate_left_early
from django.db import transaction
from attendance.models import EmployeeShift
from employees.models import Employee

from config.logging import get_logger

logger = get_logger(__name__)


def mark_attendance(
    employee,
    user,
    session,
    check_in_time=None,
    check_out_time=None,
    early_leave_grace_minutes=15,
):
    """Record a check-in for `employee` taken by `user` during `session`.

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

    employee_shift = EmployeeShift.objects.get(employee=employee, shift=shift)

    record, created = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=session.date,
        employee_shift=employee_shift,
        defaults={"taken_by": user},
    )

    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)

    if check_out_time is not None:
        record.check_out_time = check_out_time
        record.left_early = evaluate_left_early(
            record, grace_minutes=early_leave_grace_minutes
        )
        record.no_check_out = False
    else:
        record.no_check_out = True
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
    @transaction.atomic
    def mark_absent_for_session(session):
        """Mark employees as ABSENT for a finished attendance session.

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

        employee_ids = EmployeeShift.objects.filter(shift=shift).values_list(
            "employee_id", flat=True
        )

        session_records = AttendanceSessionEntry.objects.filter(session=session)

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
