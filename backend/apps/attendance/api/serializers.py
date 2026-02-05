"""Module backend/apps/attendance/api/serializers.py

This file contains the serializers for the attendance app.
"""

from rest_framework import serializers
from attendance.models import AttendanceRecord
from attendance.models import AttendanceSession
from attendance.models import EmployeeShift
from attendance.models import Shift

class AttendanceCheckInSerializer(serializers.Serializer):
    """Serializer for attendance check-in requests.

    Fields:
    - `employee_id` (int, optional): explicit employee to check in
    - `check_in_time` (datetime, optional): explicit check-in time
    """
    employee_id = serializers.IntegerField(required=False)
    check_in_time = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        """Validate incoming check-in payload.

        Currently this method is a passthrough but keeps a hook for future
        validations related to `employee_id` or `check_in_time`.
        """
        return attrs


class NestedShiftSerializer(serializers.ModelSerializer):
    """Nested serializer for shift within session responses."""
    class Meta:
        model = Shift
        fields = [
            "id",
            "name",
            "start_time",
            "end_time",
        ]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    """Model serializer representing an attendance session."""
    shift = NestedShiftSerializer(read_only=True)
    date = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "shift",
            "started_by",
            "started_at",
            "is_active",
            "ended_at",
            "date",
        )
        read_only_fields = (
            "started_by",
            "started_at",
            "ended_at",
            "date",
        )
    
    def get_date(self, obj):
        """Return the date of the session (date of started_at)."""
        return obj.started_at.date() if obj.started_at else None


class AttendanceCheckOutSerializer(serializers.Serializer):
    """Serializer for attendance check-out requests."""
    employee_id = serializers.IntegerField(required=False)


class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer representing an `AttendanceRecord` instance."""
    class Meta:
        model = AttendanceRecord
        fields = ["id", "employee", "employee_shift", "date", "check_in_time", "check_out_time","status", "taken_by", "created_at"]
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
