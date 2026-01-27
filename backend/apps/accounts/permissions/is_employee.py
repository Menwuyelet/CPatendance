"""Module backend/apps/accounts/permissions/is_employee.py

Auto-generated module docstring.
"""

from rest_framework.permissions import BasePermission

class IsEmployee(BasePermission):
    """Permission for users that represent an employee record."""

    def has_permission(self, request, view):
        """Return True when the authenticated user has an `employee` relation."""
        return hasattr(request.user, "employee")
