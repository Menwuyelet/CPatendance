"""Module backend/apps/employees/api/views.py

This file contatins the views for the employees app.
"""

from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from employees.models import Employee, Department
from .serializers import (
    EmployeeSerializer,
    EmployeeUpdateSerializer,
    DepartmentSerializer,
)
from employees.services.employee_service import update_employee, get_employees_for_user
from accounts.permissions import IsAdmin, IsDepartmentManager, IsManagerOrAdmin


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Department management.

    Accessible to any user who is either ADMIN or MANAGER. The backend
    permissions already encode these roles; here we combine them with OR
    semantics instead of the default AND behavior for multiple permission
    classes.
    """

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get_permissions(self):
        """
        Adjust permissions for mutating department endpoints.

        For update/partial_update/destroy only administrators are allowed.
        """
        # Allow access if the user is admin OR manager.
        if self.action in ["update", "partial_update", "destroy"]:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()

    @transaction.atomic
    def create(self, *args, **kwargs):
        return super().create(*args, **kwargs)

    @transaction.atomic
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)

    @transaction.atomic
    def partial_update(self, *args, **kwargs):
        return super().partial_update(*args, **kwargs)

    @transaction.atomic
    def destroy(self, *args, **kwargs):
        return super().destroy(*args, **kwargs)

    queryset = Department.objects.select_related("manager").all()
    serializer_class = DepartmentSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for listing and managing employee records.

    Read operations are scoped according to the requesting user's role;
    update operations are restricted to administrators.
    """

    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "user__employee_code",
        "user__full_name",
    ]
    ordering_fields = ["user__full_name", "user__employee_code", "created_at"]
    pagination_class = PageNumberPagination
    http_method_names = ["get", "put", "patch", "delete"]  # Disable POST (create)

    def get_queryset(self):
        """Return the employee queryset appropriate for the requesting user."""

        return get_employees_for_user(self.request.user)

    def get_serializer_class(self):
        """Return the serializer class appropriate for the current action."""

        if self.action in ["update", "partial_update"]:
            return EmployeeUpdateSerializer
        return EmployeeSerializer

    def get_permissions(self):
        """Adjust permissions for mutating endpoints (admins only)."""

        if self.action in ["update", "partial_update", "destroy"]:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()

    def perform_update(self, serializer):
        """Apply validated updates and persist employee changes via service."""
        data = serializer.validated_data
        employee = update_employee(self.get_object(), **data)
        serializer.instance = employee
        serializer.save()

    @transaction.atomic
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)

    @transaction.atomic
    def partial_update(self, *args, **kwargs):
        return super().partial_update(*args, **kwargs)

    @transaction.atomic
    def destroy(self, *args, **kwargs):
        return super().destroy(*args, **kwargs)
