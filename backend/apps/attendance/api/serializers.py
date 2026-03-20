"""Module backend/apps/attendance/api/serializers.py

This file contains the serializers for the attendance app.
"""

from rest_framework import serializers
from attendance.models import AttendanceRecord
from attendance.models import AttendanceSession
from attendance.models import EmployeeShift
from attendance.models import Shift
from attendance.models import EmployeeLeave


class AttendanceSessionSerializer(serializers.ModelSerializer):
    """Model serializer representing an attendance session."""

    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "shift",
            "started_by",
            "started_at",
            "is_active",
            "ended_at",
            "phase",
            "is_sleep",
            "check_in_processed_at",
            "check_out_processed_at",
        )
        read_only_fields = (
            "started_by",
            "started_at",
            "ednded_at",
            "phase",
            "is_sleep",
            "check_in_processed_at",
            "check_out_processed_at",
        )


class AttendanceCheckOutSerializer(serializers.Serializer):
    """Serializer for attendance check-out requests."""

    employee_id = serializers.IntegerField(required=False)


class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer representing an `AttendanceRecord` instance."""

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "employee",
            "employee_shift",
            "date",
            "check_in_time",
            "check_out_time",
            "status",
            "taken_by",
            "created_at",
        ]
        read_only_fields = fields


class EmployeeShiftSerializer(serializers.ModelSerializer):
    """Serializer for `EmployeeShift` associations."""

    class Meta:
        model = EmployeeShift
        fields = [
            "id",
            "employee",
            "shift",
        ]


class ShiftSerializer(serializers.ModelSerializer):
    """Serializer describing a `Shift` (schedule pattern)."""

    class Meta:
        model = Shift
        fields = [
            "id",
            "name",
            "start_time",
            "end_time",
            "description",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]


class EmployeeLeaveSerializer(serializers.ModelSerializer):
    """Serializer for long-term leave windows."""

    class Meta:
        model = EmployeeLeave
        fields = [
            "id",
            "employee",
            "start_date",
            "end_date",
            "reason",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError("end_date cannot be before start_date")
        return attrs
