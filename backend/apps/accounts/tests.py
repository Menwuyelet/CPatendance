"""Accounts API endpoint coverage with positive and negative scenarios."""

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from .constants import Roles
from .models import Role, User
from employees.models import Department, Employee


class AccountsAPITests(APITestCase):
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
            employee_code="HAC-1001",
            full_name="Admin User",
            phone_number="+100",
            password=cls.admin_password,
        )
        cls.admin.roles.add(cls.role_admin)

        # Manager user
        cls.manager_password = "ManagerPass123!"
        cls.manager = User.objects.create_user(
            employee_code="HAC-1002",
            full_name="Manager User",
            phone_number="+101",
            password=cls.manager_password,
        )
        cls.manager.roles.add(cls.role_manager)
        cls.manager_emp = Employee.objects.create(
            user=cls.manager, department=cls.dept_main
        )
        cls.dept_main.manager = cls.manager
        cls.dept_main.save()

        # Employee in manager's department
        cls.employee_password = "EmployeePass123!"
        cls.employee = User.objects.create_user(
            employee_code="HAC-1003",
            full_name="Employee User",
            phone_number="+102",
            password=cls.employee_password,
        )
        cls.employee.roles.add(cls.role_employee)
        cls.employee_emp = Employee.objects.create(
            user=cls.employee, department=cls.dept_main
        )

        # Employee in other department
        cls.other = User.objects.create_user(
            employee_code="HAC-1004",
            full_name="Other User",
            phone_number="+103",
            password="OtherPass123!",
        )
        cls.other.roles.add(cls.role_employee)
        cls.other_emp = Employee.objects.create(
            user=cls.other, department=cls.dept_other
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

    def _fake_face(self):
        return SimpleUploadedFile("face.jpg", b"fake-bytes", content_type="image/jpeg")

    # Authentication
    def test_login_success(self):
        res = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": "HAC-1001", "password": self.admin_password},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_invalid_credentials(self):
        res = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": "HAC-1001", "password": "bad"},
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_returns_current_user(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.get(reverse("user-me"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["employee_code"], "HAC-1001")

    # Listing and scope
    def test_admin_list_users_returns_all(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.get(reverse("user-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data.get("users", [])), 4)

    def test_manager_list_users_scoped_to_department(self):
        token = self.login("HAC-1002", self.manager_password)
        res = self.client.get(reverse("user-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should not see user from other department
        codes = [u["employee_code"] for u in res.data.get("users", [])]
        self.assertIn("HAC-1003", codes)
        self.assertNotIn("HAC-1004", codes)

    # Creation flows
    @patch(
        "biometrics.services.enrollment_service.BiometricEnrollmentService.handle_embedding"
    )
    @patch(
        "biometrics.services.face_engine.FaceEngine.image_to_embedding",
        return_value=[0.1, 0.2],
    )
    def test_admin_can_create_employee_with_face_image(self, mock_embed, mock_handle):
        token = self.login("HAC-1001", self.admin_password)
        payload = {
            "full_name": "New Employee",
            "phone_number": "+200",
            "roles": [self.role_employee.id],
            "face_image": self._fake_face(),
        }
        res = self.client.post(
            reverse("user-list"), payload, format="multipart", **self.auth(token)
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("password", res.data)
        self.assertIn("employee_code", res.data)
        mock_embed.assert_called()
        mock_handle.assert_called()

    def test_manager_cannot_create_admin_user(self):
        token = self.login("HAC-1002", self.manager_password)
        payload = {
            "full_name": "Should Fail",
            "phone_number": "+201",
            "roles": [self.role_admin.id],
        }
        res = self.client.post(reverse("user-list"), payload, **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_create_employee_requires_face_image(self):
        token = self.login("HAC-1002", self.manager_password)
        payload = {
            "full_name": "Employee Missing Face",
            "phone_number": "+202",
            "roles": [self.role_employee.id],
        }
        res = self.client.post(reverse("user-list"), payload, **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("face_image", res.data)

    @patch(
        "biometrics.services.enrollment_service.BiometricEnrollmentService.handle_embedding"
    )
    @patch(
        "biometrics.services.face_engine.FaceEngine.image_to_embedding",
        return_value=[0.1, 0.2],
    )
    def test_manager_can_create_employee_with_face_image(self, mock_embed, mock_handle):
        token = self.login("HAC-1002", self.manager_password)
        payload = {
            "full_name": "Dept Employee",
            "phone_number": "+203",
            "roles": [self.role_employee.id],
            "face_image": self._fake_face(),
        }
        res = self.client.post(
            reverse("user-list"), payload, format="multipart", **self.auth(token)
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        mock_embed.assert_called()
        mock_handle.assert_called()

    # Mutation endpoints
    def test_change_password_wrong_current(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.patch(
            reverse("user-change-password"),
            {
                "current_password": "wrong",
                "new_password": "NewPass123!",
                "password_confirmation": "NewPass123!",
            },
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_missing_fields(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.patch(reverse("user-change-password"), {}, **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_success(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.patch(
            reverse("user-reset-password"),
            {"employee_code": "HAC-1003"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("new_password", res.data)

    def test_reset_password_missing_code(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.patch(reverse("user-reset-password"), {}, **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_user_as_admin(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.patch(
            reverse("user-detail", args=[self.employee.id]),
            {"is_active": False},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["is_active"])

    def test_manager_cannot_delete_user(self):
        token = self.login("HAC-1002", self.manager_password)
        res = self.client.delete(
            reverse("user-detail", args=[self.other.id]), **self.auth(token)
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_user_as_admin(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.delete(
            reverse("user-detail", args=[self.other.id]), **self.auth(token)
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_user_by_employee_code_endpoint(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.delete(
            reverse("user-delete-user"),
            {"employee_code": "HAC-1003"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_delete_user_by_employee_code_not_found(self):
        token = self.login("HAC-1001", self.admin_password)
        res = self.client.delete(
            reverse("user-delete-user"),
            {"employee_code": "HAC-9999"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_employee_cannot_list_users(self):
        token = self.login("HAC-1003", self.employee_password)
        res = self.client.get(reverse("user-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_token_refresh(self):
        login = self.client.post(
            reverse("token_obtain_pair"),
            {"employee_code": "HAC-1001", "password": self.admin_password},
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        refresh = login.data["refresh"]
        res = self.client.post(reverse("token_refresh"), {"refresh": refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
