"""Module backend/apps/accounts/permissions/is_admin.py

This file contains the logic to validate if the user is ADMIN.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Permission that allows only users with the ADMIN role."""

    def has_permission(self, request, view):
        """Return True when `request.user` has the ADMIN role."""
        return request.user.is_admin()
