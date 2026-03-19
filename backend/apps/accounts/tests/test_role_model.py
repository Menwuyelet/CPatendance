"""
Module: backend/apps/accounts/tests/test_role_model.py

This is unit tests for the Role model:
- Role creation
- String representation
- Uniqueness constraint on role name
- Relationship with the User model
"""

from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model

from accounts.models import Role
from accounts.constants import Roles


User = get_user_model()


class RoleModelTestCase(TestCase):
    """
    Test suite for the Role model.

    Uses Django's TestCase to ensure database isolation
    and automatic cleanup after each test.
    """

    def setUp(self):
        """
        Set up test data that will be reused across tests.

        Creates a single role instance.
        """
        self.role = Role.objects.create(name=Roles.ADMIN)

    # ------------------------------------------------------------------
    # Basic Model Tests
    # ------------------------------------------------------------------

    def test_role_creation(self):
        """
        Test that a Role instance is created successfully.
        """
        self.assertIsNotNone(self.role.id)
        self.assertEqual(self.role.name, Roles.ADMIN)

    def test_role_string_representation(self):
        """
        Test the __str__ method returns the role name.
        """
        self.assertEqual(str(self.role), Roles.ADMIN)

    # ------------------------------------------------------------------
    # Constraint Tests
    # ------------------------------------------------------------------

    def test_role_name_must_be_unique(self):
        """
        Test that creating two roles with the same name
        raises an IntegrityError due to the unique constraint.
        """
        with self.assertRaises(IntegrityError):
            Role.objects.create(name=Roles.ADMIN)

    # ------------------------------------------------------------------
    # Relationship Tests
    # ------------------------------------------------------------------

    def test_role_can_be_assigned_to_user(self):
        """
        Test that a role can be assigned to a user
        via the ManyToMany relationship.
        """
        user = User.objects.create_user(
            employee_code="EMP-900",
            full_name="Role Test User",
            phone_number="+1111111111",
            password="strongpassword123",
        )

        user.roles.add(self.role)

        self.assertIn(user, self.role.users.all())
        self.assertTrue(user.roles.filter(name=Roles.ADMIN).exists())
