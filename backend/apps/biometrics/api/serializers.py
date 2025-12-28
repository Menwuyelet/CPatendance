from rest_framework import serializers
from biometrics.models import BiometricProfile

class BiometricEnrollmentSerializer(serializers.Serializer):
    """
    Used only for biometric enrollment.
    NEVER accepts raw images.
    """
    employee_id = serializers.IntegerField()
    biometric_type = serializers.ChoiceField(
        choices=BiometricProfile.BiometricType.choices,
        default=BiometricProfile.BiometricType.FACE
    )
    embedding = serializers.ListField(
        child=serializers.FloatField(),
        min_length=64,      # depends on model (128, 512, etc.)
        max_length=1024,
        help_text="Numeric embedding vector"
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

