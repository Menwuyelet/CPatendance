"""
API tests for accounts views.
"""

from unittest.mock import patch

import numpy as np
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import Roles
from accounts.models import Role
from employees.models import Department, Employee


User = get_user_model()


class CustomTokenObtainPairViewTestCase(APITestCase):
    """Tests for CustomTokenObtainPairView."""

    def setUp(self):
        self.user = User.objects.create_user(
            employee_code="EMP-LOGIN",
            full_name="Login User",
            phone_number="+1555555555",
            password="password123",
        )
        self.url = reverse("token_obtain_pair")

    def test_login_success(self):
        response = self.client.post(
            self.url, {"employee_code": "EMP-LOGIN", "password": "password123"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

    def test_login_failure(self):
        response = self.client.post(
            self.url, {"employee_code": "EMP-LOGIN", "password": "wrongpass"}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserViewSetTestCase(APITestCase):
    """Tests for UserViewSet."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name=Roles.ADMIN)
        cls.manager_role = Role.objects.create(name=Roles.MANAGER)
        cls.employee_role = Role.objects.create(name=Roles.EMPLOYEE)

        cls.dept_a = Department.objects.create(name="Engineering", code="ENG01")
        cls.dept_b = Department.objects.create(name="Finance", code="FIN01")

        cls.admin = User.objects.create_user(
            employee_code="EMP-ADMIN",
            full_name="Admin User",
            phone_number="+1666666666",
            password="adminpass",
        )
        cls.admin.roles.add(cls.admin_role)

        cls.manager = User.objects.create_user(
            employee_code="EMP-MGR",
            full_name="Manager User",
            phone_number="+1666667777",
            password="managerpass",
        )
        cls.manager.roles.add(cls.manager_role)
        cls.manager_employee = Employee.objects.create(
            user=cls.manager,
            department=cls.dept_a,
        )

        cls.employee = User.objects.create_user(
            employee_code="EMP-EMP",
            full_name="Employee User",
            phone_number="+1777777777",
            password="employeepass",
        )
        cls.employee.roles.add(cls.employee_role)
        cls.employee_profile = Employee.objects.create(
            user=cls.employee,
            department=cls.dept_b,
        )

    def setUp(self):
        self.list_url = reverse("user-list")
        self.me_url = reverse("user-me")

    def _face_file(self):
        return SimpleUploadedFile(
            "face.jpg", b"fake_image_bytes", content_type="image/jpeg"
        )

    def test_admin_can_list_users(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("users", response.data)
        self.assertIsInstance(response.data["users"], list)

    def test_employee_cannot_create_user(self):
        self.client.force_authenticate(user=self.employee)

        payload = {
            "roles": [self.employee_role.id],
            "full_name": "Test User",
            "phone_number": "+1888888888",
        }

        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("biometrics.services.face_engine.FaceEngine.image_to_embedding")
    def test_admin_can_create_employee_user_with_face_image(self, mock_embedding):
        mock_embedding.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)
        self.client.force_authenticate(user=self.admin)

        payload = {
            "roles": [self.employee_role.id],
            "full_name": "New Employee",
            "phone_number": "+1999999999",
            "department": str(self.dept_b.id),
            "face_image": self._face_file(),
        }

        response = self.client.post(self.list_url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 4)

    @patch("biometrics.services.face_engine.FaceEngine.image_to_embedding")
    def test_manager_can_create_employee_only(self, mock_embedding):
        mock_embedding.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)
        self.client.force_authenticate(user=self.manager)

        payload = {
            "roles": [self.employee_role.id],
            "full_name": "Dept Employee",
            "phone_number": "+1990000000",
            "department": str(self.dept_b.id),
            "face_image": self._face_file(),
        }

        response = self.client.post(self.list_url, payload, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_user = User.objects.get(id=response.data["id"])
        created_employee = created_user.employee
        self.assertEqual(
            created_employee.department_id, self.manager.employee.department_id
        )

    def test_manager_cannot_create_manager_user(self):
        self.client.force_authenticate(user=self.manager)

        payload = {
            "roles": [self.manager_role.id],
            "full_name": "Illegal Manager",
            "phone_number": "+1991111111",
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_user(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-detail", args=[self.employee.id])

        response = self.client.patch(url, {"is_active": False})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

    def test_non_admin_cannot_update_user(self):
        self.client.force_authenticate(user=self.employee)

        url = reverse("user-detail", args=[self.manager.id])

        response = self.client.patch(url, {"is_active": False})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_endpoint_returns_current_user(self):
        self.client.force_authenticate(user=self.employee)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["employee_code"], self.employee.employee_code)
