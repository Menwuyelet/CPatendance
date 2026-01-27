"""Module backend/apps/attendance/permissions/employee_shift_permission.py

Auto-generated module docstring.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageEmployeeShift(BasePermission):
    """
    - SAFE METHODS (GET, HEAD, OPTIONS): authenticated users
    - WRITE METHODS: HR or manager of the employee's department
    """

    def has_permission(self, request, view):
        """High-level permission check for list/create operations.

        Safe methods (GET/HEAD/OPTIONS) allow any authenticated user.
        Mutating methods require authentication and are further checked
        at the object level.
        """
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated

        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Object-level permission check for a specific `EmployeeShift`.

        - SAFE methods: authenticated users
        - Mutating methods: allowed for HR or managers of the employee's
          department.
        """
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated

        user = request.user
        employee = obj.employee

        # HR role
        if getattr(user, "role", None) == "HR":
            return True

        # Manager of the employee's department
        if getattr(user, "role", None) == "MANAGER":
            return (
                employee.department
                and employee.department.manager_id == user.id
            )

        return False
