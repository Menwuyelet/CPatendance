from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
# from django.shortcuts import get_object_or_404

from employees.models import Employee, Company, Department
from .serializers import EmployeeSerializer, EmployeeUpdateSerializer, CompanySerializer, DepartmentSerializer
from employees.services.employee_service import update_employee, get_employees_for_user
from accounts.permissions import IsAdmin, IsHRorManager

class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin, IsHRorManager]
    queryset = (
        Department.objects
        .select_related("company", "manager")
        .all()
    )
    serializer_class = DepartmentSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch', 'delete']  # Disable POST (create)

    def get_queryset(self):
        return get_employees_for_user(self.request.user)

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return EmployeeUpdateSerializer
        return EmployeeSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()

    def perform_update(self, serializer):
        data = serializer.validated_data
        employee = update_employee(self.get_object(), **data)
        serializer.instance = employee