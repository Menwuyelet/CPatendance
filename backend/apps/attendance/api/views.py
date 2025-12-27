from urllib import request
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from employees.models import Employee
from attendance.api.serializers import (
    AttendanceCheckInSerializer,
    AttendanceCheckOutSerializer,
    AttendanceSerializer
)
from attendance.services.attendance_service import (
    mark_attendance,
)
from attendance.services.check_out import (check_out)
from attendance.models import AttendanceRecord


class AttendanceViewSet(ViewSet):
    """
    Handles:
    - Self check-in/out
    - HR / Manager taking attendance
    """

    def create(self, request):
        """
        CHECK-IN
        """
        serializer = AttendanceCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = self._resolve_employee(request, serializer)

        record = mark_attendance(
            employee=employee,
            user=request.user,
            check_in_time=serializer.validated_data.get("check_in_time")
        )

        return Response(
            AttendanceSerializer(record).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, pk=None):
        """
        CHECK-OUT
        """
        serializer = AttendanceCheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = self._resolve_employee(request, serializer)

        record = check_out(employee)

        return Response(
            AttendanceSerializer(record).data,
            status=status.HTTP_200_OK
        )

    def list(self, request):
        """
        LIST ATTENDANCE (Scoped)
        """
        qs = AttendanceRecord.objects.all()

        # Admin sees everything
        if request.user.is_admin():
            pass

        # HR / Manager / Employee
        else:
            # HR sees all, Manager sees their department, Employee sees only self
            if request.user.is_hr():
                pass  # HR sees all
            elif request.user.is_department_manager():
                if hasattr(request.user, 'employee') and request.user.employee.department:
                    qs = qs.filter(employee__department=request.user.employee.department)
                else:
                    qs = qs.none()
            else:
                # Employee sees only self
                if hasattr(request.user, 'employee'):
                    qs = qs.filter(employee=request.user.employee)
                else:
                    qs = qs.none()


        # Optional filters
        date = request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)

        return Response(
            AttendanceSerializer(qs, many=True).data,
            status=status.HTTP_200_OK
        )

    def _resolve_employee(self, request, serializer):
        """
        Determines whether:
        - Self attendance
        - Attendance taken by HR / Manager
        """
        employee_id = serializer.validated_data.get("employee_id")

        if employee_id:
            return get_object_or_404(Employee, id=employee_id)

        # Self check-in/out
        return request.user.employee
