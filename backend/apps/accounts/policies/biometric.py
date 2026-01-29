"""Module backend/apps/accounts/policies/biometric.py

This file contains the policies for the biometric profile management.
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
