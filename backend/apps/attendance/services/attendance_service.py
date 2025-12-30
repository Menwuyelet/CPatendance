from django.utils import timezone
from accounts.policies.attendance import AttendancePolicy
from attendance.models import AttendanceRecord
from .status import evaluate_status


def mark_attendance(employee, user, session, check_in_time=None):
    if not AttendancePolicy.can_take_attendance(user, employee):
        return None

    record, _ = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=session.date,
        defaults={
            "employee_shift": employee.get_shift_for_date(session.date),
            "taken_by": user
        }
    )
    print("This runs mark attendance")
    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)
    record.save()

    return record

