"""Module backend/apps/accounts/policies/attendance.py

This file contains the attendance policies used to handle autorization.
"""

from .common import BasePolicy


class AttendancePolicy(BasePolicy):
    """Policies related to attendance operations.

    Re-uses `BasePolicy` role helpers to determine whether a user may
    take attendance, self check-in, or view another employee's records.
    """

    @classmethod
    def can_take_attendance(cls, user, employee):
        """
        Managers can take attendance for employees in their department.
        """

        return user.is_department_manager() and cls.same_department(user, employee)

    @classmethod
    def can_view_attendance(cls, user, employee):
        """
        - Manager: department
        - Admin: all
        """
        return user.is_admin() or (
            user.is_department_manager() and cls.same_department(user, employee)
        )
