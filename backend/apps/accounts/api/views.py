"""Module backend/apps/accounts/api/views.py

This file contains the views for the accounts app.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from accounts.models import User
from accounts.constants import Roles
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from accounts.services.user_service import (
    create_user,
    update_user,
    get_users_for_user,
    generate_employee_code,
    generate_password,
)
from accounts.permissions import IsAdmin, IsManagerOrAdmin
from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view that returns user data"""

    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management and self-service endpoints.

    Supports listing, retrieving and updating users. Actions are scoped
    based on the requesting user's role; create is allowed for
    manager/admin, while mutation endpoints remain admin-only.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get_queryset(self):
        """Return the set of users visible to the requesting user."""
        return get_users_for_user(self.request.user)

    def get_permissions(self):
        # Create is allowed for admin/manager with additional role checks in perform_create.
        if self.action == "create":
            self.permission_classes = [IsAuthenticated, IsManagerOrAdmin]
        # Admin-only actions
        elif self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
            "reset_password",
            "delete_user",
        ]:
            self.permission_classes = [IsAuthenticated, IsAdmin]
        # Self-service actions
        elif self.action in ["me", "change_password"]:
            self.permission_classes = [IsAuthenticated]
        # Default read access for managers/admins
        else:
            self.permission_classes = [IsAuthenticated, IsManagerOrAdmin]
        return super().get_permissions()

    def get_serializer_class(self):
        """
        Return an appropriate serializer class based on the action.

        - `create`: `UserCreateSerializer`
        - `update` / `partial_update`: `UserUpdateSerializer`
        - default: `UserSerializer`
        """
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create a new `User` and associated employee when required.

        Validates required employee fields when user roles include an
        employee-type role, then delegates creation to the service layer.
        """
        data = serializer.validated_data
        roles = data.get("roles", [])
        role_names = [role.name for role in roles]
        employee_roles = [Roles.EMPLOYEE, Roles.MANAGER]
        request_user = self.request.user

        is_admin_creator = request_user.is_admin()
        is_manager_creator = (
            request_user.is_department_manager() and not is_admin_creator
        )

        if is_manager_creator:
            if not roles:
                raise PermissionDenied(
                    "Manager can only create users with EMPLOYEE role."
                )

            disallowed_roles = [name for name in role_names if name != Roles.EMPLOYEE]
            if disallowed_roles:
                raise PermissionDenied(
                    "Manager can only create users with EMPLOYEE role; MANAGER/ADMIN are not allowed."
                )

        employee_data = None
        if any(role in role_names for role in employee_roles):
            required_fields = ["full_name", "phone_number"]
            for field in required_fields:
                if field not in data or not data[field]:
                    raise serializers.ValidationError(
                        {field: "This field is required for user creation"}
                    )

            if is_manager_creator:
                manager_employee = getattr(request_user, "employee", None)
                if manager_employee is None or manager_employee.department is None:
                    raise serializers.ValidationError(
                        {
                            "department": "Manager must be linked to an employee profile with a department to create employee users."
                        }
                    )
                employee_data = {"department": manager_employee.department}
            else:
                employee_data = {"department": data.get("department")}

        employee_code = generate_employee_code()
        password = generate_password()

        user = create_user(
            employee_code=employee_code,
            full_name=data["full_name"],
            phone_number=data["phone_number"],
            password=password,
            roles=roles,
            employee_data=employee_data,
        )

        # Enroll face at user creation for employee/manager roles using generated employee_code.
        if any(role in role_names for role in employee_roles):
            from biometrics.services.face_engine import FaceEngine
            from biometrics.services.enrollment_service import (
                BiometricEnrollmentService,
            )

            image = self.request.FILES.get("face_image")
            if not image:
                raise serializers.ValidationError(
                    {"face_image": "This field is required for biometric enrollment."}
                )

            embedding = FaceEngine.image_to_embedding(image.read())
            if embedding is None:
                raise serializers.ValidationError(
                    {"face_image": "No face detected in the uploaded image."}
                )

            enrolled_user = User.objects.get(employee_code=employee_code)
            enrollment_service = BiometricEnrollmentService(enrolled_user)
            enrollment_service.handle_embedding(embedding)

        serializer.instance = user

    @transaction.atomic
    def perform_update(self, serializer):
        """Update an existing user via the service layer using validated data."""
        data = serializer.validated_data
        user = update_user(self.get_object(), **data)
        serializer.instance = user

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Return the serialized current user (convenience endpoint)."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @transaction.atomic
    @action(
        detail=False, methods=["patch", "put"], permission_classes=[IsAuthenticated]
    )
    def change_password(self, request):
        """Allow authenticated users to change their password."""
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        password_confirmation = request.data.get("password_confirmation")

        # Validate required fields
        if not current_password:
            return Response({"error": "Current password is required."}, status=400)

        if not new_password:
            return Response({"error": "New password is required."}, status=400)

        if not password_confirmation:
            return Response({"error": "Password confirmation is required."}, status=400)

        # validate the current password
        if not user.check_password(current_password):
            return Response({"error": "Current password is incorrect."}, status=400)

        # Validate password confirmation
        if new_password != password_confirmation:
            return Response(
                {"error": "New password and confirmation do not match."}, status=400
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response({"message": "Password changed successfully."})

    @transaction.atomic
    @action(
        detail=False,
        methods=["patch", "put"],
        permission_classes=[IsAuthenticated, IsAdmin],
    )
    def reset_password(self, request):
        """
        Used to reset users password.

        only the admin can perform this task.
        """

        user_code = request.data.get("employee_code")

        if not user_code:
            return Response({"error": "Employee code is required."}, status=400)

        try:
            user = User.objects.get(employee_code=user_code)
        except User.DoesNotExist:
            return Response(
                {"error": "User with the provided employee code does not exist."},
                status=404,
            )

        new_password = generate_password()
        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Password reset successfully.", "new_password": new_password},
            status=200,
        )

    @transaction.atomic
    @action(
        detail=False, methods=["delete"], permission_classes=[IsAuthenticated, IsAdmin]
    )
    def delete_user(self, request, *args, **kwargs):
        """
        Implements the deletion of user.

        It uses employee_code as identification method to delete a user. and only admin can do that.
        """
        employee = User.objects.filter(
            employee_code=request.data.get("employee_code")
        ).first()

        if not employee:
            return Response(
                {"error": "User with the provided employee code does not exist."},
                status=404,
            )

        employee.delete()

        return Response({"message": "User deleted successfully."}, status=200)

    def list(self, request, *args, **kwargs):
        """Override list to provide a custom response format."""

        queryset = get_users_for_user(request_user=request.user)
        serializer = self.get_serializer(queryset, many=True)

        return Response({"users": serializer.data})
