from rest_framework import serializers
from accounts.models import User, Role
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from employees.models import Department

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom serializer that includes user info in token response and accepts email field"""
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add 'email' field as an alternative to 'username'
        from rest_framework import fields as drf_fields
        # Make username not required since we accept email
        if 'username' in self.fields:
            self.fields['username'].required = False
        # Add email field
        self.fields['email'] = drf_fields.CharField(
            label='Email',
            write_only=True,
            required=False,
            allow_blank=False,
        )
    
    def to_internal_value(self, data):
        # Convert 'email' to 'username' before field validation
        if isinstance(data, dict):
            data = data.copy()
            # If email is provided but username is not, use email as username
            if 'email' in data and 'username' not in data:
                data['username'] = data['email']
        return super().to_internal_value(data)
    
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except serializers.ValidationError as ve:
            # Handle validation errors with better messages
            if hasattr(ve, 'detail'):
                if isinstance(ve.detail, dict):
                    # Extract error message
                    error_msg = 'Invalid email or password. Please check your credentials.'
                    if 'non_field_errors' in ve.detail:
                        non_field_errors = ve.detail['non_field_errors']
                        if isinstance(non_field_errors, list) and len(non_field_errors) > 0:
                            error_msg = str(non_field_errors[0])
                        elif isinstance(non_field_errors, str):
                            error_msg = non_field_errors
                    elif 'username' in ve.detail or 'email' in ve.detail:
                        field_errors = ve.detail.get('username') or ve.detail.get('email')
                        if isinstance(field_errors, list) and len(field_errors) > 0:
                            error_msg = str(field_errors[0])
                    raise serializers.ValidationError({
                        'error': error_msg,
                        'detail': ve.detail
                    })
            raise ve
        except Exception as e:
            # Provide clearer error message for other exceptions
            error_msg = str(e)
            if 'No active account found' in error_msg or 'authentication' in error_msg.lower() or 'credentials' in error_msg.lower():
                error_msg = 'Invalid email or password. Please check your credentials and ensure you have registered.'
            raise serializers.ValidationError({
                'error': error_msg,
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
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'is_active', 'is_staff', 'roles', 'full_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        """Get full_name from related Employee if exists"""
        if hasattr(obj, 'employee'):
            return obj.employee.full_name
        return None


class UserProfileUpdateSerializer(serializers.Serializer):
    """Serializer for updating user profile via /me/ endpoint"""
    full_name = serializers.CharField(max_length=255, required=False)

    def update(self, instance, validated_data):
        """Update user profile - updates employee full_name if employee exists"""
        full_name = validated_data.get('full_name')
        
        if full_name and hasattr(instance, 'employee'):
            instance.employee.full_name = full_name
            instance.employee.save()
        
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True)
    full_name = serializers.CharField(required=False)
    employee_code = serializers.CharField(required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False)

    class Meta:
        model = User
        fields = ['email', 'password', 'roles', 'full_name', 'employee_code', 'department']


class UserUpdateSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True, required=False)

    class Meta:
        model = User
        fields = ['email', 'is_active', 'roles']
        read_only_fields = ['email']