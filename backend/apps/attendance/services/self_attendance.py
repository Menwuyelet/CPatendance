from django.utils import timezone
from backend.apps.attendance import AttendanceRecord


def check_out(employee):
    """
    Allows an employee (including HR and managers) to check out.
    """
    today = timezone.localdate()

    record = AttendanceRecord.objects.get(
        employee=employee,
        date=today
    )

    if not record.check_in_time:
        raise ValueError("Cannot check out before check in")

    if record.check_out_time:
        raise ValueError("Already checked out")

    record.check_out_time = timezone.now()
    record.save()

    return record
