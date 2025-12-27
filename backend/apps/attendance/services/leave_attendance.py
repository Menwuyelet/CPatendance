from attendance.models import AttendanceRecord


def apply_leave(employee, date):
    """
    Applies approved leave by updating or creating attendance as ON_LEAVE.
    """
    AttendanceRecord.objects.update_or_create(
        employee=employee,
        date=date,
        defaults={
            "status": "ON_LEAVE",
        }
    )
