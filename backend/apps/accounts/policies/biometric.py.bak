class BiometricPolicy:

    @staticmethod
    def can_manage_profile(user, profile):
        if user.is_admin() or user.is_hr():
            return True
        return False
