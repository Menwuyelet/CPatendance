from rest_framework import serializers
from attendance.models import AttendanceRecord


class AttendanceCheckInSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(required=False)
    check_in_time = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        # employee_id optional → self check-in
        return attrs


class AttendanceCheckOutSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(required=False)


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = fields
