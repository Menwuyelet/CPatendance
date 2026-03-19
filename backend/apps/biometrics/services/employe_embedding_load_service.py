"""Module backend/apps/biometrics/services/employe_embedding_load_service.py

This file contains the service class used to load all users biometric data for
the given shift.
"""

import time
import numpy as np
from attendance.models import EmployeeShift
from biometrics.models import BiometricProfile
from biometrics.services.encryption_service import decrypt_template
from config.logging import get_logger

logger = get_logger(__name__)


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

        start = time.monotonic()

        logger.info(
            "event=shift_embedding_load_started context=%s",
            {"shift_id": shift.id},
        )

        try:

            employee_ids = list(EmployeeShift.objects.filter(shift=shift).values_list(
                "employee_id", flat=True
            ))

            profiles = list(BiometricProfile.objects.filter(
                employee_id__in=employee_ids,
                biometric_type=BiometricProfile.BiometricType.FACE,
                is_active=True,
            ))

            embeddings = {}

            for profile in profiles:
                embedding = ShiftEmbeddingLoader._extract_embedding(profile)
                embeddings[profile.employee_id] = embedding

            duration = round(time.monotonic() - start, 3)

            logger.info(
                "event=shift_embedding_load_completed status=success context=%s",
                {
                    "shift_id": shift.id,
                    "loaded_embeddings": len(embeddings),
                    "duration": duration,
                },
            )
            return embeddings
        except Exception as exc:
            duration = round(time.monotonic() - start, 3)

            logger.exception(
                "event=shift_embedding_load_failed status=failed context=%s",
                {"shift_id": shift.id, "duration": duration},
            )

            return {}

    @staticmethod
    def _extract_embedding(profile):
        """
        Decrypts and deserializes template_data into numpy embedding using the decrypt_template
        method from the encryption_service file.
        """
        try:
            decrypted = decrypt_template(profile.template_data)

            embedding = np.frombuffer(decrypted, dtype=np.float32).reshape(-1)

            if embedding.shape[0] != 512:
                return None

            return embedding.copy()

        except Exception:
            logger.warning(
                "event=embedding_deserialize_failed context=%s",
                {"employee_id": profile.employee_id},
            )
            return None
