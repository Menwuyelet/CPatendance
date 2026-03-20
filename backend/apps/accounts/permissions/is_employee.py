"""Module backend/apps/accounts/permissions/is_employee.py

This file contains the logic to validate if the user is EMPLOYEE.
"""

from rest_framework.permissions import BasePermission


class IsEmployee(BasePermission):
    """Permission for users that represent an employee record."""

    def has_permission(self, request, view):
        """Return True when the authenticated user has an `employee` relation."""
        return request.user.is_employee()
