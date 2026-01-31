from django.test import TestCase
from accounts.models import User, Role
from accounts.constants import Roles
from employees.models import Employee
from biometrics.models import BiometricProfile


class BiometricProfileModelTest(TestCase):
    """Tests for the BiometricProfile model."""

    @classmethod
    def setUpTestData(cls):
        # Create HR user
        cls.hr_role = Role.objects.create(name=Roles.HR)
        cls.hr_user = User.objects.create_user(email="hr@test.com", password="pass123")
        cls.hr_user.roles.add(cls.hr_role)

        # Create employee linked to the HR user
        cls.employee = Employee.objects.create(user=cls.hr_user)

        # Example template data
        cls.template_data = b"fake_biometric_template"

    def test_create_biometric_profile(self):
        """Can create a biometric profile for an employee."""
        profile = BiometricProfile.objects.create(
            employee=self.employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=self.template_data
        )

        self.assertEqual(profile.employee, self.employee)
        self.assertEqual(profile.biometric_type, "FACE")
        self.assertTrue(profile.is_active)
        self.assertEqual(profile.template_data, self.template_data)
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)

    def test_unique_constraint_per_employee_and_type(self):
        """Cannot create duplicate biometric type for same employee."""
        BiometricProfile.objects.create(
            employee=self.employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=self.template_data
        )

        from django.db.utils import IntegrityError
        with self.assertRaises(IntegrityError):
            BiometricProfile.objects.create(
                employee=self.employee,
                biometric_type=BiometricProfile.BiometricType.FACE,
                template_data=self.template_data
            )

    def test_str_method_returns_readable_string(self):
        """__str__ should include employee and type display."""
        profile = BiometricProfile.objects.create(
            employee=self.employee,
            biometric_type=BiometricProfile.BiometricType.FINGERPRINT,
            template_data=self.template_data
        )

        str_repr = str(profile)
        self.assertIn(str(self.employee), str_repr)
        self.assertIn("Fingerprint", str_repr)
