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
        if user.is_admin():
            return True

        if not user.is_department_manager():
            return False

        user_employee = getattr(user, "employee", None)
        profile_employee = getattr(profile.employee, "employee", None)
        if not user_employee or not profile_employee:
            return False

        return user_employee.department_id == profile_employee.department_id
