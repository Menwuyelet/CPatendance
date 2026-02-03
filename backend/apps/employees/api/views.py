"""Module backend/apps/employees/api/views.py

This file contatins the views for the employees app.
"""

from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from employees.models import Employee, Department
from .serializers import EmployeeSerializer, EmployeeUpdateSerializer, DepartmentSerializer
from employees.services.employee_service import update_employee, get_employees_for_user
from accounts.permissions import IsAdmin, IsHRorManager, IsHRManagerOrAdmin


class DepartmentViewSet(viewsets.ModelViewSet):
    """Department management.

    Accessible to any user who is either ADMIN or HR/MANAGER. The backend
    permissions already encode these roles; here we combine them with OR
    semantics instead of the default AND behaviour for multiple permission
    classes.
    """
    permission_classes = [IsAuthenticated, IsHRManagerOrAdmin]
    def get_permissions(self):
        """Adjust permissions for mutating department endpoints.

        For update/partial_update/destroy only administrators are allowed.
        """
        # Allow access if the user is admin OR HR/manager.
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()


    queryset = (
        Department.objects
        .select_related("manager")
        .all()
    )
    serializer_class = DepartmentSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for listing and managing employee records.

    Read operations are scoped according to the requesting user's role;
    update operations are restricted to administrators.
    """
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee_code', 'full_name', 'user__email']
    ordering_fields = ['full_name', 'employee_code', 'created_at']
    pagination_class = PageNumberPagination
    http_method_names = ['get', 'put', 'patch', 'delete']  # Disable POST (create)

    def get_queryset(self):
        """Return the employee queryset appropriate for the requesting user."""

        return get_employees_for_user(self.request.user)

    def get_serializer_class(self):
        """Return the serializer class appropriate for the current action."""

        if self.action in ['update', 'partial_update']:
            return EmployeeUpdateSerializer
        return EmployeeSerializer

    def get_permissions(self):
        """Adjust permissions for mutating endpoints (admins only)."""

        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()

    def perform_update(self, serializer):
        """Apply validated updates and persist employee changes via service."""
        
        data = serializer.validated_data
        employee = update_employee(self.get_object(), **data)
        serializer.instance = employee


class ManagerTeamView(APIView):
    """Return team employees for the current manager/HR user.

    This endpoint powers the frontend Manager team view at:
        GET /api/manager/team/

    It reuses the same scoping rules as ``get_employees_for_user`` so that:
    - HR users see all employees.
    - Department managers see only employees in their department.
    """

    permission_classes = [IsAuthenticated, IsHRorManager]

    def get(self, request):
        """Return the list of employees visible to the current manager/HR."""
        employees_qs = get_employees_for_user(request.user)
        serializer = EmployeeSerializer(employees_qs, many=True)
        return Response(serializer.data)
