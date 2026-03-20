"""Biometrics API endpoint coverage for list, partial update, and update flows."""

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from accounts.constants import Roles
from accounts.models import Role, User
from employees.models import Department, Employee
from biometrics.models import BiometricProfile


class BiometricsAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Roles
        cls.role_admin, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.role_manager, _ = Role.objects.get_or_create(name=Roles.MANAGER)
        cls.role_employee, _ = Role.objects.get_or_create(name=Roles.EMPLOYEE)

        # Departments
        cls.dept_main = Department.objects.create(name="Engineering", code="ENG01")
        cls.dept_other = Department.objects.create(name="HR", code="HR01")

        # Admin
        cls.admin_password = "AdminPass123!"
        cls.admin = User.objects.create_user(
            employee_code="HAC-3001",
            full_name="Admin User",
            phone_number="+300",
            password=cls.admin_password,
        )
        cls.admin.roles.add(cls.role_admin)

        # Manager (dept_main)
        cls.manager_password = "ManagerPass123!"
        cls.manager = User.objects.create_user(
            employee_code="HAC-3002",
            full_name="Manager User",
            phone_number="+301",
            password=cls.manager_password,
        )
        cls.manager.roles.add(cls.role_manager)
        cls.manager_emp = Employee.objects.create(user=cls.manager, department=cls.dept_main)
        cls.dept_main.manager = cls.manager
        cls.dept_main.save()

        # Employees
        cls.emp_main = User.objects.create_user(
            employee_code="HAC-3003",
            full_name="Main Employee",
            phone_number="+302",
            password="EmployeePass123!",
        )
        cls.emp_main.roles.add(cls.role_employee)
        cls.emp_main_profile = Employee.objects.create(user=cls.emp_main, department=cls.dept_main)

        cls.emp_other = User.objects.create_user(
            employee_code="HAC-3004",
            full_name="Other Employee",
            phone_number="+303",
            password="OtherPass123!",
        )
        cls.emp_other.roles.add(cls.role_employee)
        cls.emp_other_profile = Employee.objects.create(user=cls.emp_other, department=cls.dept_other)

        # Biometric profiles
        cls.bio_main = BiometricProfile.objects.create(
            employee=cls.emp_main,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=b"fake-template",
            is_active=True,
        )
        cls.bio_other = BiometricProfile.objects.create(
            employee=cls.emp_other,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=b"fake-template",
            is_active=True,
        )

    def login(self, code, password):
        res = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": code, "password": password},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.data["access"]

    def auth(self, token):
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _fake_image(self):
        return SimpleUploadedFile("face.jpg", b"fake-bytes", content_type="image/jpeg")

    # Listing
    def test_admin_list_profiles_sees_all(self):
        token = self.login("HAC-3001", self.admin_password)
        res = self.client.get(reverse("biometric-profiles-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data]
        self.assertIn(self.bio_main.id, ids)
        self.assertIn(self.bio_other.id, ids)

    def test_manager_list_profiles_scoped_to_department(self):
        token = self.login("HAC-3002", self.manager_password)
        res = self.client.get(reverse("biometric-profiles-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data]
        self.assertIn(self.bio_main.id, ids)
        self.assertNotIn(self.bio_other.id, ids)

    # Partial update
    def test_admin_can_deactivate_profile(self):
        token = self.login("HAC-3001", self.admin_password)
        res = self.client.patch(
            reverse("biometric-profiles-detail", args=[self.bio_main.id]),
            {"is_active": False},
            format="json",
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.bio_main.refresh_from_db()
        self.assertFalse(self.bio_main.is_active)

    def test_manager_cannot_manage_other_department_profile(self):
        token = self.login("HAC-3002", self.manager_password)
        res = self.client.patch(
            reverse("biometric-profiles-detail", args=[self.bio_other.id]),
            {"is_active": False},
            format="json",
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_partial_update_missing_is_active(self):
        token = self.login("HAC-3001", self.admin_password)
        res = self.client.patch(
            reverse("biometric-profiles-detail", args=[self.bio_main.id]),
            {},
            format="json",
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # Full update with image
    @patch(
        "biometrics.services.enrollment_service.BiometricEnrollmentService.handle_embedding"
    )
    @patch(
        "biometrics.services.face_engine.FaceEngine.image_to_embedding",
        return_value=[0.1, 0.2, 0.3],
    )
    def test_admin_update_with_image_reenrolls(self, mock_embed, mock_handle):
        token = self.login("HAC-3001", self.admin_password)
        res = self.client.put(
            reverse("biometric-profiles-detail", args=[self.bio_main.id]),
            {"is_active": True, "image": self._fake_image()},
            format="multipart",
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_embed.assert_called()
        mock_handle.assert_called()

    @patch(
        "biometrics.services.face_engine.FaceEngine.image_to_embedding",
        return_value=None,
    )
    def test_update_with_image_no_face_detected(self, mock_embed):
        token = self.login("HAC-3001", self.admin_password)
        res = self.client.put(
            reverse("biometric-profiles-detail", args=[self.bio_main.id]),
            {"image": self._fake_image()},
            format="multipart",
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
