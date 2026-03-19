"""Module backend/apps/biometrics/api/permissions.py

This file contains the permission for the biometrics related tasks.
"""

from rest_framework.permissions import BasePermission





class CanRecognizeFace(BasePermission):
    """Permission used for recognition endpoints (taking attendance).

    Ensures the caller is authenticated and has the capability to perform
    recognition-based attendance actions.
    """

    def has_permission(self, request, view):
        """Return True when the user is allowed to perform recognition."""
        user = request.user
        return (
            user.is_authenticated and
            getattr(user, 'can_take_attendance', lambda: False)()
        )
