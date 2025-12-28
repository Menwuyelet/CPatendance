# import cv2
# import numpy as np
# from django.conf import settings
# from django.utils.module_loading import import_string

# from biometrics.models import BiometricProfile
# from attendance.services.attendance_service import mark_attendance
# from django.db import transaction

# ENGINE_CLASS = import_string(
#     settings.FACE_ENGINE
# )
# engine = ENGINE_CLASS()


# def enroll_face(employee, image):
#     embedding = engine.extract_embedding(image)
#     if embedding is None:
#         raise ValueError("No face detected")

#     embedding = embedding.astype(np.float32)

#     BiometricProfile.objects.update_or_create(
#         employee=employee,
#         biometric_type=BiometricProfile.BiometricType.FACE,
#         defaults={
#             "template_data": embedding.tobytes(),
#             "is_active": True
#         }
#     )

# @transaction.atomic
# def recognize_and_mark_attendance(image, system_user):
#     embedding = engine.extract_embedding(image)
#     if embedding is None:
#         return None

#     profiles = BiometricProfile.objects.filter(
#         biometric_type=BiometricProfile.BiometricType.FACE,
#         is_active=True
#     )

#     stored = {
#         p.employee_id: np.frombuffer(p.template_data, dtype=np.float32)
#         for p in profiles
#     }

#     employee_id = engine.match(embedding, stored)
#     if not employee_id:
#         return None

#     from accounts.models import Employee
#     employee = Employee.objects.get(id=employee_id)

#     return mark_attendance(employee, system_user)
