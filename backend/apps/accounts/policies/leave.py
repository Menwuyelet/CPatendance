"""Module backend/apps/accounts/policies/leave.py

This file contains the leave policy for feature implimentations.
"""

from .common import BasePolicy


class LeavePolicy(BasePolicy):
    """Policies for leave request and approval flows."""

    @classmethod
    def can_approve_leave(cls, user, leave_request):
        """
        - Manager: only department employees
        """
        employee = leave_request.employee

        return user.is_department_manager() and cls.same_department(user, employee)
