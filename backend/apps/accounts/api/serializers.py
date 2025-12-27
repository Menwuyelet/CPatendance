from rest_framework import serializers
from accounts.models import User, Role
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom serializer that includes user info in token response"""
    
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except Exception as e:
            # Provide clearer error message
            raise serializers.ValidationError({
                'error': 'Invalid email or password. Please check your credentials and ensure you have registered.',
                'detail': str(e)
            })
        
        # Add user information to response
        user = self.user
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'roles': [role.name for role in user.roles.all()],
        }
        
        return data


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'is_active', 'is_staff', 'roles', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'roles']


class UserUpdateSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True, required=False)

    class Meta:
        model = User
        fields = ['email', 'is_active', 'roles']
        read_only_fields = ['email']