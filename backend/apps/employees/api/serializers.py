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
    is_biometric_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ['id', 'user', 'department', 'employee_code', 'full_name', 'is_active', 'created_at', 'is_biometric_enrolled']

    def get_is_biometric_enrolled(self, obj):
        """Check if employee has active biometric profile"""
        try:
            # Check if biometrics app is installed and has BiometricProfile model
            from biometrics.models import BiometricProfile
            return BiometricProfile.objects.filter(
                employee=obj,
                biometric_type='FACE',
                is_active=True
            ).exists()
        except (ImportError, Exception):
            # If biometrics app is not installed, return False
            return False


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)

    class Meta:
        model = Employee
        fields = ['department', 'employee_code', 'full_name', 'is_active']
        read_only_fields = ['user']