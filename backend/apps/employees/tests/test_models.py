from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from employees.models import Department, Employee
import uuid

User = get_user_model()


class DepartmentModelTests(TestCase):
    """Tests for the Department model."""

    def setUp(self):
        self.department = Department.objects.create(
            name="IT Department",
            code="IT001",
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
    """Tests for the Employee model."""

    def setUp(self):
        self.user = User.objects.create_user(
            employee_code="EMP001",
            full_name="John Doe",
            phone_number="+100000001",
            password="pass123",
        )
        self.department = Department.objects.create(name="HR", code="HR001")
        self.employee = Employee.objects.create(
            user=self.user,
            department=self.department,
        )

    def test_employee_creation(self):
        self.assertIsInstance(self.employee, Employee)
        self.assertTrue(isinstance(self.employee.id, uuid.UUID))
        self.assertEqual(self.employee.user, self.user)
        self.assertEqual(self.employee.department, self.department)
        self.assertTrue(self.employee.is_active)
        self.assertFalse(self.employee.photo)

    def test_employee_str(self):
        self.assertEqual(str(self.employee), str(self.employee.id))

    def test_get_today_shift_no_shift(self):
        self.assertIsNone(self.employee.get_today_shift())

    def test_get_shift_for_date_no_shift(self):
        date = timezone.localdate()
        self.assertIsNone(self.employee.get_shift_for_date(date))

    def test_employee_department_relation(self):
        self.assertIn(self.employee, self.department.employees.all())

    def test_department_manager_relation_uses_user(self):
        self.department.manager = self.user
        self.department.save()
        self.assertEqual(self.department.manager, self.user)
        self.assertIn(self.department, self.user.managed_departments.all())
        self.assertEqual(self.department.get_manager_name(), self.user.employee_code)
