from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User
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
        user = create_user(
            email=data['email'],
            password=data['password'],
            roles=data.get('roles', [])
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
