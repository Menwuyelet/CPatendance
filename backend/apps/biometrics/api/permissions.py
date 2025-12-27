from rest_framework.permissions import BasePermission


class CanEnrollFace(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            (user.has_role("ADMIN"))
        )


class CanRecognizeFace(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            user.can_take_attendance()
        )
