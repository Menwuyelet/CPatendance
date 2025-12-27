from rest_framework import serializers
from employees.models import Employee, Department
from accounts.models import User
from accounts.api.serializers import UserSerializer


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'manager','is_active']
        read_only_fields = ['id']

class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'user', 'department', 'employee_code', 'full_name', 'is_active', 'created_at']


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)

    class Meta:
        model = Employee
        fields = ['department', 'employee_code', 'full_name', 'is_active']
        read_only_fields = ['user']