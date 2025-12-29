from time import timezone
from rest_framework import serializers
from attendance.models import AttendanceRecord
from attendance.models import AttendanceSession
from attendance.models import EmployeeShift
from attendance.models import Shift

class AttendanceCheckInSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(required=False)
    check_in_time = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        # employee_id optional → self check-in
        return attrs


class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = (
            "id",
            "shift",
            "started_by",
            "started_at",
            "is_active",
            "ended_at",
        )
        read_only_fields = (
            "started_by",
            "started_at",
            "ednded_at",
        )

class AttendanceCheckOutSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(required=False)


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = fields



class EmployeeShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeShift
        fields = [
            "id",
            "employee",
            "shift",
        ]

class ShiftSerializer(serializers.ModelSerializer):
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