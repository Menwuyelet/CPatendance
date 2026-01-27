"""Module backend/apps/accounts/policies/biometric.py

Auto-generated module docstring.
"""

class BiometricPolicy:
    """Policies for biometric profile management.

    Determines whether a user may manage (create/update/delete) biometric
    profiles for employees.
    """

    @staticmethod
    def can_manage_profile(user, profile):
        """Return True when `user` is allowed to manage the given biometric profile."""
        if user.is_admin() or user.is_hr():
            return True
        return False
