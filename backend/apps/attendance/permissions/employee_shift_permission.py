from rest_framework.permissions import BasePermission, SAFE_METHODS

class CanManageEmployeeShift(BasePermission):
    """
    - SAFE METHODS (GET, HEAD, OPTIONS): authenticated users
    - WRITE METHODS: HR or manager of the employee's department
    """

    def has_permission(self, request, view):
        # List / retrieve → authenticated users
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated

        # Create / update / delete → authenticated required
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # SAFE METHODS → authenticated users
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
