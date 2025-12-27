from rest_framework import serializers
from attendance.models import AttendanceRecord


class AttendanceCreateSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    check_in_time = serializers.DateTimeField(required=False)


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"
