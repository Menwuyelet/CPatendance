"""Tests for policy classes in the accounts app."""

from django.test import TestCase
from unittest.mock import Mock

from apps.accounts.policies.attendance import AttendancePolicy
from apps.accounts.policies.leave import LeavePolicy
from apps.accounts.policies.biometric import BiometricPolicy
from apps.accounts.policies.common import BasePolicy


def make_user(is_admin=False, is_manager=False, is_employee=False, department_id=None):
    """Create a lightweight mock user with role helper methods."""
    user = Mock()
    user.id = id(user)
    user.is_admin.return_value = is_admin
    user.is_department_manager.return_value = is_manager
    user.is_employee.return_value = is_employee

    if department_id is not None:
        user.employee = Mock()
        user.employee.department_id = department_id

    return user


def make_employee(department_id):
    """
    Create a lightweight mock employee.
    """
    employee = Mock()
    employee.id = id(employee)
    employee.department_id = department_id
    return employee


class BasePolicyTestCase(TestCase):
    """Tests for BasePolicy helper methods."""

    def test_same_department_true(self):
        user = make_user(Roles.MANAGER, department_id=1)
        employee = make_employee(department_id=1)

        self.assertTrue(BasePolicy.same_department(user, employee))

    def test_same_department_false(self):
        user = make_user(Roles.MANAGER, department_id=1)
        employee = make_employee(department_id=2)

        self.assertFalse(BasePolicy.same_department(user, employee))


class AttendancePolicyTestCase(TestCase):
    """Tests for AttendancePolicy rules."""

    def test_manager_can_take_attendance_same_department(self):
        user = make_user(is_manager=True, department_id=1)
        employee = make_employee(department_id=1)

        self.assertTrue(AttendancePolicy.can_take_attendance(user, employee))

    def test_manager_cannot_take_attendance_other_department(self):
        user = make_user(is_manager=True, department_id=1)
        employee = make_employee(department_id=2)

        self.assertFalse(AttendancePolicy.can_take_attendance(user, employee))

    def test_admin_cannot_take_attendance_without_manager_role(self):
        user = make_user(is_admin=True)
        employee = make_employee(department_id=1)

        self.assertFalse(AttendancePolicy.can_take_attendance(user, employee))

    def test_view_attendance_admin(self):
        user = make_user(is_admin=True)
        employee = make_employee(department_id=1)

        self.assertTrue(AttendancePolicy.can_view_attendance(user, employee))

    def test_view_attendance_manager_same_department(self):
        user = make_user(is_manager=True, department_id=1)
        employee = make_employee(department_id=1)

        self.assertTrue(AttendancePolicy.can_view_attendance(user, employee))

    def test_view_attendance_manager_other_department_denied(self):
        user = make_user(is_manager=True, department_id=1)
        employee = make_employee(department_id=2)

        self.assertFalse(AttendancePolicy.can_view_attendance(user, employee))

    def test_view_attendance_employee_denied(self):
        user = make_user(is_employee=True)
        employee = make_employee(department_id=1)

        self.assertFalse(AttendancePolicy.can_view_attendance(user, employee))


class LeavePolicyTestCase(TestCase):
    """Tests for LeavePolicy rules."""

    def test_manager_can_approve_same_department(self):
        user = make_user(is_manager=True, department_id=1)
        leave_request = Mock(employee=make_employee(1))

        self.assertTrue(LeavePolicy.can_approve_leave(user, leave_request))

    def test_manager_cannot_approve_other_department(self):
        user = make_user(is_manager=True, department_id=1)
        leave_request = Mock(employee=make_employee(2))

        self.assertFalse(LeavePolicy.can_approve_leave(user, leave_request))

    def test_admin_cannot_approve_without_manager_role(self):
        user = make_user(is_admin=True)
        leave_request = Mock(employee=make_employee(1))

        self.assertFalse(LeavePolicy.can_approve_leave(user, leave_request))


class BiometricPolicyTestCase(TestCase):
    """Tests for BiometricPolicy rules."""

    def test_admin_can_manage_biometric(self):
        user = make_user(is_admin=True)
        profile = Mock(employee=make_employee(99))

        self.assertTrue(BiometricPolicy.can_manage_profile(user, profile))

    def test_manager_can_manage_same_department_profile(self):
        user = make_user(is_manager=True, department_id=1)
        profile = Mock(employee=make_employee(1))

        self.assertTrue(BiometricPolicy.can_manage_profile(user, profile))

    def test_manager_cannot_manage_other_department_profile(self):
        user = make_user(is_manager=True, department_id=1)
        profile = Mock(employee=make_employee(2))

        self.assertFalse(BiometricPolicy.can_manage_profile(user, profile))

    def test_non_admin_non_manager_denied(self):
        user = make_user(is_employee=True)
        profile = Mock(employee=make_employee(1))

        self.assertFalse(BiometricPolicy.can_manage_profile(user, profile))
