from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.constants import Roles
from accounts.models import Role, User
from employees.models import Department, Employee


class DepartmentViewSetTests(TestCase):
    """Tests for DepartmentViewSet endpoints."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name=Roles.ADMIN)
        cls.mgr_role = Role.objects.create(name=Roles.MANAGER)
        cls.emp_role = Role.objects.create(name=Roles.EMPLOYEE)

        cls.admin_user = User.objects.create_user(
            employee_code="EMP-ADMIN",
            full_name="Admin",
            phone_number="+111111111",
            password="pass",
        )
        cls.admin_user.roles.add(cls.admin_role)

        cls.mgr_user = User.objects.create_user(
            employee_code="EMP-MANAGER",
            full_name="Manager",
            phone_number="+122222222",
            password="pass",
        )
        cls.mgr_user.roles.add(cls.mgr_role)

        cls.emp_user = User.objects.create_user(
            employee_code="EMP-USER",
            full_name="Employee",
            phone_number="+133333333",
            password="pass",
        )
        cls.emp_user.roles.add(cls.emp_role)

        cls.department = Department.objects.create(name="IT", code="IT01")

        cls.list_url = reverse("department-list")
        cls.detail_url = reverse("department-detail", args=[cls.department.id])

    def setUp(self):
        self.client = APIClient()

    def test_list_departments_as_manager(self):
        self.client.force_authenticate(self.mgr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_department_as_non_admin_forbidden(self):
        self.client.force_authenticate(self.mgr_user)
        response = self.client.patch(
            self.detail_url, {"name": "IT Updated"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_department_as_admin_allowed(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(
            self.detail_url, {"name": "IT Updated"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.department.refresh_from_db()
        self.assertEqual(self.department.name, "IT Updated")


class EmployeeViewSetTests(TestCase):
    """Tests for EmployeeViewSet endpoints."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name=Roles.ADMIN)
        cls.mgr_role = Role.objects.create(name=Roles.MANAGER)
        cls.emp_role = Role.objects.create(name=Roles.EMPLOYEE)

        cls.department_a = Department.objects.create(name="Engineering", code="ENG01")
        cls.department_b = Department.objects.create(name="Finance", code="FIN01")

        cls.admin_user = User.objects.create_user(
            employee_code="EMP-ADMIN",
            full_name="Admin",
            phone_number="+211111111",
            password="pass",
        )
        cls.admin_user.roles.add(cls.admin_role)

        cls.mgr_user = User.objects.create_user(
            employee_code="EMP-MGR",
            full_name="Manager",
            phone_number="+222222222",
            password="pass",
        )
        cls.mgr_user.roles.add(cls.mgr_role)
        cls.mgr_employee = Employee.objects.create(
            user=cls.mgr_user,
            department=cls.department_a,
        )

        cls.emp_user_a = User.objects.create_user(
            employee_code="EMP-A",
            full_name="Emp A",
            phone_number="+233333333",
            password="pass",
        )
        cls.emp_user_a.roles.add(cls.emp_role)
        cls.employee_a = Employee.objects.create(
            user=cls.emp_user_a, department=cls.department_a
        )

        cls.emp_user_b = User.objects.create_user(
            employee_code="EMP-B",
            full_name="Emp B",
            phone_number="+244444444",
            password="pass",
        )
        cls.emp_user_b.roles.add(cls.emp_role)
        cls.employee_b = Employee.objects.create(
            user=cls.emp_user_b, department=cls.department_b
        )

        cls.list_url = reverse("employee-list")
        cls.detail_url = reverse("employee-detail", args=[cls.employee_b.id])

    def setUp(self):
        self.client = APIClient()

    def test_list_employees_as_manager_scoped_to_department(self):
        self.client.force_authenticate(self.mgr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        user_codes = {
            item["user"]["employee_code"] for item in response.data["results"]
        }
        self.assertIn("EMP-A", user_codes)
        self.assertNotIn("EMP-B", user_codes)

    def test_update_employee_as_non_admin_forbidden(self):
        self.client.force_authenticate(self.mgr_user)
        response = self.client.patch(
            self.detail_url,
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_employee_as_admin_allowed(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(
            self.detail_url,
            {"is_active": False, "department": str(self.department_a.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee_b.refresh_from_db()
        self.assertFalse(self.employee_b.is_active)
        self.assertEqual(self.employee_b.department_id, self.department_a.id)
