from django.test import TestCase

from accounts.constants import Roles
from accounts.models import Role, User
from biometrics.models import BiometricProfile
from employees.models import Department, Employee


class BiometricProfileModelTest(TestCase):
    """Tests for the BiometricProfile model."""

    @classmethod
    def setUpTestData(cls):
        cls.emp_role = Role.objects.create(name=Roles.EMPLOYEE)

        cls.user = User.objects.create_user(
            employee_code="EMP-BIO",
            full_name="Bio User",
            phone_number="+455555555",
            password="pass123",
        )
        cls.user.roles.add(cls.emp_role)

        cls.department = Department.objects.create(name="Ops", code="OPS01")
        cls.employee = Employee.objects.create(user=cls.user, department=cls.department)

        cls.template_data = b"fake_biometric_template"

    def test_create_biometric_profile(self):
        profile = BiometricProfile.objects.create(
            employee=self.user,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=self.template_data,
        )

        self.assertEqual(profile.employee, self.user)
        self.assertEqual(profile.biometric_type, "FACE")
        self.assertTrue(profile.is_active)
        self.assertEqual(profile.template_data, self.template_data)
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)

    def test_unique_constraint_per_employee_and_type(self):
        BiometricProfile.objects.create(
            employee=self.user,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=self.template_data,
        )

        from django.db.utils import IntegrityError

        with self.assertRaises(IntegrityError):
            BiometricProfile.objects.create(
                employee=self.user,
                biometric_type=BiometricProfile.BiometricType.FACE,
                template_data=self.template_data,
            )

    def test_str_method_returns_readable_string(self):
        profile = BiometricProfile.objects.create(
            employee=self.user,
            biometric_type=BiometricProfile.BiometricType.FINGERPRINT,
            template_data=self.template_data,
        )

        str_repr = str(profile)
        self.assertIn(self.user.employee_code, str_repr)
        self.assertIn("Fingerprint", str_repr)
