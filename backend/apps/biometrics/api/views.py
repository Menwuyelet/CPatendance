"""Module backend/apps/biometrics/api/views.py
Auto-generated module docstring.
"""
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from biometrics.api.serializers import (
        BiometricEnrollmentSerializer,
        BiometricProfileSerializer
)
from biometrics.models import BiometricProfile
from biometrics.services.enrollment_service import (
    BiometricEnrollmentService
)
from accounts.policies.biometric import BiometricPolicy
from .permissions import (
    CanEnrollFace
)
# from employees.models import Employee   # Uncomment this to reduce red lines on .employee
from accounts.models.user import User
from biometrics.services.face_engine import FaceEngine


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
        
        # request.user is a User instance
        user = request.user
        
        # ────────────────────────────────────────────────────────────────
        # CRITICAL FIX: BiometricProfile.employee expects Employee instance,
        # not User. This prevents: ValueError: Cannot query "email": Must be "Employee" instance.
        # Usually Employee model has: user = OneToOneField(User, related_name='employee')
        # ────────────────────────────────────────────────────────────────
        try:
            employee = user.employee
        except AttributeError:
            # If user has no .employee attribute → not linked to Employee model
            return Response(
                {"detail": "Your account is not linked to any employee profile"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Extra safety (in case relation exists but is null)
        if employee is None:
            return Response(
                {"detail": "No employee profile found for this user"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Image required"}, status=400)
        
        # Convert uploaded image to face embedding
        embedding = FaceEngine.image_to_embedding(image.read())
        if embedding is None:
            return Response({"detail": "No face detected"}, status=400)
        
        # print(embedding)   # ← comment this in production (very large vector output)
        
        # Now pass correct Employee instance to service
        service = BiometricEnrollmentService(employee)
        result = service.handle_embedding(embedding)
        
        # Safer access to result keys (prevents KeyError if dict is incomplete)
        return Response(
            {
                "status": "created" if result.get("created", False) else "updated",
                "employee_id": result.get("employee_id", str(employee.id)),
                "biometric_type": "FACE",
            },
            status=201,
        )


# ────────────────────────────────────────────────────────────────
# Old / alternative version (commented out) – you can keep for reference
# It was for admin enrolling any employee by ID (not used now)
# ────────────────────────────────────────────────────────────────
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
        
        # Permission scoping - important for security
        if request.user.is_admin() or request.user.is_hr():
            # Admins and HR see all profiles
            pass
        
        elif request.user.is_employee():
            # Employee sees only own profile
            try:
                qs = qs.filter(employee=request.user.employee)
            except AttributeError:
                # If user has no .employee → return empty list safely
                qs = BiometricProfile.objects.none()
        
        else:
            # Other roles see nothing
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