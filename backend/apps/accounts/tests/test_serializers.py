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

        self.assertEqual(serializer.data["name"], Roles.ADMIN)
        self.assertIn("id", serializer.data)


class UserSerializerTestCase(TestCase):
    """
    Unit tests for UserSerializer (read-only representation).
    """

    def setUp(self):
        self.role = Role.objects.create(name=Roles.EMPLOYEE)
        self.user = User.objects.create_user(
            employee_code="EMP-100",
            full_name="Serializer User",
            phone_number="+1000000000",
            password="password123",
        )
        self.user.roles.add(self.role)

    def test_user_serializer_fields(self):
        """
        Test that UserSerializer returns expected fields.
        """
        serializer = UserSerializer(self.user)
        data = serializer.data

        self.assertEqual(data["employee_code"], self.user.employee_code)
        self.assertEqual(data["full_name"], self.user.full_name)
        self.assertEqual(data["phone_number"], self.user.phone_number)
        self.assertTrue(data["is_active"])
        self.assertEqual(len(data["roles"]), 1)
        self.assertEqual(data["roles"][0]["name"], Roles.EMPLOYEE)

    def test_user_serializer_partial_update_full_name(self):
        """
        Test that writable fields can be updated via UserSerializer.
        """
        serializer = UserSerializer(
            instance=self.user, data={"full_name": "Updated Name"}, partial=True
        )

        self.assertTrue(serializer.is_valid())
        user = serializer.save()

        self.assertEqual(user.full_name, "Updated Name")


class UserCreateSerializerTestCase(APITestCase):
    """
    Unit tests for UserCreateSerializer.
    """

    def setUp(self):
        self.role = Role.objects.create(name=Roles.MANAGER)

    def test_user_creation_serializer_validates_expected_fields(self):
        """
        Test that UserCreateSerializer accepts manager/employee flow fields.
        """
        payload = {
            "full_name": "New User",
            "phone_number": "+12223334444",
            "roles": [self.role.id],
        }

        serializer = UserCreateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_user_create_serializer_requires_full_name(self):
        """Test that full_name is required for create serializer."""
        payload = {
            "phone_number": "+12223334444",
            "roles": [self.role.id],
        }

        serializer = UserCreateSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("full_name", serializer.errors)

    def test_password_is_write_only(self):
        """
        Test that password is not exposed in serialized output.
        """
        user = User.objects.create_user(
            employee_code="EMP-101",
            full_name="Hidden Password User",
            phone_number="+1999999999",
            password="Secret123",
        )

        output = UserSerializer(user).data
        self.assertNotIn("password", output)


class UserUpdateSerializerTestCase(APITestCase):
    """
    Unit tests for UserUpdateSerializer.
    """

    def setUp(self):
        self.role1 = Role.objects.create(name=Roles.EMPLOYEE)
        self.role2 = Role.objects.create(name=Roles.MANAGER)

        self.user = User.objects.create_user(
            employee_code="EMP-102",
            full_name="Update User",
            phone_number="+1333333333",
            password="password123",
        )
        self.user.roles.add(self.role1)

    def test_user_update_roles(self):
        """
        Test that UserUpdateSerializer updates roles correctly.
        """
        serializer = UserUpdateSerializer(
            instance=self.user, data={"roles": [self.role2.id]}, partial=True
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.assertTrue(self.user.roles.filter(name=Roles.MANAGER).exists())
        self.assertFalse(self.user.roles.filter(name=Roles.EMPLOYEE).exists())

    def test_employee_code_is_read_only(self):
        """
        Test that employee_code cannot be updated via UserUpdateSerializer.
        """
        original_employee_code = self.user.employee_code

        serializer = UserUpdateSerializer(
            instance=self.user, data={"employee_code": "EMP-HACKED"}, partial=True
        )

        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.user.refresh_from_db()

        self.assertEqual(self.user.employee_code, original_employee_code)


class CustomTokenObtainPairSerializerTestCase(APITestCase):
    """
    Unit tests for CustomTokenObtainPairSerializer.
    """

    def setUp(self):
        self.role = Role.objects.create(name=Roles.ADMIN)
        self.user = User.objects.create_user(
            employee_code="EMP-LOGIN",
            full_name="Login User",
            phone_number="+1444444444",
            password="password123",
        )
        self.user.roles.add(self.role)

    def test_token_serializer_valid_credentials(self):
        """
        Test that valid credentials return tokens and user info.
        """
        serializer = CustomTokenObtainPairSerializer(
            data={"employee_code": "EMP-LOGIN", "password": "password123"}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        data = serializer.validated_data

        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertIn("user", data)

        self.assertEqual(data["user"]["employee_code"], self.user.employee_code)
        self.assertIn(Roles.ADMIN, data["user"]["roles"])

    def test_token_serializer_invalid_credentials(self):
        """
        Test that invalid credentials raise a ValidationError
        with a custom message.
        """
        serializer = CustomTokenObtainPairSerializer(
            data={"employee_code": "EMP-LOGIN", "password": "wrongpassword"}
        )

        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)
