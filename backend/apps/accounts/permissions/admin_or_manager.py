"""Module backend/apps/accounts/permissions/admin_or_manager.py

This file contains the logic to validate if the user is ADMIN OR MANAGER.
"""

from rest_framework.permissions import BasePermission


class IsManagerOrAdmin(BasePermission):
    """Allow access to users who are HR, MANAGER, or ADMIN.

    This permission class implements OR logic between IsHRorManager and IsAdmin.
    """

    def has_permission(self, request, view):
        """Return True when `request.user` is MANAGER, or ADMIN."""

        # Then check if user is Admin
        return request.user.is_department_manager() or request.user.is_admin()
