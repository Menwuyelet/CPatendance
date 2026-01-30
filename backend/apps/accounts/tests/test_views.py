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
            email="login@test.com",
            password="password123"
        )

        self.url = reverse('token_obtain_pair')

    def test_login_success(self):
        """
        Valid credentials should return tokens and user info.
        """
        response = self.client.post(self.url, {
            'email': 'login@test.com',
            'password': 'password123'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    def test_login_failure(self):
        """
        Invalid credentials should return validation error.
        """
        response = self.client.post(self.url, {
            'email': 'login@test.com',
            'password': 'wrongpass'
        })

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
            email="admin@test.com",
            password="adminpass"
        )
        self.admin.roles.add(self.admin_role)

        self.employee = User.objects.create_user(
            email="employee@test.com",
            password="employeepass"
        )
        self.employee.roles.add(self.employee_role)

        self.list_url = reverse('user-list')
        self.me_url = reverse('user-me')

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
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)

    def test_non_admin_cannot_create_user(self):
        """
        Non-admin users should not be able to create users.
        """
        self.client.force_authenticate(user=self.employee)

        payload = {
            'email': 'new@test.com',
            'password': 'password123',
            'roles': [self.employee_role.id],
            'full_name': 'Test User',
            'employee_code': 'EMP001',
        }

        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_create_user(self):
        """
        Admin users can create new users.
        """
        self.client.force_authenticate(user=self.admin)

        payload = {
            'email': 'new@test.com',
            'password': 'password123',
            'roles': [self.employee_role.id],
            'full_name': 'New User',
            'employee_code': 'EMP002',
        }

        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            User.objects.filter(email='new@test.com').exists()
        )
    
    def test_admin_can_update_user(self):
        """
        Admin users can update user attributes.
        """
        self.client.force_authenticate(user=self.admin)

        url = reverse('user-detail', args=[self.employee.id])

        response = self.client.patch(url, {
            'is_active': False
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

    def test_non_admin_cannot_update_user(self):
        """
        Non-admin users cannot update users.
        """
        self.client.force_authenticate(user=self.employee)

        url = reverse('user-detail', args=[self.employee.id])

        response = self.client.patch(url, {
            'is_active': False
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_me_endpoint_returns_current_user(self):
        """
        Authenticated users can retrieve their own data.
        """
        self.client.force_authenticate(user=self.employee)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.employee.email)
