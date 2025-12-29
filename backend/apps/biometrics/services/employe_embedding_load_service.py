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
        # 1. Get employees assigned to shift
        employee_ids = EmployeeShift.objects.filter(
            shift=shift
        ).values_list("employee_id", flat=True)

        # 2. Get active biometric profiles
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
        Decrypts and deserializes template_data into numpy embedding.
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
