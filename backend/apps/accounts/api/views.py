from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User
from accounts.constants import Roles
from employees.models import Employee
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from accounts.services.user_service import create_user, update_user, get_users_for_user
from accounts.permissions import IsAdmin
from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view that returns user data"""
    serializer_class = CustomTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_users_for_user(self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdmin]
        return super().get_permissions()

    def perform_create(self, serializer):
        data = serializer.validated_data
        roles = data.get('roles', [])
        role_names = [role.name for role in roles]
        employee_roles = [Roles.EMPLOYEE, Roles.HR, Roles.DEPARTMENT_MANAGER]
        
        employee_data = None
        if any(role in role_names for role in employee_roles):
            required_fields = ['full_name', 'employee_code', 'company']
            for field in required_fields:
                if field not in data or not data[field]:
                    raise serializers.ValidationError({field: 'This field is required for employee roles.'})
            employee_data = {
                'full_name': data['full_name'],
                'employee_code': data['employee_code'],
                'company': data['company'],
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
        data = serializer.validated_data
        user = update_user(self.get_object(), **data)
        serializer.instance = user

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
