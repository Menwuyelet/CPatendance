"""
Tests for policy classes in the accounts app.

These tests validate authorization rules implemented in:
- AttendancePolicy
- LeavePolicy
- BiometricPolicy
- BasePolicy helpers

The policies are tested in isolation using lightweight mock
objects instead of real Django models to ensure:
- Speed
- Determinism
- Clear intent
"""

from django.test import TestCase
from unittest.mock import Mock

from apps.accounts.policies.attendance import AttendancePolicy
from apps.accounts.policies.leave import LeavePolicy
from apps.accounts.policies.biometric import BiometricPolicy
from apps.accounts.policies.common import BasePolicy
from accounts.constants import Roles


def make_user(*roles, department_id=None):
    """
    Create a lightweight mock user with given roles and optional department.
    """
    user = Mock()
    user.id = id(user)

    # Simulate role checking
    user.has_role.side_effect = lambda role: role in roles

    # Optional employee relationship
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

    def test_role_helpers(self):
        user = make_user(Roles.ADMIN, Roles.HR)

        self.assertTrue(BasePolicy.is_admin(user))
        self.assertTrue(BasePolicy.is_hr(user))
        self.assertFalse(BasePolicy.is_manager(user))
        self.assertFalse(BasePolicy.is_worker(user))

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

    def test_hr_can_take_attendance_for_anyone(self):
        user = make_user(Roles.HR)
        employee = make_employee(department_id=99)

        self.assertTrue(AttendancePolicy.can_take_attendance(user, employee))

    def test_manager_can_take_attendance_same_department(self):
        user = make_user(Roles.MANAGER, department_id=1)
        employee = make_employee(department_id=1)

        self.assertTrue(AttendancePolicy.can_take_attendance(user, employee))

    def test_manager_cannot_take_attendance_other_department(self):
        user = make_user(Roles.MANAGER, department_id=1)
        employee = make_employee(department_id=2)

        self.assertFalse(AttendancePolicy.can_take_attendance(user, employee))

    def test_worker_cannot_take_attendance(self):
        user = make_user(Roles.EMPLOYEE)
        employee = make_employee(department_id=1)

        self.assertFalse(AttendancePolicy.can_take_attendance(user, employee))

    def test_self_check_in_allowed_roles(self):
        self.assertTrue(AttendancePolicy.can_self_check_in(make_user(Roles.EMPLOYEE)))
        self.assertTrue(AttendancePolicy.can_self_check_in(make_user(Roles.HR)))
        self.assertTrue(AttendancePolicy.can_self_check_in(make_user(Roles.MANAGER)))

    def test_self_check_in_denied_for_admin_only(self):
        self.assertFalse(AttendancePolicy.can_self_check_in(make_user(Roles.ADMIN)))

    def test_view_attendance_hr(self):
        user = make_user(Roles.HR)
        employee = make_employee(department_id=1)

        self.assertTrue(AttendancePolicy.can_view_attendance(user, employee))

    def test_view_attendance_manager_same_department(self):
        user = make_user(Roles.MANAGER, department_id=1)
        employee = make_employee(department_id=1)

        self.assertTrue(AttendancePolicy.can_view_attendance(user, employee))

    def test_view_attendance_worker_self_only(self):
        user = make_user(Roles.EMPLOYEE)
        employee = make_employee(department_id=1)

        employee.id = user.id  # same person
        self.assertTrue(AttendancePolicy.can_view_attendance(user, employee))

    def test_view_attendance_worker_other_denied(self):
        user = make_user(Roles.EMPLOYEE)
        employee = make_employee(department_id=1)

        self.assertFalse(AttendancePolicy.can_view_attendance(user, employee))


class LeavePolicyTestCase(TestCase):
    """Tests for LeavePolicy rules."""

    def test_worker_can_request_leave(self):
        self.assertTrue(LeavePolicy.can_request_leave(make_user(Roles.EMPLOYEE)))

    def test_hr_can_request_leave(self):
        self.assertTrue(LeavePolicy.can_request_leave(make_user(Roles.HR)))

    def test_manager_can_request_leave(self):
        self.assertTrue(LeavePolicy.can_request_leave(make_user(Roles.MANAGER)))

    def test_admin_cannot_request_leave(self):
        self.assertFalse(LeavePolicy.can_request_leave(make_user(Roles.ADMIN)))

    def test_hr_can_approve_any_leave(self):
        user = make_user(Roles.HR)
        leave_request = Mock(employee=make_employee(1))

        self.assertTrue(LeavePolicy.can_approve_leave(user, leave_request))

    def test_manager_can_approve_same_department(self):
        user = make_user(Roles.MANAGER, department_id=1)
        leave_request = Mock(employee=make_employee(1))

        self.assertTrue(LeavePolicy.can_approve_leave(user, leave_request))

    def test_manager_cannot_approve_other_department(self):
        user = make_user(Roles.MANAGER, department_id=1)
        leave_request = Mock(employee=make_employee(2))

        self.assertFalse(LeavePolicy.can_approve_leave(user, leave_request))


class BiometricPolicyTestCase(TestCase):
    """Tests for BiometricPolicy rules."""

    def test_admin_can_manage_biometric(self):
        user = Mock()
        user.is_admin.return_value = True
        user.is_hr.return_value = False

        self.assertTrue(BiometricPolicy.can_manage_profile(user, None))

    def test_hr_can_manage_biometric(self):
        user = Mock()
        user.is_admin.return_value = False
        user.is_hr.return_value = True

        self.assertTrue(BiometricPolicy.can_manage_profile(user, None))

    def test_non_admin_non_hr_denied(self):
        user = Mock()
        user.is_admin.return_value = False
        user.is_hr.return_value = False

        self.assertFalse(BiometricPolicy.can_manage_profile(user, None))
