"""Module backend/apps/biometrics/services/employe_embedding_load_service.py

This file contains the service class used to load all users biometric data for
the given shift.
"""

import logging
import numpy as np
from attendance.models import EmployeeShift
from biometrics.models import BiometricProfile
from biometrics.services.encryption_service import decrypt_template

logger = logging.getLogger(__name__)


class ShiftEmbeddingLoader:
    """
    Loads biometric embeddings for all employees assigned to a shift.
    """

    @staticmethod
    def load_for_shift(shift, date=None):
        """
        Returns:
            dict[int, np.ndarray] -> { employee_id: embedding }
        """

        logger.info(
            "SHIFT_EMBEDDING_LOAD_STARTED | shift_id=%s",
            getattr(shift, "id", None),
        )

        employee_ids = EmployeeShift.objects.filter(shift=shift).values_list(
            "employee_id", flat=True
        )

        employee_ids = list(employee_ids)

        logger.debug(
            "SHIFT_EMBEDDING_EMPLOYEES_FOUND | shift_id=%s | count=%s",
            getattr(shift, "id", None),
            len(employee_ids),
        )

        if not employee_ids:
            logger.warning(
                "SHIFT_EMBEDDING_NO_EMPLOYEES | shift_id=%s",
                getattr(shift, "id", None),
            )
            return {}

        profiles = BiometricProfile.objects.filter(
            employee_id__in=employee_ids,
            biometric_type=BiometricProfile.BiometricType.FACE,
            is_active=True,
        )

        logger.debug(
            "SHIFT_EMBEDDING_PROFILES_FOUND | shift_id=%s | count=%s",
            getattr(shift, "id", None),
            profiles.count(),
        )

        embeddings = {}

        for profile in profiles:
            embedding = ShiftEmbeddingLoader._extract_embedding(profile)

            if embedding is None:
                logger.warning(
                    "SHIFT_EMBEDDING_INVALID_PROFILE | employee_id=%s | profile_id=%s",
                    profile.employee_id,
                    profile.id,
                )
                continue

            embeddings[profile.employee_id] = embedding

        logger.info(
            "SHIFT_EMBEDDING_LOAD_COMPLETED | shift_id=%s | loaded=%s",
            getattr(shift, "id", None),
            len(embeddings),
        )
        return embeddings

    @staticmethod
    def _extract_embedding(profile):
        """
        Decrypts and deserializes template_data into numpy embedding using the decrypt_template
        method from the encryption_service file.
        """
        try:
            decrypted = decrypt_template(profile.template_data)
            embedding = np.frombuffer(decrypted, dtype=np.float32)
            embedding = embedding.reshape(-1)

            if embedding.shape[0] != 512:
                logger.error(
                    "EMBEDDING_SHAPE_INVALID | employee_id=%s | size=%s",
                    profile.employee_id,
                    embedding.shape[0],
                )
                return None

            return embedding.copy()

        except Exception:
            logger.exception(
                "EMBEDDING_EXTRACTION_FAILED | employee_id=%s | profile_id=%s",
                profile.employee_id,
                profile.id,
            )
            return None
