"""Module backend/apps/accounts/permissions/is_manager.py

Auto-generated module docstring.
"""

from rest_framework.permissions import BasePermission
from .utils import user_has_role

class IsDepartmentManager(BasePermission):
    """Permission restricting access to department managers."""

    def has_permission(self, request, view):
        """Return True when `request.user` has the MANAGER role."""
        return user_has_role(request.user, "MANAGER")
