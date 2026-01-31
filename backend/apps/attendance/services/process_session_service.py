"""Module backend/apps/attendance/services/process_session_service.py

This file contains the service used to process the attendance marking for present users.
"""

from attendance.models import AttendanceSession
from attendance.services.attendance_service import mark_attendance
from config.logging import get_logger

logger = get_logger(__name__)


def process_attendance_session(session: AttendanceSession, user):
    """
    Convert session entries into AttendanceRecord.
    Idempotent & safe.
    """

    logger.info(
        "ATTENDANCE_SESSION_PROCESS_STARTED | session_id=%s | initiated_by=%s",
        session.id,
        user.id,
    )

    if session.is_active:
        logger.info(
            "ATTENDANCE_SESSION_PROCESS_SKIPPED | reason=session_active | session_id=%s",
            session.id,
        )
        return

    if getattr(session, "is_processed", False):
        logger.info(
            "ATTENDANCE_SESSION_PROCESS_SKIPPED | reason=already_processed | session_id=%s",
            session.id,
        )
        return

    employees = session.entries.values_list("employee_id", flat=True).distinct()

    logger.info(
        "ATTENDANCE_SESSION_EMPLOYEE_COUNT | session_id=%s | count=%s",
        session.id,
        len(employees),
    )

    for employee_id in employees:
        entry = session.entries.filter(employee_id=employee_id).earliest(
            "recognized_at"
        )
        logger.info(
            "ATTENDANCE_MARK_ATTEMPT | session_id=%s | employee_id=%s | recognized_at=%s",
            session.id,
            employee_id,
            entry.recognized_at,
        )

        mark_attendance(
            employee=entry.employee,
            user=user,
            check_in_time=entry.recognized_at,
            session=session,
        )

        logger.info(
            "ATTENDANCE_MARK_COMPLETED | session_id=%s | employee_id=%s",
            session.id,
            employee_id,
        )

    session.is_processed = True
    session.save(update_fields=["is_processed"])

    logger.info(
        "ATTENDANCE_SESSION_PROCESS_COMPLETED | session_id=%s",
        session.id,
    )
