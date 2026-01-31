# backend/apps/employees/tests/test_models.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from employees.models import Department, Employee
from attendance.models import EmployeeShift, Shift
from attendance.services.shift_resolution_service import ShiftResolutionService
import uuid

User = get_user_model()

class DepartmentModelTests(TestCase):
    """Tests for the Department model"""

    def setUp(self):
        self.department = Department.objects.create(
            name="IT Department",
            code="IT001"
        )

    def test_department_creation(self):
        self.assertIsInstance(self.department, Department)
        self.assertTrue(isinstance(self.department.id, uuid.UUID))
        self.assertEqual(self.department.name, "IT Department")
        self.assertEqual(self.department.code, "IT001")
        self.assertTrue(self.department.is_active)
        self.assertIsNone(self.department.manager)

    def test_department_str(self):
        self.assertEqual(str(self.department), "IT Department")


class EmployeeModelTests(TestCase):
    """Tests for the Employee model"""

    def setUp(self):
        # Create a user first
        self.user = User.objects.create_user(email="testuser@example.com", password="pass123")
        # Create a department
        self.department = Department.objects.create(name="HR", code="HR001")
        # Create employee
        self.employee = Employee.objects.create(
            user=self.user,
            department=self.department,
            employee_code="EMP001",
            full_name="John Doe"
        )

    def test_employee_creation(self):
        self.assertIsInstance(self.employee, Employee)
        self.assertTrue(isinstance(self.employee.id, uuid.UUID))
        self.assertEqual(self.employee.user, self.user)
        self.assertEqual(self.employee.department, self.department)
        self.assertEqual(self.employee.employee_code, "EMP001")
        self.assertEqual(self.employee.full_name, "John Doe")
        self.assertTrue(self.employee.is_active)
        self.assertFalse(self.employee.photo)

    def test_employee_str(self):
        self.assertEqual(str(self.employee), str(self.employee.id))

    def test_get_today_shift_no_shift(self):
        """get_today_shift should return None if no shift assigned"""
        self.assertIsNone(self.employee.get_today_shift())

    def test_get_shift_for_date_no_shift(self):
        """get_shift_for_date should return None if no shift assigned"""
        date = timezone.localdate()
        self.assertIsNone(self.employee.get_shift_for_date(date))

    def test_employee_department_relation(self):
        """Department should include employee in its employees related_name"""
        self.assertIn(self.employee, self.department.employees.all())

    def test_department_manager_relation(self):
        """Set manager for department"""
        self.department.manager = self.employee
        self.department.save()
        self.assertEqual(self.department.manager, self.employee)
        self.assertIn(self.department, self.employee.managed_departments.all())
