"""Module backend/apps/biometrics/services/enrollment_service.py

This file contains the biometric enrollment service that handles the
creation of biometric profile for the user attaching the given embedding.
"""

import numpy as np
from django.utils import timezone
from biometrics.models import BiometricProfile
from biometrics.services.encryption_service import encrypt_template

from config.logging import get_logger

logger = get_logger(__name__)


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

        logger.info(
            "BIOMETRIC_ENROLLMENT_STARTED | employee_id=%s",
            self.employee.id,
        )

        if not self.employee.is_active:
            logger.warning(
                "BIOMETRIC_ENROLLMENT_DENIED | employee_id=%s | reason=inactive_employee",
                self.employee.id,
            )

            raise ValueError("Inactive employee cannot be enrolled")

        vector = np.asarray(embedding, dtype="float32").tobytes()
        logger.info(
            "BIOMETRIC_ENROLLMENT_VECTOR_READY | employee_id=%s | vector_size=%s",
            self.employee.id,
            len(vector),
        )

        encrypted = encrypt_template(vector)

        profile, created = BiometricProfile.objects.update_or_create(
            employee=self.employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            defaults={
                "template_data": encrypted,
                "is_active": True,
                "last_used": timezone.now(),
            },
        )

        logger.info(
            "BIOMETRIC_ENROLLMENT_SUCCESS | employee_id=%s | created=%s | profile_id=%s",
            self.employee.id,
            created,
            profile.id,
        )

        return {"created": created, "employee_id": self.employee.id}
