from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from accounts.models import User
from attendance.api.serializers import (
    AttendanceCreateSerializer,
    AttendanceSerializer
)
from attendance.services.attendance_service import mark_attendance, check_out


class AttendanceViewSet(ViewSet):

    def create(self, request):
        serializer = AttendanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = get_object_or_404(
            User,
            id=serializer.validated_data["employee_id"]
        )

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
        Used for check-out
        """
        employee = get_object_or_404(User, id=pk)
        record = check_out(employee)

        return Response(
            AttendanceSerializer(record).data,
            status=status.HTTP_200_OK
        )
