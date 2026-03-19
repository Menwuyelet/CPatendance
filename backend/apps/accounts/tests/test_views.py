"""
Module: backend/apps/accounts/api/tests/test_views.py

API tests for the accounts views.
"""

from django.urls import reverse
from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import Role
from accounts.constants import Roles


User = get_user_model()


class CustomTokenObtainPairViewTestCase(APITestCase):
    """
    Tests for CustomTokenObtainPairView.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            employee_code="EMP-LOGIN",
            full_name="Login User",
            phone_number="+1555555555",
            password="password123",
        )

        self.url = reverse("token_obtain_pair")

    def test_login_success(self):
        """
        Valid credentials should return tokens and user info.
        """
        response = self.client.post(
            self.url, {"employee_code": "EMP-LOGIN", "password": "password123"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

    def test_login_failure(self):
        """
        Invalid credentials should return validation error.
        """
        response = self.client.post(
            self.url, {"employee_code": "EMP-LOGIN", "password": "wrongpass"}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserViewSetTestCase(APITestCase):
    """
    Tests for UserViewSet.
    """

    def setUp(self):
        # Roles
        self.admin_role = Role.objects.create(name=Roles.ADMIN)
        self.employee_role = Role.objects.create(name=Roles.EMPLOYEE)

        # Users
        self.admin = User.objects.create_user(
            employee_code="EMP-ADMIN",
            full_name="Admin User",
            phone_number="+1666666666",
            password="adminpass",
        )
        self.admin.roles.add(self.admin_role)

        self.employee = User.objects.create_user(
            employee_code="EMP-EMP",
            full_name="Employee User",
            phone_number="+1777777777",
            password="employeepass",
        )
        self.employee.roles.add(self.employee_role)

        self.list_url = reverse("user-list")
        self.me_url = reverse("user-me")

    # def test_unauthenticated_access_denied(self):
    #     """
    #     Unauthenticated users should not access user list.
    #     """
    #     response = self.client.get(self.list_url)

    #     self.assertIn(
    #         response.status_code,
    #         [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    #     )

    def test_admin_can_list_users(self):
        """
        Admin users can list users.
        """
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("users", response.data)
        self.assertIsInstance(response.data["users"], list)

    def test_non_admin_cannot_create_user(self):
        """
        Non-admin users should not be able to create users.
        """
        self.client.force_authenticate(user=self.employee)

        payload = {
            "roles": [self.employee_role.id],
            "full_name": "Test User",
            "phone_number": "+1888888888",
        }

        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user(self):
        """
        Admin users can create new users.
        """
        self.client.force_authenticate(user=self.admin)

        payload = {
            "roles": [self.employee_role.id],
            "full_name": "New User",
            "phone_number": "+1999999999",
        }

        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(User.objects.count(), 3)

    def test_admin_can_update_user(self):
        """
        Admin users can update user attributes.
        """
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-detail", args=[self.employee.id])

        response = self.client.patch(url, {"is_active": False})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

    def test_non_admin_cannot_update_user(self):
        """
        Non-admin users cannot update users.
        """
        self.client.force_authenticate(user=self.employee)

        url = reverse("user-detail", args=[self.employee.id])

        response = self.client.patch(url, {"is_active": False})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_endpoint_returns_current_user(self):
        """
        Authenticated users can retrieve their own data.
        """
        self.client.force_authenticate(user=self.employee)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["employee_code"], self.employee.employee_code)
