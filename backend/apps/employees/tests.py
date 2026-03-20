"""Employees app API coverage (departments and employees)."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import Roles
from accounts.models import Role, User
from employees.models import Department, Employee


class EmployeesAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Roles
        cls.role_admin, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.role_manager, _ = Role.objects.get_or_create(name=Roles.MANAGER)
        cls.role_employee, _ = Role.objects.get_or_create(name=Roles.EMPLOYEE)

        # Departments
        cls.dept_main = Department.objects.create(name="Engineering", code="ENG01")
        cls.dept_other = Department.objects.create(name="HR", code="HR01")

        # Admin user
        cls.admin_password = "AdminPass123!"
        cls.admin = User.objects.create_user(
            employee_code="HAC-2001",
            full_name="Admin User",
            phone_number="+200",
            password=cls.admin_password,
        )
        cls.admin.roles.add(cls.role_admin)

        # Manager
        cls.manager_password = "ManagerPass123!"
        cls.manager = User.objects.create_user(
            employee_code="HAC-2002",
            full_name="Manager User",
            phone_number="+201",
            password=cls.manager_password,
        )
        cls.manager.roles.add(cls.role_manager)
        cls.manager_emp = Employee.objects.create(
            user=cls.manager, department=cls.dept_main
        )
        cls.dept_main.manager = cls.manager
        cls.dept_main.save()

        # Employees in departments
        cls.emp_main = User.objects.create_user(
            employee_code="HAC-2003",
            full_name="Main Employee",
            phone_number="+202",
            password="EmployeePass123!",
        )
        cls.emp_main.roles.add(cls.role_employee)
        cls.emp_main_profile = Employee.objects.create(
            user=cls.emp_main, department=cls.dept_main
        )

        cls.emp_other = User.objects.create_user(
            employee_code="HAC-2004",
            full_name="Other Employee",
            phone_number="+203",
            password="OtherPass123!",
        )
        cls.emp_other.roles.add(cls.role_employee)
        cls.emp_other_profile = Employee.objects.create(
            user=cls.emp_other, department=cls.dept_other
        )

    def login(self, code, password):
        res = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": code, "password": password},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.data["access"]

    def auth(self, token):
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    # Department endpoints
    def test_admin_can_create_department(self):
        token = self.login("HAC-2001", self.admin_password)
        res = self.client.post(
            reverse("department-list"),
            {"name": "Ops", "code": "OPS01"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_manager_cannot_delete_department(self):
        token = self.login("HAC-2002", self.manager_password)
        res = self.client.delete(
            reverse("department-detail", args=[self.dept_other.id]),
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create_department(self):
        token = self.login("HAC-2002", self.manager_password)
        res = self.client.post(
            reverse("department-list"),
            {"name": "QA", "code": "QA01"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_manager_cannot_update_department(self):
        token = self.login("HAC-2002", self.manager_password)
        res = self.client.patch(
            reverse("department-detail", args=[self.dept_other.id]),
            {"name": "Renamed"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_and_delete_department(self):
        token = self.login("HAC-2001", self.admin_password)
        res = self.client.patch(
            reverse("department-detail", args=[self.dept_other.id]),
            {"name": "HR Updated"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        delete_res = self.client.delete(
            reverse("department-detail", args=[self.dept_other.id]),
            **self.auth(token),
        )
        self.assertEqual(delete_res.status_code, status.HTTP_204_NO_CONTENT)

    def test_employee_cannot_list_departments(self):
        res_login = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": "HAC-2003", "password": "EmployeePass123!"},
        )
        self.assertEqual(res_login.status_code, status.HTTP_400_BAD_REQUEST)

    # Employee endpoints
    def test_admin_employee_list_returns_all(self):
        token = self.login("HAC-2001", self.admin_password)
        res = self.client.get(reverse("employee-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [emp["user"]["employee_code"] for emp in res.data.get("results", [])]
        self.assertIn("HAC-2003", codes)
        self.assertIn("HAC-2004", codes)

    def test_manager_employee_list_scoped_to_department(self):
        token = self.login("HAC-2002", self.manager_password)
        res = self.client.get(reverse("employee-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = [emp["user"]["employee_code"] for emp in res.data.get("results", [])]
        self.assertIn("HAC-2003", codes)
        self.assertNotIn("HAC-2004", codes)

    def test_employee_cannot_list_employees(self):
        res_login = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": "HAC-2003", "password": "EmployeePass123!"},
        )
        self.assertEqual(res_login.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_employee_endpoint_not_allowed(self):
        token = self.login("HAC-2001", self.admin_password)
        res = self.client.post(
            reverse("employee-list"),
            {"user": self.emp_main.id},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_admin_can_update_employee(self):
        token = self.login("HAC-2001", self.admin_password)
        res = self.client.patch(
            reverse("employee-detail", args=[self.emp_main_profile.id]),
            {"is_active": False},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["is_active"])

    def test_manager_cannot_update_employee(self):
        token = self.login("HAC-2002", self.manager_password)
        res = self.client.patch(
            reverse("employee-detail", args=[self.emp_main_profile.id]),
            {"is_active": False},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_employee(self):
        token = self.login("HAC-2001", self.admin_password)
        res = self.client.delete(
            reverse("employee-detail", args=[self.emp_other_profile.id]),
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_manager_cannot_delete_employee(self):
        token = self.login("HAC-2002", self.manager_password)
        res = self.client.delete(
            reverse("employee-detail", args=[self.emp_main_profile.id]),
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_cannot_retrieve_employee_detail(self):
        res_login = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": "HAC-2003", "password": "EmployeePass123!"},
        )
        self.assertEqual(res_login.status_code, status.HTTP_400_BAD_REQUEST)
