# attendance/services/check_in.py
from django.utils import timezone
from backend.apps.attendance import AttendanceRecord
from attendance.services.status import evaluate_status

def check_in(employee, user):
    today = timezone.localdate()

    record, created = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=today,
        defaults={
            "employee_shift": employee.get_today_shift(),
            "taken_by": user
        }
    )

    if record.check_in_time:
        raise ValueError("Already checked in")

    record.check_in_time = timezone.now()
    record.status = evaluate_status(record)
    record.save()

    return record
