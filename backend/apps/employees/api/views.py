from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.pagination import PageNumberPagination
# from django.shortcuts import get_object_or_404

from employees.models import Employee, Department
from .serializers import EmployeeSerializer, EmployeeUpdateSerializer, DepartmentSerializer
from employees.services.employee_service import update_employee, get_employees_for_user
from accounts.permissions import IsAdmin, IsHRorManager


class DepartmentViewSet(viewsets.ModelViewSet):
    """Department management.

    Accessible to any user who is either ADMIN or HR/MANAGER. The backend
    permissions already encode these roles; here we combine them with OR
    semantics instead of the default AND behaviour for multiple permission
    classes.
    """
    permission_classes = [IsAuthenticated, IsHRorManager | IsAdmin]
    def get_permissions(self):
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
        return get_employees_for_user(self.request.user)

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return EmployeeUpdateSerializer
        return EmployeeSerializer

    def get_permissions(self):
        # For full updates and deletes require Admin privileges.
        if self.action in ['update', 'destroy']:
            self.permission_classes = [IsAdmin]
        # Allow authenticated users to call partial_update, we'll enforce
        # fine-grained rules inside the method (so employees can update
        # their own profile photo).
        if self.action == 'partial_update':
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def perform_update(self, serializer):
        data = serializer.validated_data
        employee = update_employee(self.get_object(), **data)
        serializer.instance = employee

    def partial_update(self, request, pk=None):
        employee = self.get_object()
        user = request.user

        # Allow if admin or HR, or the user is updating their own employee record.
        is_self = hasattr(user, 'employee') and user.employee.id == employee.id
        if not (user.is_admin() or user.is_hr() or is_self or user.is_department_manager()):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


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
        employees_qs = get_employees_for_user(request.user)
        serializer = EmployeeSerializer(employees_qs, many=True)
        return Response(serializer.data)
