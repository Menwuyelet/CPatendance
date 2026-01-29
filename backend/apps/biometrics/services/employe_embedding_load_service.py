"""Module backend/apps/biometrics/services/employe_embedding_load_service.py

This file contains the service class used to load all users biometric data for 
the given shift.
"""

import numpy as np
from attendance.models import EmployeeShift
from biometrics.models import BiometricProfile
from biometrics.services.encryption_service import decrypt_template
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

        employee_ids = EmployeeShift.objects.filter(
            shift=shift
        ).values_list("employee_id", flat=True)

        profiles = BiometricProfile.objects.filter(
            employee_id__in=employee_ids,
            biometric_type=BiometricProfile.BiometricType.FACE,
            is_active=True
        )
 
        embeddings = {}

        for profile in profiles:
            embedding = ShiftEmbeddingLoader._extract_embedding(profile)
            if embedding is not None:
                embeddings[profile.employee.id] = embedding

        return embeddings

    @staticmethod
    def _extract_embedding(profile):

        """
        Decrypts and deserializes template_data into numpy embedding using the decrypt_template
        method from the encryption_service file.
        """
        try:
            decrypted = decrypt_template(profile.template_data)
            embedding = np.frombuffer(
                decrypted,
                dtype=np.float32
            )
            
            if embedding.size == 0:
                return None
            
            return embedding

        except Exception:
            return None
