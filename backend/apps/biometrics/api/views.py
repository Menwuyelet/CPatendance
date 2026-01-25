from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from accounts.models import User
from biometrics.api.serializers import (
        BiometricEnrollmentSerializer,
        BiometricProfileSerializer
)
from biometrics.models import BiometricProfile
from biometrics.services.enrollment_service import (
    BiometricEnrollmentService
)
import numpy as np
import cv2

from biometrics.services.face_app import get_face_app

from accounts.policies.biometric import BiometricPolicy
from .permissions import (
    CanEnrollFace
)
from employees.models import Employee

class FaceEnrollmentViewSet(ViewSet):
    permission_classes = [IsAuthenticated, CanEnrollFace]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request):
        serializer = BiometricEnrollmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = get_object_or_404(
            Employee,
            user__id=request.user.id
        )

        service = BiometricEnrollmentService(employee)

        # If client uploaded an image file (multipart/form-data)
        image_file = request.FILES.get('image')
        img = None
        if image_file is not None:
            try:
                img_bytes = image_file.read()
                nparr = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError("Could not decode image file")
            except Exception as e:
                return Response({"detail": f"Invalid image uploaded: {e}"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Fallback: accept base64 JSON payload { image: '<base64>' }
            b64 = request.data.get('image')
            if not b64:
                return Response({"detail": "Image file or base64 'image' field is required for enrollment."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                if b64.startswith('data:'):
                    b64 = b64.split(',', 1)[1]
                import base64 as _base64
                img_bytes = _base64.b64decode(b64)
                nparr = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError('Could not decode base64 image')
            except Exception as e:
                return Response({"detail": f"Invalid base64 image: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Convert BGR->RGB for insightface
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        app = get_face_app()
        faces = app.get(rgb)
        if not faces:
            return Response({"detail": "No face detected in uploaded image."}, status=status.HTTP_400_BAD_REQUEST)

        embedding = faces[0].embedding.tolist()
        result = service.handle_embedding(embedding)
        if not result.get("success", True):
            return Response(
                {"detail": result.get("reason", "Enrollment failed Try Again")},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            {
                "status": "created" if result["created"] else "updated",
                "employee_id": result["employee_id"],
                "biometric_type": "FACE",
            },
            status=status.HTTP_201_CREATED
        )

# class FaceEnrollmentViewSet(ViewSet):
#     ## done with ai help
#     permission_classes = [IsAuthenticated | CanEnrollFace]
#     parser_classes = [MultiPartParser, FormParser, JSONParser]

#     def create(self, request):
#         serializer = BiometricEnrollmentSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)

#         employee = get_object_or_404(
#             User,
#             id=serializer.validated_data["employee_id"]
#         )

#         profile, created = BiometricEnrollmentService.enroll_face_from_camera(
#             employee=employee
#         )

#         return Response(
#             {
#                 "status": "created" if created else "updated",
#                 "employee_id": str(employee.id),
#                 "biometric_type": "FACE",
#             },
#             status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
#         )

class BiometricProfileViewSet(ViewSet):
    """
    Manage biometric profiles metadata only.

    - List biometric profiles
    - Activate / Deactivate biometric access
    """

    # -------------------------
    # LIST BIOMETRIC PROFILES
    # -------------------------
    def list(self, request):
        """
        List biometric profiles (metadata only).
        """
        qs = BiometricProfile.objects.select_related("employee")

        # Permission scoping
        if request.user.is_admin() or request.user.is_hr():
            pass
        elif request.user.is_employee():
            qs = qs.filter(employee=request.user.employee)
        else:
            qs = qs.none()

        return Response(
            BiometricProfileSerializer(qs, many=True).data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # ACTIVATE / DEACTIVATE
    # -------------------------
    def partial_update(self, request, pk=None):
        """
        Activate or deactivate a biometric profile.
        """
        profile = get_object_or_404(BiometricProfile, id=pk)

        if not BiometricPolicy.can_manage_profile(request.user, profile):
            return Response(
                {"detail": "Not allowed"},
                status=status.HTTP_403_FORBIDDEN
            )

        is_active = request.data.get("is_active")

        if is_active is None:
            return Response(
                {"detail": "`is_active` field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile.is_active = bool(is_active)
        profile.save(update_fields=["is_active", "updated_at"])

        return Response(
            BiometricProfileSerializer(profile).data,
            status=status.HTTP_200_OK
        )

