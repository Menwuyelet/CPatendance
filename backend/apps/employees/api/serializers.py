"""Module backend/apps/employees/api/serializers.py

This file contains the serializer classes for the employee app models 
department and employee, 
"""

from rest_framework import serializers
from employees.models import Employee, Department
from accounts.api.serializers import UserSerializer


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for `Department` model exposing basic fields."""
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'manager','is_active']
        read_only_fields = ['id']

class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer for `Employee` providing nested user and department data."""
    user = UserSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        """Serializer `Meta`: maps `Employee` model fields for read output."""
        model = Employee
        fields = ['id', 'user', 'department', 'employee_code', 'full_name', 'photo', 'is_active', 'created_at']


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    """Serializer used when updating an employee's editable fields."""
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        """Serializer `Meta`: maps editable fields for employee updates."""
        model = Employee
        fields = ['department', 'employee_code', 'full_name', 'photo', 'is_active']
        read_only_fields = ['user']
