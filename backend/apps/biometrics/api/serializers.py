from rest_framework import serializers
from biometrics.models import BiometricProfile

class BiometricEnrollmentSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    biometric_type = serializers.ChoiceField(
        choices=BiometricProfile.BiometricType.choices,
        default=BiometricProfile.BiometricType.FACE
    )

class BiometricProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricProfile
        fields = (
            "id",
            "employee",
            "biometric_type",
            "is_active",
            "created_at",
            "updated_at",
            "last_used",
        )
        read_only_fields = fields

