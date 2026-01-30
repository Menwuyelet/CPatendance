"""
Tests for custom permission classes in the accounts app.

These tests verify ONLY the permission logic itself.
They intentionally mock role-checking utilities so that
the tests remain fast, isolated, and deterministic.
"""

from django.test import TestCase
from unittest.mock import patch
from rest_framework.test import APIRequestFactory

from apps.accounts.permissions.hr_or_manager import IsHRorManager
from apps.accounts.permissions.is_admin import IsAdmin
from apps.accounts.permissions.is_employee import IsEmployee
from apps.accounts.permissions.is_hr import IsHR
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
        # Create a request factory for building DRF requests
        self.factory = APIRequestFactory()

        # Create a fake GET request
        self.request = self.factory.get("/fake-url/")

        # Attach a minimal mock user object to the request
        # We do not use a real User model because permissions
        # only care about attributes / role checks.
        self.request.user = type("User", (), {})()


# =====================================================
# IsAdmin Permission
# =====================================================

class IsAdminPermissionTest(PermissionTestCase):
    """
    Tests for the IsAdmin permission class.
    """

    @patch("apps.accounts.permissions.is_admin.user_has_role")
    def test_admin_allowed(self, mock_user_has_role):
        """
        Admin users should be granted access.

        We mock user_has_role to return True to simulate
        a user that has the ADMIN role.
        """
        mock_user_has_role.return_value = True

        permission = IsAdmin()
        self.assertTrue(permission.has_permission(self.request, None))

    @patch("apps.accounts.permissions.is_admin.user_has_role")
    def test_non_admin_denied(self, mock_user_has_role):
        """
        Non-admin users should be denied access.

        user_has_role returns False, meaning the user
        does not have the ADMIN role.
        """
        mock_user_has_role.return_value = False

        permission = IsAdmin()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsHR Permission
# =====================================================

class IsHRPermissionTest(PermissionTestCase):
    """
    Tests for the IsHR permission class.
    """

    @patch("apps.accounts.permissions.is_hr.user_has_role")
    def test_hr_allowed(self, mock_user_has_role):
        """
        HR users should be granted access.
        """
        mock_user_has_role.return_value = True

        permission = IsHR()
        self.assertTrue(permission.has_permission(self.request, None))

    @patch("apps.accounts.permissions.is_hr.user_has_role")
    def test_non_hr_denied(self, mock_user_has_role):
        """
        Non-HR users should be denied access.
        """
        mock_user_has_role.return_value = False

        permission = IsHR()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsDepartmentManager Permission
# =====================================================

class IsManagerPermissionTest(PermissionTestCase):
    """
    Tests for the IsDepartmentManager permission class.
    """

    @patch("apps.accounts.permissions.is_manager.user_has_role")
    def test_manager_allowed(self, mock_user_has_role):
        """
        Department managers should be granted access.
        """
        mock_user_has_role.return_value = True

        permission = IsDepartmentManager()
        self.assertTrue(permission.has_permission(self.request, None))

    @patch("apps.accounts.permissions.is_manager.user_has_role")
    def test_non_manager_denied(self, mock_user_has_role):
        """
        Non-managers should be denied access.
        """
        mock_user_has_role.return_value = False

        permission = IsDepartmentManager()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsHRorManager Permission
# =====================================================

class IsHRorManagerPermissionTest(PermissionTestCase):
    """
    Tests for the IsHRorManager permission class.

    Access should be granted if the user is EITHER:
    - HR
    - MANAGER
    """

    @patch("apps.accounts.permissions.hr_or_manager.user_has_role")
    def test_hr_allowed(self, mock_user_has_role):
        """
        Users with the HR role should be allowed.
        """
        # Return True only when the role being checked is HR
        mock_user_has_role.side_effect = lambda user, role: role == "HR"

        permission = IsHRorManager()
        self.assertTrue(permission.has_permission(self.request, None))

    @patch("apps.accounts.permissions.hr_or_manager.user_has_role")
    def test_manager_allowed(self, mock_user_has_role):
        """
        Users with the MANAGER role should be allowed.
        """
        mock_user_has_role.side_effect = lambda user, role: role == "MANAGER"

        permission = IsHRorManager()
        self.assertTrue(permission.has_permission(self.request, None))

    @patch("apps.accounts.permissions.hr_or_manager.user_has_role")
    def test_neither_hr_nor_manager_denied(self, mock_user_has_role):
        """
        Users with neither HR nor MANAGER roles should be denied.
        """
        mock_user_has_role.return_value = False

        permission = IsHRorManager()
        self.assertFalse(permission.has_permission(self.request, None))


# =====================================================
# IsEmployee Permission
# =====================================================

class IsEmployeePermissionTest(PermissionTestCase):
    """
    Tests for the IsEmployee permission class.

    This permission checks for the presence of an
    'employee' attribute on the user object.
    """

    def test_employee_allowed(self):
        """
        Users with an employee relation should be allowed.
        """
        # Simulate a user having an employee relationship
        self.request.user.employee = object()

        permission = IsEmployee()
        self.assertTrue(permission.has_permission(self.request, None))

    def test_non_employee_denied(self):
        """
        Users without an employee relation should be denied.
        """
        # Ensure the employee attribute does not exist
        if hasattr(self.request.user, "employee"):
            del self.request.user.employee

        permission = IsEmployee()
        self.assertFalse(permission.has_permission(self.request, None))
