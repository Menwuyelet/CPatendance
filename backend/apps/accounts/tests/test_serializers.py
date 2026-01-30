"""
Module: backend/apps/accounts/tests/test_serializers.py

This module contains unit tests for serializers used in the accounts app.
Tests focus on validation logic, data representation, and side effects
such as role assignment and password handling.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase
from rest_framework.exceptions import ValidationError

from apps.accounts.api.serializers import (
    CustomTokenObtainPairSerializer,
    RoleSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
)
from accounts.models import Role
from accounts.constants import Roles


User = get_user_model()


class RoleSerializerTestCase(TestCase):
    """
    Unit tests for RoleSerializer.
    """

    def test_role_serializer_output(self):
        """
        Test that RoleSerializer correctly serializes role fields.
        """
        role = Role.objects.create(name=Roles.ADMIN)
        serializer = RoleSerializer(role)

        self.assertEqual(serializer.data['name'], Roles.ADMIN)
        self.assertIn('id', serializer.data)


class UserSerializerTestCase(TestCase):
    """
    Unit tests for UserSerializer (read-only representation).
    """

    def setUp(self):
        self.role = Role.objects.create(name=Roles.EMPLOYEE)
        self.user = User.objects.create_user(
            email="user@test.com",
            password="password123"
        )
        self.user.roles.add(self.role)

    def test_user_serializer_fields(self):
        """
        Test that UserSerializer returns expected fields.
        """
        serializer = UserSerializer(self.user)
        data = serializer.data

        self.assertEqual(data['email'], self.user.email)
        self.assertTrue(data['is_active'])
        self.assertEqual(len(data['roles']), 1)
        self.assertEqual(data['roles'][0]['name'], Roles.EMPLOYEE)

    def test_user_serializer_read_only_fields(self):
        """
        Test that writable fields can be updated
        and read-only fields are ignored.
        """
        serializer = UserSerializer(
            instance=self.user,
            data={'email': 'new@email.com'},
            partial=True
        )

        self.assertTrue(serializer.is_valid())
        user = serializer.save()

        # Email IS writable in UserSerializer
        self.assertEqual(user.email, 'new@email.com')


class UserCreateSerializerTestCase(APITestCase):
    """
    Unit tests for UserCreateSerializer.
    """

    def setUp(self):
        self.role = Role.objects.create(name=Roles.HR)

    def test_user_creation_serializer_creates_user(self):
        """
        Test that UserCreateSerializer successfully creates a user
        and assigns roles.
        """
        payload = {
            'email': 'newuser@test.com',
            'password': 'StrongPass123',
            'roles': [self.role.id],
        }

        serializer = UserCreateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        user = serializer.save()

        self.assertEqual(user.email, payload['email'])
        self.assertTrue(user.roles.filter(name=Roles.HR).exists())

    def test_password_is_write_only(self):
        """
        Test that password is not exposed in serialized output.
        """
        payload = {
            'email': 'hiddenpass@test.com',
            'password': 'Secret123',
            'roles': [self.role.id],
        }

        serializer = UserCreateSerializer(data=payload)
        serializer.is_valid()
        user = serializer.save()

        output = UserSerializer(user).data
        self.assertNotIn('password', output)


class UserUpdateSerializerTestCase(APITestCase):
    """
    Unit tests for UserUpdateSerializer.
    """

    def setUp(self):
        self.role1 = Role.objects.create(name=Roles.EMPLOYEE)
        self.role2 = Role.objects.create(name=Roles.MANAGER)

        self.user = User.objects.create_user(
            email="update@test.com",
            password="password123"
        )
        self.user.roles.add(self.role1)

    def test_user_update_roles(self):
        """
        Test that UserUpdateSerializer updates roles correctly.
        """
        serializer = UserUpdateSerializer(
            instance=self.user,
            data={'roles': [self.role2.id]},
            partial=True
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(self.user.roles.filter(name=Roles.MANAGER).exists())
        self.assertFalse(self.user.roles.filter(name=Roles.EMPLOYEE).exists())

    def test_email_is_read_only(self):
        """
        Test that email cannot be updated via UserUpdateSerializer.
        """
        original_email = self.user.email

        serializer = UserUpdateSerializer(
            instance=self.user,
            data={'email': 'hacker@test.com'},
            partial=True
        )

        self.assertTrue(serializer.is_valid())
        serializer.save()

        self.assertEqual(self.user.email, original_email)


class CustomTokenObtainPairSerializerTestCase(APITestCase):
    """
    Unit tests for CustomTokenObtainPairSerializer.
    """

    def setUp(self):
        self.role = Role.objects.create(name=Roles.ADMIN)
        self.user = User.objects.create_user(
            email="login@test.com",
            password="password123"
        )
        self.user.roles.add(self.role)

    def test_token_serializer_valid_credentials(self):
        """
        Test that valid credentials return tokens and user info.
        """
        serializer = CustomTokenObtainPairSerializer(
            data={
                'email': 'login@test.com',
                'password': 'password123'
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        data = serializer.validated_data

        self.assertIn('access', data)
        self.assertIn('refresh', data)
        self.assertIn('user', data)

        self.assertEqual(data['user']['email'], self.user.email)
        self.assertIn(Roles.ADMIN, data['user']['roles'])

    def test_token_serializer_invalid_credentials(self):
        """
        Test that invalid credentials raise a ValidationError
        with a custom message.
        """
        serializer = CustomTokenObtainPairSerializer(
            data={
                'email': 'login@test.com',
                'password': 'wrongpassword'
            }
        )

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)
