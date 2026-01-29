"""Module backend/apps/attendance/services/process_session_service.py

This file contains the service used to process the attendance marking for present users.
"""

# attendance/services/process_session.py
from attendance.models import AttendanceSession
from attendance.services.attendance_service import mark_attendance


def process_attendance_session(session: AttendanceSession, user):
    """
    Convert session entries into AttendanceRecord.
    Idempotent & safe.
    """

    if session.is_active:
        return

    if getattr(session, "is_processed", False):
        return

    employees = (
        session.entries
        .values_list("employee_id", flat=True)
        .distinct()
    )

    for employee_id in employees:
        entry = (
            session.entries
            .filter(employee_id=employee_id)
            .earliest("recognized_at")
        )

        mark_attendance(
            employee=entry.employee,
            user=user,
            check_in_time=entry.recognized_at,
            session=session
        )
        
    session.is_processed = True
    session.save(update_fields=["is_processed"])
