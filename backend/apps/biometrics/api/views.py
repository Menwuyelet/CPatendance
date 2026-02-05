"""Module backend/apps/biometrics/api/views.py

This file contains the views for the biometrics app.
"""
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from biometrics.models import BiometricProfile
from biometrics.services.enrollment_service import BiometricEnrollmentService
from accounts.policies.biometric import BiometricPolicy
from .permissions import CanEnrollFace
from biometrics.services.face_engine import FaceEngine
from biometrics.api.serializers import (
        BiometricEnrollmentSerializer,
        BiometricProfileSerializer
)

class FaceEnrollmentViewSet(ViewSet):
    """Endpoint for enrolling or updating employee face templates.
    Accepts an image upload and converts it to an embedding using the
    face engine, then delegates persistence to the enrollment service.
    """
    permission_classes = [IsAuthenticated, CanEnrollFace]
    
    def create(self, request):
        """Handle a POST request with an image to enroll a face.
        Expects `image` in `request.FILES`. Returns status indicating
        whether a new biometric profile was created or an existing one
        updated.
        """
        serializer = BiometricEnrollmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        
        try:
            employee = user.employee
        except AttributeError:
            return Response(
                {"detail": "Your account is not linked to any employee profile"},
                status=status.HTTP_403_FORBIDDEN
            )

        if employee is None:
            return Response(
                {"detail": "No employee profile found for this user"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Image required"}, status=400)
        
        """
        This extracts the embedding of the image from the image sent from the client using external 
        helper function from FaceEngine module.
        """
        embedding = FaceEngine.image_to_embedding(image.read())
        if embedding is None:
            return Response({"detail": "No face detected"}, status=400)
        
        """
        This uses enrollment service class from enrollment service module to attach the given embedding 
        to the user and uses handle_embedding method to perform the assignment.
        """
        service = BiometricEnrollmentService(employee)
        result = service.handle_embedding(embedding)
        
        return Response(
            {
                "status": "created" if result.get("created", False) else "updated",
                "employee_id": result.get("employee_id", str(employee.id)),
                "biometric_type": "FACE",
            },
            status=201,
        )

class BiometricProfileViewSet(ViewSet):
    """
    Manage biometric profiles metadata only.
    - List biometric profiles
    - Activate / Deactivate biometric access
    """
    serializer_class = BiometricProfileSerializer
    
    def list(self, request):
        """
        List biometric profiles (metadata only).
        """
        qs = BiometricProfile.objects.select_related('employee', 'employee__user').all()
        
        if request.user.is_admin() or request.user.is_hr() or request.user.is_department_manager():
            """
            Admin, HR, and Manager can see all the users biometric data.
            """
            pass
        
        elif request.user.is_employee():
            """
            A user can only see its own biometric data.
            """
            try:
                qs = qs.filter(employee=request.user.employee)
            except AttributeError:
                """ 
                If user has no .employee → return empty list safely
                """
                qs = BiometricProfile.objects.none()
    
        else:
            """
            Return empty list for other cases.
            """
            qs = qs.none()
        
        return Response(
            BiometricProfileSerializer(qs, many=True).data,
            status=status.HTTP_200_OK
        )
    

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
