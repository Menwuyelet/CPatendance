"""Module backend/apps/accounts/api/views.py

This file contains the views for the accounts app.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import serializers
from accounts.models import User
from accounts.constants import Roles
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from accounts.services.user_service import create_user, update_user, get_users_for_user
from accounts.permissions import IsAdmin, IsHRManagerOrAdmin
from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view that returns user data"""
    serializer_class = CustomTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management and self-service endpoints.

    Supports listing, retrieving and updating users. Actions are scoped
    based on the requesting user's role; creation and mutation endpoints
    are restricted to administrators by `get_permissions`.
    """
    queryset = User.objects.select_related('employee').prefetch_related('roles').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsHRManagerOrAdmin]

    def get_queryset(self):
        """Return the set of users visible to the requesting user."""
        return get_users_for_user(self.request.user).select_related('employee').prefetch_related('roles')

    def get_serializer_class(self):
        """Return an appropriate serializer class based on the action.

        - `create`: `UserCreateSerializer`
        - `update` / `partial_update`: `UserUpdateSerializer`
        - default: `UserSerializer`
        """
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        """Adjust permission classes for mutating actions.

        For create/update/destroy operations only authenticated admins are
        permitted; read operations use the default class-level permissions.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsAdmin]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Create a new `User` and associated employee when required.

        Validates required employee fields when user roles include an
        employee-type role, then delegates creation to the service layer.
        """
        data = serializer.validated_data
        roles = data.get('roles', [])
        role_names = [role.name for role in roles]
        employee_roles = [Roles.EMPLOYEE, Roles.HR, Roles.MANAGER]
        
        employee_data = None
        if any(role in role_names for role in employee_roles):
            required_fields = ['full_name', 'employee_code']
            for field in required_fields:
                if field not in data or not data[field]:
                    raise serializers.ValidationError({field: 'This field is required for employee roles.'})
            employee_data = {
                'full_name': data['full_name'],
                'employee_code': data['employee_code'],
                'department': data.get('department')
            }
        
        user = create_user(
            email=data['email'],
            password=data['password'],
            roles=roles,
            employee_data=employee_data
        )
        serializer.instance = user

    def perform_update(self, serializer):
        """Update an existing user via the service layer using validated data."""
        data = serializer.validated_data
        user = update_user(self.get_object(), **data)
        serializer.instance = user

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Return the serialized current user (convenience endpoint)."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Allow authenticated users to change their password."""
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        password_confirmation = request.data.get('password_confirmation')

        # Validate required fields
        if not current_password:
            return Response(
                {'error': 'Current password is required.'},
                status=400
            )
        
        if not new_password:
            return Response(
                {'error': 'New password is required.'},
                status=400
            )
        
        if not password_confirmation:
            return Response(
                {'error': 'Password confirmation is required.'},
                status=400
            )

        # Validate current password
        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=400
            )

        # Validate password confirmation
        if new_password != password_confirmation:
            return Response(
                {'error': 'New password and confirmation do not match.'},
                status=400
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password changed successfully.'})
