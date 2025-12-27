from rest_framework import serializers
from employees.models import Employee, Company, Department
from accounts.models import User
from accounts.api.serializers import UserSerializer


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'timezone', 'created_at']


class DepartmentSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'company']


class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    company = CompanySerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'user', 'company', 'department', 'employee_code', 'full_name', 'is_active', 'created_at']


class EmployeeCreateSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)

    class Meta:
        model = Employee
        fields = ['user', 'company', 'department', 'employee_code', 'full_name']


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)

    class Meta:
        model = Employee
        fields = ['department', 'employee_code', 'full_name', 'is_active']
        read_only_fields = ['user', 'company']