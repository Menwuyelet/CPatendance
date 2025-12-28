import cv2
import numpy as np
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from employees.models import Employee
from biometrics.api.serializers import (
        BiometricEnrollmentSerializer,
        BiometricProfileSerializer
)
from biometrics.models import BiometricProfile
from biometrics.services.face_service import (
    enroll_face,
)
from accounts.policies.biometric import BiometricPolicy
from .permissions import (
    CanEnrollFace
)

class FaceEnrollmentViewSet(ViewSet):
    permission_classes = [IsAuthenticated | CanEnrollFace]
    def create(self, request):
        serializer = BiometricEnrollmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = get_object_or_404(
            Employee,
            id=serializer.validated_data["employee_id"]
        )

        image = cv2.imdecode(
            np.frombuffer(
                serializer.validated_data["image"].read(),
                np.uint8
            ),
            cv2.IMREAD_COLOR
        )

        enroll_face(employee, image)
        return Response({"status": "enrolled"}, status=201)


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

