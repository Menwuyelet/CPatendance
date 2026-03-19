"""Tests for custom permission classes in the accounts app."""

from django.test import TestCase
from unittest.mock import Mock
from rest_framework.test import APIRequestFactory

from apps.accounts.permissions.admin_or_manager import IsManagerOrAdmin
from apps.accounts.permissions.is_admin import IsAdmin
from apps.accounts.permissions.is_employee import IsEmployee
from apps.accounts.permissions.is_manager import IsDepartmentManager


class PermissionTestCase(TestCase):
    """
    Base test case for permission tests.

    This class sets up:
    - A DRF request factory
    - A fake request object
    - A lightweight mock user object

    Other permission test classes inherit from this
    to avoid repeating setup code.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.request = self.factory.get("/fake-url/")
        self.request.user = Mock()

        # Default all role checks to False unless a test overrides them.
        self.request.user.is_admin.return_value = False
        self.request.user.is_department_manager.return_value = False
        self.request.user.is_employee.return_value = False


# =====================================================
# IsAdmin Permission
# =====================================================


class IsAdminPermissionTest(PermissionTestCase):
    """
    Tests for the IsAdmin permission class.
    """

    def test_admin_allowed(self):
        """Admin users should be granted access."""
        self.request.user.is_admin.return_value = True

        permission = IsAdmin()
        self.assertTrue(permission.has_permission(self.request, None))

    def test_non_admin_denied(self):
        """Non-admin users should be denied access."""
        self.request.user.is_admin.return_value = False

        permission = IsAdmin()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsDepartmentManager Permission
# =====================================================


class IsManagerPermissionTest(PermissionTestCase):
    """
    Tests for the IsDepartmentManager permission class.
    """

    def test_manager_allowed(self):
        """Department managers should be granted access."""
        self.request.user.is_department_manager.return_value = True

        permission = IsDepartmentManager()
        self.assertTrue(permission.has_permission(self.request, None))

    def test_non_manager_denied(self):
        """Non-managers should be denied access."""
        self.request.user.is_department_manager.return_value = False

        permission = IsDepartmentManager()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsManagerOrAdmin Permission
# =====================================================


class IsManagerOrAdminPermissionTest(PermissionTestCase):
    """Tests for the IsManagerOrAdmin permission class."""

    def test_admin_allowed(self):
        """Users with admin role should be allowed."""
        self.request.user.is_admin.return_value = True

        permission = IsManagerOrAdmin()
        self.assertTrue(permission.has_permission(self.request, None))

    def test_manager_allowed(self):
        """Users with manager role should be allowed."""
        self.request.user.is_department_manager.return_value = True

        permission = IsManagerOrAdmin()
        self.assertTrue(permission.has_permission(self.request, None))

    def test_neither_manager_nor_admin_denied(self):
        """Users with neither manager nor admin roles should be denied."""
        permission = IsManagerOrAdmin()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsEmployee Permission
# =====================================================


class IsEmployeePermissionTest(PermissionTestCase):
    """
    Tests for the IsEmployee permission class.

    This permission checks user.is_employee().
    """

    def test_employee_allowed(self):
        """Employees should be allowed."""
        self.request.user.is_employee.return_value = True

        permission = IsEmployee()
        self.assertTrue(permission.has_permission(self.request, None))

    def test_non_employee_denied(self):
        """Non-employees should be denied."""
        self.request.user.is_employee.return_value = False

        permission = IsEmployee()
        self.assertFalse(permission.has_permission(self.request, None))
