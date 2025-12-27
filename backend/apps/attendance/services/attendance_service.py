from django.utils import timezone
from accounts.policies.attendance import AttendancePolicy
from attendance.models import AttendanceRecord
from .status import evaluate_status


def mark_attendance(employee, user, check_in_time=None):
    if not AttendancePolicy.can_take_attendance(user, employee):
        raise PermissionError("Not allowed to take attendance")

    record, _ = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=timezone.localdate(),
        defaults={
            "employee_shift": employee.get_today_shift(),
            "taken_by": user
        }
    )

    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)
    record.save()

    return record
