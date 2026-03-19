"""Module backend/apps/accounts/policies/common.py

This file contains some common policy logics.
"""


class BasePolicy:
    """Common role-check helpers used by higher-level policies."""

    @staticmethod
    def same_department(user, employee):
        """Return True when `user` and `employee` belong to the same department."""
        return (
            hasattr(user, "employee")
            and user.employee.department_id is not None
            and user.employee.department_id == employee.department_id
        )
