import json
import numpy as np
from django.conf import settings
from django.utils import timezone

from biometrics.models import BiometricProfile
from employees.models import Employee
from biometrics.engines.face_engine import FaceEmbeddingEngine
from accounts.models import User
from employees.models import Employee
import cv2
import numpy as np
from django.conf import settings
from django.utils import timezone

class BiometricEnrollmentService:
    """
    Camera-based biometric enrollment.
    """

    @staticmethod
    def enroll_face_from_camera(employee: User) -> BiometricProfile:
        ## Calling the ai service to capture image and extract embedding
        if not employee.is_active:
            raise ValueError("Inactive employee cannot be enrolled")
    
        # 1️⃣ Capture image
        # image = BiometricEnrollmentService._capture_single_frame()

        try:
            # 2️⃣ Extract embedding
            # embedding = BiometricEnrollmentService._extract_embedding(image)
            embedding = [1, 2, 4]
            # 3️⃣ Encrypt & store
            emp = employee
            return BiometricEnrollmentService._store_embedding(
                emp, embedding
            )

        finally:
            pass
            # 4️⃣ Explicitly delete image from memory
            # del image

    # -----------------------------
    @staticmethod
    def enroll_face_from_image(employee: User, image) -> BiometricProfile:
        """Enroll a face given an image (numpy array BGR as from OpenCV)."""
        if not employee.is_active:
            raise ValueError("Inactive employee cannot be enrolled")

        # Extract embedding using the configured engine (may be a stub)
        embedding = BiometricEnrollmentService._extract_embedding(image)
        if embedding is None:
            raise ValueError("No face detected in the provided image")

        # Store the encrypted embedding and return profile
        return BiometricEnrollmentService._store_embedding(employee, embedding)

    # -----------------------------
    @staticmethod
    def _capture_single_frame():
        ## ai call for face embedding extraction with _exact_embedding method merging them
        cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            raise RuntimeError("Camera not accessible")

        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise RuntimeError("Failed to capture image")

        return frame

    # -----------------------------
    @staticmethod
    def _extract_embedding(image):
        ## ai call for face embedding extraction
        embedding = FaceEmbeddingEngine.extract(image)

        if embedding is None:
            raise ValueError("No face detected")

        return embedding

    # -----------------------------
    @staticmethod
    def _store_embedding(employee, embedding):
        vector = np.array(embedding, dtype="float32").tobytes()
        encrypted = settings.BIOMETRIC_FERNET.encrypt(vector)

        profile, created = BiometricProfile.objects.update_or_create(
            employee=employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            defaults={
                "template_data": encrypted,
                "is_active": True,
                "last_used": timezone.now(),
            }
        )

        return profile, created
