from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.urls import reverse
from io import BytesIO
from unittest.mock import patch

from accounts.models import User, Role
from accounts.constants import Roles
from employees.models import Employee, Department


class DepartmentViewSetTests(TestCase):
    """Tests for DepartmentViewSet endpoints."""
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name=Roles.ADMIN)
        cls.hr_role = Role.objects.create(name=Roles.HR)
        cls.mgr_role = Role.objects.create(name=Roles.MANAGER)

        # Users
        cls.admin_user = User.objects.create_user(email="admin@test.com", password="pass")
        cls.admin_user.roles.add(cls.admin_role)

        cls.hr_user = User.objects.create_user(email="hr@test.com", password="pass")
        cls.hr_user.roles.add(cls.hr_role)

        cls.mgr_user = User.objects.create_user(email="mgr@test.com", password="pass")
        cls.mgr_user.roles.add(cls.mgr_role)

        cls.department = Department.objects.create(name="IT", code="IT01")

        cls.list_url = reverse("department-list")
        cls.detail_url = reverse("department-detail", args=[cls.department.id])

    def setUp(self):
        self.client = APIClient()

    def test_list_departments_as_hr(self):
        self.client.force_authenticate(self.hr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_department_as_non_admin_forbidden(self):
        self.client.force_authenticate(self.hr_user)
        response = self.client.patch(self.detail_url, {"name": "IT Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_department_as_admin_allowed(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(self.detail_url, {"name": "IT Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.department.refresh_from_db()
        self.assertEqual(self.department.name, "IT Updated")


class EmployeeViewSetTests(TestCase):
    """Tests for EmployeeViewSet endpoints."""
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name=Roles.ADMIN)
        cls.hr_role = Role.objects.create(name=Roles.HR)
        cls.mgr_role = Role.objects.create(name=Roles.MANAGER)

        cls.admin_user = User.objects.create_user(email="admin@test.com", password="pass")
        cls.admin_user.roles.add(cls.admin_role)

        cls.hr_user = User.objects.create_user(email="hr@test.com", password="pass")
        cls.hr_user.roles.add(cls.hr_role)

        cls.mgr_user = User.objects.create_user(email="mgr@test.com", password="pass")
        cls.mgr_user.roles.add(cls.mgr_role)

        cls.emp_user = User.objects.create_user(email="emp@test.com", password="pass")
        cls.employee = Employee.objects.create(
            user=cls.emp_user,
            employee_code="EMP001",
            full_name="John Doe"
        )

        cls.list_url = reverse("employee-list")
        cls.detail_url = reverse("employee-detail", args=[cls.employee.id])

    def setUp(self):
        self.client = APIClient()

    def test_list_employees_as_hr(self):
        self.client.force_authenticate(self.hr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_update_employee_as_non_admin_forbidden(self):
        self.client.force_authenticate(self.hr_user)
        response = self.client.patch(self.detail_url, {"full_name": "Jane Doe"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_employee_as_admin_allowed(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(self.detail_url, {"full_name": "Jane Doe"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.full_name, "Jane Doe")



""" 
    ManagerTeamViewTests becouse a router for 
    a manager(/api/employees/manager/team/ endpoint is needed)
"""