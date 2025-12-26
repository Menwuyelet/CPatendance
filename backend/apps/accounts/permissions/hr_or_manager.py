# accounts/permissions/hr_or_manager.py
from rest_framework.permissions import BasePermission
from .utils import user_has_role

class IsHRorManager(BasePermission):
    def has_permission(self, request, view):
        return (
            user_has_role(request.user, "HR") or
            user_has_role(request.user, "DEPARTMENT_MANAGER")
        )
