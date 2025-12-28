import json
import numpy as np
from django.conf import settings
from django.utils import timezone

from biometrics.models import BiometricProfile
from employees.models import Employee


class BiometricEnrollmentService:
    """
    Encrypts and stores biometric embeddings securely.
    """

    @staticmethod
    def enroll_face(employee: Employee, embedding: list[float]) -> BiometricProfile:
        if not employee.is_active:
            raise ValueError("Inactive employee cannot be enrolled")

        # Convert to compact bytes
        vector = np.array(embedding, dtype="float32").tobytes()

        encrypted = settings.BIOMETRIC_FERNET.encrypt(vector)

        profile, _ = BiometricProfile.objects.update_or_create(
            employee=employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            defaults={
                "template_data": encrypted,
                "is_active": True,
                "last_used": timezone.now()
            }
        )

        return profile
