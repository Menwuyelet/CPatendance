from attendance.services.leave_attendance import apply_leave
from leave.services.permissions import can_approve_leave


def approve_leave(leave_record, approved_by):
    """
    Approves a leave record and applies its effect to attendance.
    """

    if not can_approve_leave(approved_by, leave_record.employee):
        raise PermissionError("Not allowed to approve this leave")

    leave_record.status = "APPROVED"
    leave_record.approved_by = approved_by
    leave_record.save()

    # Apply leave to attendance for each day
    for date in leave_record.get_date_range():
        apply_leave(leave_record.employee, date)

    return leave_record
