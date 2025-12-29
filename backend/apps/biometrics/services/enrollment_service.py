# import numpy as np
# from django.conf import settings
# from django.utils import timezone
# from biometrics.models import BiometricProfile
# from accounts.models import User
# import numpy as np
# from django.conf import settings
# from django.utils import timezone
# from biometrics.services.encryption_service import encrypt_template
# class BiometricEnrollmentService:
#     """
#     Camera-based biometric enrollment.
#     """

#     @staticmethod
#     def enroll_face_from_camera(employee: User) -> BiometricProfile:
#         ## Calling the ai service to capture image and extract embedding
#         if not employee.is_active:
#             raise ValueError("Inactive employee cannot be enrolled")
    
#         # 1️⃣ Capture image
#         # image = BiometricEnrollmentService._capture_single_frame()

#         try:
#             # 2️⃣ Extract embedding
#             # embedding = BiometricEnrollmentService._extract_embedding(image)
#             embedding = [1, 2, 4]
#             # 3️⃣ Encrypt & store
#             emp = employee
#             return BiometricEnrollmentService._store_embedding(
#                 emp, embedding
#             )

#         finally:
#             pass
#             # 4️⃣ Explicitly delete image from memory
#             # del image

#     # -----------------------------
#     @staticmethod
#     def _store_embedding(employee, embedding):
#         vector = np.array(embedding, dtype="float32").tobytes()
#         encrypted = encrypt_template(vector)

#         profile, created = BiometricProfile.objects.update_or_create(
#             employee=employee,
#             biometric_type=BiometricProfile.BiometricType.FACE,
#             defaults={
#                 "template_data": encrypted,
#                 "is_active": True,
#                 "last_used": timezone.now(),
#             }
#         )

#         return profile, created


import numpy as np
from django.utils import timezone
from biometrics.models import BiometricProfile
from biometrics.services.crypto_service import encrypt_template


class BiometricEnrollmentService:
    """
    Stores biometric embeddings.
    """

    def __init__(self, employee):
        self.employee = employee

    def handle_embedding(self, embedding):
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
