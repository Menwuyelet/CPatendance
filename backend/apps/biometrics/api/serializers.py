from rest_framework import serializers
from biometrics.models import BiometricProfile

class BiometricEnrollmentSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    biometric_type = serializers.ChoiceField(
        choices=BiometricProfile.BiometricType.choices,
        default=BiometricProfile.BiometricType.FACE
    )


class BiometricProfileSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BiometricProfile
        fields = (
            "id",
            "employee",
            "employee_name",
            "biometric_type",
            "is_active",
            "created_at",
            "updated_at",
            "last_used",
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        """Return employee full name if available, fall back to email or str(obj.employee)."""
        emp_profile = getattr(obj.employee, 'employee', None)
        if emp_profile and getattr(emp_profile, 'full_name', None):
            return emp_profile.full_name
        return getattr(obj.employee, 'email', str(obj.employee))

