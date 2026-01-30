"""
This file contains unit tests for the  User model.
The tests:
- User creation
- String representation
- Role assignment
- Role-checking helper methods
"""

from django.test import TestCase
from django.contrib.auth import get_user_model

from accounts.models import Role
from accounts.constants import Roles


User = get_user_model()


class UserModelTestCase(TestCase):
    """
    Test suite for the User model.

    Uses Django's TestCase which provides:
    - An isolated test database
    - Automatic cleanup after each test
    """

    def setUp(self):
        """
        Set up initial test data:
            - A user instance
            - Role instances used for role-based tests
        """
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="securepassword123"
        )

        # Set up possible role instances
        self.admin_role = Role.objects.create(name=Roles.ADMIN)
        self.hr_role = Role.objects.create(name=Roles.HR)
        self.manager_role = Role.objects.create(name=Roles.MANAGER)
        self.employee_role = Role.objects.create(name=Roles.EMPLOYEE)

    # ------------------------------------------------------------------
    # Basic Model Behavior Tests
    # ------------------------------------------------------------------

    def test_user_creation(self):
        """
        Test that a user is created successfully with default values.
        """
        self.assertIsNotNone(self.user.id)
        self.assertEqual(self.user.email, "testuser@example.com")
        self.assertTrue(self.user.is_active)
        self.assertFalse(self.user.is_staff)

    def test_user_string_representation(self):
        """
        Test the __str__ representation method of the User model.
        """
        self.assertEqual(str(self.user), "testuser@example.com")

    # ------------------------------------------------------------------
    # Role Relationship Tests
    # ------------------------------------------------------------------

    def test_user_has_no_roles_by_default(self):
        """
        Test that a newly created user has no roles assigned.
        """
        self.assertFalse(self.user.roles.exists())

    def test_assign_role_to_user(self):
        """
        Test that a role can be assigned to a user.
        """
        self.user.roles.add(self.employee_role)

        self.assertTrue(self.user.roles.filter(name=Roles.EMPLOYEE).exists())

    # ------------------------------------------------------------------
    # has_role Method Tests
    # ------------------------------------------------------------------

    def test_has_role_returns_true_when_role_exists(self):
        """
        Test has_role() returns True if the user has the given role.
        """
        self.user.roles.add(self.admin_role)

        self.assertTrue(self.user.has_role(Roles.ADMIN))

    def test_has_role_returns_false_when_role_does_not_exist(self):
        """
        Test has_role() returns False if the user does not have the role.
        """
        self.assertFalse(self.user.has_role(Roles.HR))

    # ------------------------------------------------------------------
    # Role Helper Method Tests
    # ------------------------------------------------------------------

    def test_is_admin(self):
        """
        Test is_admin() returns True only when ADMIN role is assigned.
        """
        self.user.roles.add(self.admin_role)

        self.assertTrue(self.user.is_admin())
        self.assertFalse(self.user.is_hr())

    def test_is_hr(self):
        """
        Test is_hr() returns True only when HR role is assigned.
        """
        self.user.roles.add(self.hr_role)

        self.assertTrue(self.user.is_hr())
        self.assertFalse(self.user.is_admin())

    def test_is_department_manager(self):
        """
        Test is_department_manager() returns True for MANAGER role.
        """
        self.user.roles.add(self.manager_role)

        self.assertTrue(self.user.is_department_manager())

    def test_is_employee(self):
        """
        Test is_employee() returns True for EMPLOYEE role.
        """
        self.user.roles.add(self.employee_role)

        self.assertTrue(self.user.is_employee())

    # ------------------------------------------------------------------
    # Multiple Roles Test
    # ------------------------------------------------------------------

    def test_user_can_have_multiple_roles(self):
        """
        Test that a user can have more than one role.
        """
        self.user.roles.add(self.admin_role, self.hr_role)

        self.assertTrue(self.user.is_admin())
        self.assertTrue(self.user.is_hr())
        self.assertFalse(self.user.is_employee())
