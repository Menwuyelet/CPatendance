from rest_framework import serializers
from attendance.models import AttendanceRecord
from attendance.models import AttendanceSession


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
            "closed_at",
        )
        read_only_fields = (
            "started_by",
            "started_at",
            "closed_at",
        )

class AttendanceCheckOutSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(required=False)


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = fields
