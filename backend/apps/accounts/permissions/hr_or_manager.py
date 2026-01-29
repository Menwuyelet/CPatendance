"""Module backend/apps/accounts/permissions/hr_or_manager.py

This file contains the logic to validate if the user is HR OR MANAGER.
"""

from rest_framework.permissions import BasePermission
from .utils import user_has_role

class IsHRorManager(BasePermission):
    """Allow access to users who are HR or department managers."""

    def has_permission(self, request, view):
        """Return True when `request.user` has HR or MANAGER role."""
        return (
            user_has_role(request.user, "HR") or
            user_has_role(request.user, "MANAGER")
        )
