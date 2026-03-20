"""Module backend/apps/biometrics/api/serializers.py

This file contains serializers for the biometrics app.
"""

from rest_framework import serializers
from biometrics.models import BiometricProfile


class BiometricEnrollmentSerializer(serializers.Serializer):
    """
    Serializer for enrollment requests.

    Validates the requested biometric type and any transient input
    required to enroll a biometric template for an employee.
    """

    biometric_type = serializers.ChoiceField(
        choices=BiometricProfile.BiometricType.choices,
        default=BiometricProfile.BiometricType.FACE,
    )
    employee_code = serializers.CharField(required=True)
    image = serializers.ImageField(required=True)


class BiometricProfileSerializer(serializers.ModelSerializer):
    """
    Serializer exposing biometric profile metadata to clients.

    Read-only fields include `last_used` and timestamps; relationship
    fields are presented as identifiers or computed names.
    """

    employee_code = serializers.SerializerMethodField(read_only=True)
    employee_full_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        """Serializer `Meta`: maps model fields and read-only behavior."""

        model = BiometricProfile
        fields = (
            "id",
            "employee_code",
            "employee_full_name",
            "biometric_type",
            "is_active",
            "created_at",
            "updated_at",
            "last_used",
        )
        read_only_fields = fields

    def get_employee_code(self, obj):
        """Return employee code for the related user."""
        return getattr(obj.employee, "employee_code", None)

    def get_employee_full_name(self, obj):
        """Return full name for the related user."""
        return getattr(obj.employee, "full_name", None)
