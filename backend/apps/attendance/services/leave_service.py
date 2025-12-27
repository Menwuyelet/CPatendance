from accounts.policies.leave import LeavePolicy
from attendance.services.leave_attendance import apply_leave


def approve_leave(leave_request, approved_by):
    if not LeavePolicy.can_approve_leave(approved_by, leave_request):
        raise PermissionError("Not allowed to approve leave")

    leave_request.status = "APPROVED"
    leave_request.approved_by = approved_by
    leave_request.save()

    for date in leave_request.get_leave_dates():
        apply_leave(leave_request.employee, date)

    return leave_request
