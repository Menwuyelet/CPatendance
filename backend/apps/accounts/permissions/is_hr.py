from rest_framework.permissions import BasePermission
from .utils import user_has_role

class IsHR(BasePermission):
    def has_permission(self, request, view):
        return user_has_role(request.user, "HR")
