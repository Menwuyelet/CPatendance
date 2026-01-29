"""Module backend/apps/accounts/permissions/is_admin.py

This file contains the logic to validate if the user is ADMIN.
"""

from rest_framework.permissions import BasePermission
from .utils import user_has_role

class IsAdmin(BasePermission):
    """Permission that allows only users with the ADMIN role."""

    def has_permission(self, request, view):
        """Return True when `request.user` has the ADMIN role."""
        return user_has_role(request.user, "ADMIN")