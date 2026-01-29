"""Module backend/apps/accounts/permissions/is_hr.py

This file contains the logic to validate if the user is HR
"""

from rest_framework.permissions import BasePermission
from .utils import user_has_role

class IsHR(BasePermission):
    """Permission that allows only HR users."""

    def has_permission(self, request, view):
        """Return True when `request.user` has the HR role."""
        return user_has_role(request.user, "HR")
