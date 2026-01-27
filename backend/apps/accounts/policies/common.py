"""Module backend/apps/accounts/policies/common.py

Auto-generated module docstring.
"""

from accounts.constants import Roles

class BasePolicy:
    """Common role-check helpers used by higher-level policies."""

    @staticmethod
    def is_admin(user):
        """Return True when `user` has the ADMIN role."""
        return user.has_role(Roles.ADMIN)
    @staticmethod
    def is_hr(user):
        """Return True when `user` has the HR role."""
        return user.has_role(Roles.HR)

    @staticmethod
    def is_manager(user):
        """Return True when `user` has the MANAGER role."""
        return user.has_role(Roles.MANAGER)

    @staticmethod
    def is_worker(user):
        """Return True when `user` is a worker/employee."""
        return user.has_role(Roles.EMPLOYEE)

    @staticmethod
    def same_department(user, employee):
        """Return True when `user` and `employee` belong to the same department."""
        return (
            hasattr(user, 'employee') and
            user.employee.department_id is not None and
            user.employee.department_id == employee.department_id
        )
