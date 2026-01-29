"""Module backend/apps/biometrics/services/enrollment_service.py

This file contains the biometric enrollment service that handles the 
creation of biometric profile for the user attaching the given embedding.
"""

import numpy as np
from django.utils import timezone
from biometrics.models import BiometricProfile
from biometrics.services.encryption_service import encrypt_template  

class BiometricEnrollmentService:
    """
    Stores biometric embeddings.
    """

    def __init__(self, employee):
        """Create an enrollment service bound to the given employee.

        The service instance uses `self.employee` to persist biometric
        templates for that employee.
        """
        self.employee = employee

    def handle_embedding(self, embedding):
        """Encrypt and store `embedding` for the configured employee.

        Inputs:
        - `embedding` (iterable/array-like): numeric embedding vector

        Returns a dict with keys `created` (bool) and `employee_id`.
        """
        if not self.employee.is_active:
            raise ValueError("Inactive employee cannot be enrolled")

        vector = np.asarray(embedding, dtype="float32").tobytes()
        encrypted = encrypt_template(vector)

        profile, created = BiometricProfile.objects.update_or_create(
            employee=self.employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            defaults={
                "template_data": encrypted,
                "is_active": True,
                "last_used": timezone.now(),
            }
        )

        return {
            "created": created,
            "employee_id": self.employee.id
        }
