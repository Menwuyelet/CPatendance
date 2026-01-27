"""Module backend/apps/accounts/policies/leave.py

Auto-generated module docstring.
"""

from .common import BasePolicy

class LeavePolicy(BasePolicy):
    """Policies for leave request and approval flows."""

    @classmethod
    def can_request_leave(cls, user):
        """Return True when `user` may request leave (workers, HR, managers)."""
        return cls.is_worker(user) or cls.is_hr(user) or cls.is_manager(user)

    @classmethod
    def can_approve_leave(cls, user, leave_request):
        """
        - HR: any leave
        - Manager: only department employees
        """
        employee = leave_request.employee

        if cls.is_hr(user):
            return True

        if cls.is_manager(user) and cls.same_department(user, employee):
            return True

        return False
