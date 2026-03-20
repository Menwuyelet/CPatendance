"""Custom authentication backend for custom user model allowing employee code login."""

# authentication_backend.py
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()


class HybridAuthBackend(ModelBackend):
    """
    Allows authentication using employee code instead of email.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """Authenticate a user by employee code with a password."""
        # 'username' is the 'identifier' passed from the login view
        try:
            # Check employee_code
            user = User.objects.get(Q(employee_code__iexact=username))
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
