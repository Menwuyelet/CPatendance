"""Module backend/apps/biometrics/api/views.py

This file contains the views for the biometrics app.
"""

from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from biometrics.models import BiometricProfile
from biometrics.services.enrollment_service import BiometricEnrollmentService
from accounts.policies.biometric import BiometricPolicy
from accounts.permissions import IsManagerOrAdmin
from biometrics.services.face_engine import FaceEngine
from biometrics.api.serializers import (
    BiometricProfileSerializer,
)


class BiometricProfileViewSet(ViewSet):
    """
    Manage biometric profiles metadata only.
    - List biometric profiles
    - Activate / Deactivate biometric access
    """

    serializer_class = BiometricProfileSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def list(self, request):
        """
        List biometric profiles (metadata only).
        """
        qs = BiometricProfile.objects.select_related("employee")

        if request.user.is_admin():
            # Admin can see all biometric profiles.
            pass

        elif request.user.is_department_manager():
            # A manager can only see biometric profiles of employees in their department.
            try:
                qs = qs.filter(
                    employee__employee__department=request.user.employee.department
                )
            except AttributeError:
                qs = BiometricProfile.objects.none()

        else:
            qs = qs.none()

        return Response(
            BiometricProfileSerializer(qs, many=True).data, status=status.HTTP_200_OK
        )

    @transaction.atomic
    def partial_update(self, request, pk=None):
        """
        Activate or deactivate a biometric profile.
        """
        profile = get_object_or_404(BiometricProfile, id=pk)

        if not BiometricPolicy.can_manage_profile(request.user, profile):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        is_active = request.data.get("is_active")
        if is_active is None:
            return Response(
                {"detail": "`is_active` field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.is_active = bool(is_active)
        profile.save(update_fields=["is_active", "updated_at"])

        return Response(
            BiometricProfileSerializer(profile).data, status=status.HTTP_200_OK
        )

    @transaction.atomic
    def update(self, request, pk=None):
        """
        Update biometric profile metadata and optionally re-enroll face template.

        Supported payload fields:
        - is_active: bool (optional)
        - image: file (optional, triggers face re-enrollment)
        """
        profile = get_object_or_404(BiometricProfile, id=pk)

        if not BiometricPolicy.can_manage_profile(request.user, profile):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        image = request.FILES.get("image")
        is_active = request.data.get("is_active")

        if image is None and is_active is None:
            return Response(
                {"detail": "Provide at least one of `image` or `is_active`."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image is not None:
            embedding = FaceEngine.image_to_embedding(image.read())
            if embedding is None:
                return Response(
                    {"detail": "No face detected"}, status=status.HTTP_400_BAD_REQUEST
                )
            service = BiometricEnrollmentService(profile.employee)
            service.handle_embedding(embedding)

        if is_active is not None:
            profile.is_active = bool(is_active)
            profile.save(update_fields=["is_active", "updated_at"])

        profile.refresh_from_db()
        return Response(
            BiometricProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )
