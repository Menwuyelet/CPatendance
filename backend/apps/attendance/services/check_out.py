from django.db import transaction
from django.utils import timezone

from attendance.models import AttendanceRecord


@transaction.atomic
def check_out(employee):
    """
    Check out an employee for today's attendance.

    Rules:
    - Attendance record must exist
    - Must have checked in
    - Cannot check out twice
    """

    today = timezone.localdate()

    try:
        record = AttendanceRecord.objects.select_for_update().get(
            employee=employee,
            date=today
        )
    except AttendanceRecord.DoesNotExist:
        raise ValueError("Attendance record does not exist")

    if not record.check_in_time:
        raise ValueError("Cannot check out before check in")

    if record.check_out_time:
        raise ValueError("Already checked out")

    record.check_out_time = timezone.now()
    record.save(update_fields=["check_out_time"])

    return record
