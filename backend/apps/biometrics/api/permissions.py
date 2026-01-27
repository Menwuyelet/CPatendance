"""Module backend/apps/biometrics/api/permissions.py

Auto-generated module docstring.
"""

from rest_framework.permissions import BasePermission


class CanEnrollFace(BasePermission):
    """Allow endpoints to accept enrollments from authenticated users."""

    def has_permission(self, request, view):
        """Return True for authenticated users allowed to enroll biometrics."""
        user = request.user
        return (
            user.is_authenticated 
        )


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
