# attendance/services/process_session.py
from attendance.models import AttendanceSession
from attendance.services.attendance_service import mark_attendance


def process_attendance_session(session: AttendanceSession, user):
    if session.is_active:
        raise RuntimeError("Session still active")

    for entry in session.entries.select_related("employee"):
        mark_attendance(
            employee=entry.employee,
            user=user,
            check_in_time=entry.recognized_at
        )
