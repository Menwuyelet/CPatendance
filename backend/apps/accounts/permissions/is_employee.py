# accounts/permissions/is_employee.py
from rest_framework.permissions import BasePermission

class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "employee")
