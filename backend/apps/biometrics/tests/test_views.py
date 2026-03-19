from unittest.mock import patch

import numpy as np
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.constants import Roles
from accounts.models import Role, User
from biometrics.models import BiometricProfile
from employees.models import Department, Employee


class BiometricProfileViewSetTests(TestCase):
    """Tests for BiometricProfileViewSet."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name=Roles.ADMIN)
        cls.emp_role = Role.objects.create(name=Roles.EMPLOYEE)
        cls.mgr_role = Role.objects.create(name=Roles.MANAGER)

        cls.department_a = Department.objects.create(name="Engineering", code="ENG01")
        cls.department_b = Department.objects.create(name="Sales", code="SAL01")

        cls.admin_user = User.objects.create_user(
            employee_code="EMP-ADMIN",
            full_name="Admin",
            phone_number="+311111111",
            password="pass123",
        )
        cls.admin_user.roles.add(cls.admin_role)

        cls.mgr_user = User.objects.create_user(
            employee_code="EMP-MGR",
            full_name="Manager",
            phone_number="+322222222",
            password="pass123",
        )
        cls.mgr_user.roles.add(cls.mgr_role)
        cls.mgr_employee = Employee.objects.create(
            user=cls.mgr_user, department=cls.department_a
        )

        cls.emp_user_same_dept = User.objects.create_user(
            employee_code="EMP-SAME",
            full_name="Emp Same",
            phone_number="+333333333",
            password="pass123",
        )
        cls.emp_user_same_dept.roles.add(cls.emp_role)
        cls.emp_same_dept = Employee.objects.create(
            user=cls.emp_user_same_dept,
            department=cls.department_a,
        )

        cls.emp_user_other_dept = User.objects.create_user(
            employee_code="EMP-OTHER",
            full_name="Emp Other",
            phone_number="+344444444",
            password="pass123",
        )
        cls.emp_user_other_dept.roles.add(cls.emp_role)
        cls.emp_other_dept = Employee.objects.create(
            user=cls.emp_user_other_dept,
            department=cls.department_b,
        )

        cls.profile_same = BiometricProfile.objects.create(
            employee=cls.emp_user_same_dept,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=b"template_same",
        )
        cls.profile_other = BiometricProfile.objects.create(
            employee=cls.emp_user_other_dept,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=b"template_other",
        )

        cls.list_url = reverse("biometric-profiles-list")
        cls.update_url_same = reverse(
            "biometric-profiles-detail", args=[cls.profile_same.id]
        )
        cls.update_url_other = reverse(
            "biometric-profiles-detail", args=[cls.profile_other.id]
        )

    def setUp(self):
        self.client = APIClient()

    def _face_file(self):
        return SimpleUploadedFile(
            "face.jpg", b"fake_image_bytes", content_type="image/jpeg"
        )

    def test_admin_can_list_all_profiles(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_manager_can_list_only_department_profiles(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        employee_codes = {item["employee_code"] for item in response.data}
        self.assertEqual(employee_codes, {"EMP-SAME"})

    def test_employee_cannot_list_profiles(self):
        self.client.force_authenticate(user=self.emp_user_same_dept)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_patch_is_active_same_department(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.patch(
            self.update_url_same, {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.profile_same.refresh_from_db()
        self.assertFalse(self.profile_same.is_active)

    def test_manager_cannot_patch_other_department(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.patch(
            self.update_url_other, {"is_active": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("biometrics.api.views.FaceEngine.image_to_embedding")
    def test_manager_can_put_reenroll_face_same_department(self, mock_embedding):
        mock_embedding.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)

        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.put(
            self.update_url_same,
            {"image": self._face_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["employee_code"], "EMP-SAME")
        self.assertEqual(response.data["biometric_type"], "FACE")

    def test_put_requires_image_or_is_active(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.put(self.update_url_same, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
