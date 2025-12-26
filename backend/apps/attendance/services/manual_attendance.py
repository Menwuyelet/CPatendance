from django.utils import timezone
from backend.apps.attendance import AttendanceRecord
from attendance.services.status import evaluate_status
from attendance.services.permissions import can_take_attendance

def mark_attendance(employee, user, check_in_time=None):
    """
    Used by HR or Department Managers to mark attendance.
    """
    if not can_take_attendance(user, employee):
        raise PermissionError("Not allowed to take attendance for this employee")

    today = timezone.localdate()

    record, _ = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=today,
        defaults={
            "employee_shift": employee.get_today_shift(),
            "taken_by": user,
        }
    )

    if record.check_in_time:
        raise ValueError("Attendance already marked")

    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)
    record.save()

    return record
