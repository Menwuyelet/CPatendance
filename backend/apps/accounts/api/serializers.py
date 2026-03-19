"""Module backend/apps/accounts/api/serializers.py

This file contains the serializers for the accounts app.
"""

from rest_framework import serializers
from accounts.models import User, Role
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from employees.models import Department


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom serializer that includes user info in token response.

    This serializer extends SimpleJWT's `TokenObtainPairSerializer` and
    augments the validated token response with a minimal `user` object
    containing `id`, `employee_code` and `roles`.
    """

    def validate(self, attrs):
        """Validate credentials and return token data with user info.

        Inputs:
        - `attrs` (dict): serializer input data (employee_code/username, password)

        Returns:
        - dict: token pair and embedded `user` information.
        """
        try:
            data = super().validate(attrs)
        except Exception as e:
            # Provide clearer error message
            raise serializers.ValidationError(
                {
                    "error": "Invalid employee code or password. Please check your credentials and ensure you have registered.",
                    "detail": str(e),
                }
            )

        # Add user information to response
        user = self.user
        data["user"] = {
            "id": str(user.id),
            "employee_code": user.employee_code,
            "roles": [role.name for role in user.roles.all()],
        }

        return data


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for `Role` model exposing identifier and name."""

    class Meta:
        model = Role
        fields = ["id", "name"]


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for `User` model used for read operations.

    Exposes basic user properties and nested `roles` for client consumption.
    """

    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        """Serializer `Meta`: maps model and output fields for `UserSerializer`."""

        model = User
        fields = [
            "id",
            "employee_code",
            "full_name",
            "phone_number",
            "is_active",
            "is_staff",
            "roles",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer used when creating new users.

    Handles related foreign keys required during user creation.
    """

    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True)
    full_name = serializers.CharField(required=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False
    )

    class Meta:
        """Serializer `Meta`: maps model and input fields for user creation."""

        model = User
        fields = [
            "employee_code",
            "full_name",
            "phone_number",
            "password",
            "roles",
            "department",
        ]
        read_only_fields = ["employee_code", "password"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer used for updating limited user attributes.

    Restricts writable fields to allow safe partial updates from clients.
    """

    roles = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), many=True, required=False
    )

    class Meta:
        """Serializer `Meta`: defines editable fields for updates."""

        model = User
        fields = ["employee_code", "is_active", "roles"]
        read_only_fields = ["employee_code"]
