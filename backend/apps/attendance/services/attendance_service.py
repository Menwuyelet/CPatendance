"""Module backend/apps/attendance/services/attendance_service.py

This file contains the attendance taking services for marking attendance status.
"""

from django.utils import timezone
from accounts.policies.attendance import AttendancePolicy
from attendance.models import AttendanceRecord, AttendanceSessionEntry
from .status import evaluate_status
from django.db import transaction
from attendance.models import EmployeeShift
from employees.models import Employee
from rest_framework.response import Response
from rest_framework import status

def mark_attendance(employee, user, session, check_in_time=None):
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
        return Response(
                {"detail": "Unauthorized to take attendance."},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    shift = session.shift
    employee_shift = EmployeeShift.objects.get(
        employee=employee,
        shift=shift
    )

    record, _ = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=session.date,
        employee_shift=employee_shift,
        defaults={
            "taken_by": user
        }
    )

    # Note: avoid noisy prints in production; left here for debugging.
    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)
    record.save()

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

        print(f"[INFO] Evaluating absences for session {session.id}")

        employee_ids = EmployeeShift.objects.filter(
            shift=shift
        ).values_list("employee_id", flat=True)

        session_records = AttendanceSessionEntry.objects.filter(
            session=session
        )

        detected_employee_ids = set(
            session_records
            .filter(recognized_at__isnull=False)
            .values_list("employee_id", flat=True)
        )

        absent_count = 0

        for employee in employee_ids:
            # Employee detected → skip
            if employee in detected_employee_ids:
                continue


            employee_shift = EmployeeShift.objects.get(
                employee_id=employee,
                shift=shift
            )
            # 4. Get or create attendance record
            record, created = AttendanceRecord.objects.get_or_create(
                employee=Employee.objects.get(id=employee),
                date=session.date,
                employee_shift=employee_shift,
                defaults={
                    "status": "ABSENT",
                    "created_at": timezone.now(),
                    "taken_by": session.started_by
                }
            )

            # 5. If record exists but not yet evaluated
            if not created and record.status is None:
                record.status = "ABSENT"
                record.save(update_fields=["status", "marked_at"])

            absent_count += 1

        return absent_count
