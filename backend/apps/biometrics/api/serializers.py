"""Module backend/apps/biometrics/api/serializers.py

This file contains serializers for the biometrics app.
"""

from rest_framework import serializers
from biometrics.models import BiometricProfile

class BiometricEnrollmentSerializer(serializers.Serializer):
    """Serializer for enrollment requests.

    Validates the requested biometric type and any transient input
    required to enroll a biometric template for an employee.
    """
    biometric_type = serializers.ChoiceField(
        choices=BiometricProfile.BiometricType.choices,
        default=BiometricProfile.BiometricType.FACE
    )


class BiometricProfileSerializer(serializers.ModelSerializer):
    """Serializer exposing biometric profile metadata to clients.

    Read-only fields include `last_used` and timestamps; relationship
    fields are presented as identifiers or computed names.
    """
    employee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        """Serializer `Meta`: maps model fields and read-only behavior."""
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
        if obj.employee and getattr(obj.employee, 'full_name', None):
            return obj.employee.full_name
        if obj.employee:
            return getattr(obj.employee, 'email', str(obj.employee))
        return str(obj.employee)

