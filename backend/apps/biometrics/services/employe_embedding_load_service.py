"""Module backend/apps/biometrics/services/employe_embedding_load_service.py

Auto-generated module docstring.
"""

import numpy as np
from django.utils import timezone

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
        print ("Loading embeddings for shift:", shift)
        # 1. Get employees assigned to shift
        employee_ids = EmployeeShift.objects.filter(
            shift=shift
        ).values_list("employee_id", flat=True)
        print("Employee ids:", employee_ids)
        # 2. Get active biometric profiles
        print("Getting active biometric profiles")
        profiles = BiometricProfile.objects.filter(
            employee_id__in=employee_ids,
            biometric_type=BiometricProfile.BiometricType.FACE,
            is_active=True
        )
 
        print(f"Found {profiles.count()} biometric profiles")

        embeddings = {}

        for profile in profiles:
            print(f"Extracting embedding for profile {profile.id} of employee {profile.employee.id}"
            )
            embedding = ShiftEmbeddingLoader._extract_embedding(profile)
            if embedding is not None:
                embeddings[profile.employee.id] = embedding

        return embeddings

    @staticmethod
    def _extract_embedding(profile):

        """
        Decrypts and deserializes template_data into numpy embedding.
        """
        try:
            print(f"Decrypting template data for profile {profile.id}")
            decrypted = decrypt_template(profile.template_data)
            print("[debug]: Decrypted length:", len(decrypted))

            embedding = np.frombuffer(
                decrypted,
                dtype=np.float32
            )

            if embedding.size == 0:
                return None
            print(f"Extracted embedding of size {embedding.size} for profile {profile.id}")
            return embedding

        except Exception:
            return None
