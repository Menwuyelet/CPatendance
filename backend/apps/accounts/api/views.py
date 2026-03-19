"""Module backend/apps/accounts/api/views.py

This file contains the views for the accounts app.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
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
    based on the requesting user's role; creation and mutation endpoints
    are restricted to administrators by `get_permissions`.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get_queryset(self):
        """Return the set of users visible to the requesting user."""
        return get_users_for_user(self.request.user)

    def get_permissions(self):
        # Admin-only actions
        if self.action in [
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

        employee_data = None
        if any(role in role_names for role in employee_roles):
            required_fields = ["full_name", "phone_number"]
            for field in required_fields:
                if field not in data or not data[field]:
                    raise serializers.ValidationError(
                        {field: "This field is required for user creation"}
                    )
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

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated, IsManagerOrAdmin],
    )
    def list(self, request, *args, **kwargs):
        """Override list to provide a custom response format."""

        queryset = get_users_for_user(request_user=request.user)
        serializer = self.get_serializer(queryset, many=True)

        return Response({"users": serializer.data})
