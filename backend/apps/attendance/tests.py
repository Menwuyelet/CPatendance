"""Attendance API coverage for sessions, records, shifts, assignments, and leave."""

from datetime import datetime, time, timedelta
from unittest.mock import patch

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import Roles
from accounts.models import Role, User
from employees.models import Department, Employee
from attendance.models import (
    AttendanceRecord,
    AttendanceSession,
    EmployeeShift,
    Shift,
    EmployeeLeave,
)
from attendance.models.atendance_session import SessionPhase


class AttendanceAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Roles
        cls.role_admin, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.role_manager, _ = Role.objects.get_or_create(name=Roles.MANAGER)
        cls.role_employee, _ = Role.objects.get_or_create(name=Roles.EMPLOYEE)

        # Departments
        cls.dept_main = Department.objects.create(name="Engineering", code="ENG01")
        cls.dept_other = Department.objects.create(name="HR", code="HR01")

        # Admin
        cls.admin_password = "AdminPass123!"
        cls.admin = User.objects.create_user(
            employee_code="HAC-4001",
            full_name="Admin User",
            phone_number="+400",
            password=cls.admin_password,
        )
        cls.admin.roles.add(cls.role_admin)

        # Manager
        cls.manager_password = "ManagerPass123!"
        cls.manager = User.objects.create_user(
            employee_code="HAC-4002",
            full_name="Manager User",
            phone_number="+401",
            password=cls.manager_password,
        )
        cls.manager.roles.add(cls.role_manager)
        cls.manager_emp = Employee.objects.create(
            user=cls.manager, department=cls.dept_main
        )
        cls.dept_main.manager = cls.manager
        cls.dept_main.save()

        # Employees
        cls.emp_main = User.objects.create_user(
            employee_code="HAC-4003",
            full_name="Main Employee",
            phone_number="+402",
            password="EmployeePass123!",
        )
        cls.emp_main.roles.add(cls.role_employee)
        cls.emp_main_profile = Employee.objects.create(
            user=cls.emp_main, department=cls.dept_main
        )

        cls.emp_other = User.objects.create_user(
            employee_code="HAC-4004",
            full_name="Other Employee",
            phone_number="+403",
            password="OtherPass123!",
        )
        cls.emp_other.roles.add(cls.role_employee)
        cls.emp_other_profile = Employee.objects.create(
            user=cls.emp_other, department=cls.dept_other
        )

        # Shifts
        cls.shift_main = Shift.objects.create(
            name="Day",
            start_time=time(9, 0),
            end_time=time(17, 0),
            department=cls.dept_main,
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
            saturday=True,
            sunday=True,
        )
        cls.shift_other = Shift.objects.create(
            name="Night",
            start_time=time(21, 0),
            end_time=time(5, 0),
            department=cls.dept_other,
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
            saturday=True,
            sunday=True,
        )

        # Shift assignments
        cls.emp_main_assignment = EmployeeShift.objects.create(
            employee=cls.emp_main_profile, shift=cls.shift_main
        )
        cls.emp_other_assignment = EmployeeShift.objects.create(
            employee=cls.emp_other_profile, shift=cls.shift_other
        )

        # Attendance records
        cls.record_main = AttendanceRecord.objects.create(
            employee=cls.emp_main_profile,
            employee_shift=cls.emp_main_assignment,
            date=datetime(2024, 1, 1).date(),
            status="PRESENT",
            taken_by=cls.manager,
        )
        cls.record_other = AttendanceRecord.objects.create(
            employee=cls.emp_other_profile,
            employee_shift=cls.emp_other_assignment,
            date=datetime(2024, 1, 1).date(),
            status="ABSENT",
            taken_by=cls.admin,
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

    def _fake_image(self):
        return SimpleUploadedFile("face.jpg", b"fake-bytes", content_type="image/jpeg")

    # Session creation / lifecycle
    def test_manager_can_start_session_during_shift(self):
        token = self.login("HAC-4002", self.manager_password)

        fixed_now = timezone.make_aware(datetime(2024, 1, 1, 10, 0))
        with patch("attendance.api.views.timezone") as tz_mock:
            tz_mock.now.return_value = fixed_now
            tz_mock.localtime.side_effect = lambda dt=None: dt or fixed_now
            res = self.client.post(
                reverse("attendance-sessions-list"),
                {"shift_id": self.shift_main.id},
                **self.auth(token),
            )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            AttendanceSession.objects.filter(
                id=res.data["session_id"], shift=self.shift_main
            ).exists()
        )

    def test_session_creation_rejected_outside_shift_hours(self):
        token = self.login("HAC-4002", self.manager_password)

        fixed_now = timezone.make_aware(datetime(2024, 1, 1, 6, 0))
        with patch("attendance.api.views.timezone") as tz_mock:
            tz_mock.now.return_value = fixed_now
            tz_mock.localtime.side_effect = lambda dt=None: dt or fixed_now
            res = self.client.post(
                reverse("attendance-sessions-list"),
                {"shift_id": self.shift_main.id},
                **self.auth(token),
            )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("shift hours", res.data["detail"])

    def test_sleep_session_moves_to_checkout(self):
        token = self.login("HAC-4002", self.manager_password)
        session = AttendanceSession.objects.create(
            shift=self.shift_main,
            started_by=self.manager,
            is_active=True,
            phase=SessionPhase.CHECK_IN,
        )

        with patch(
            "attendance.api.views.AttendanceSessionService.make_sleep"
        ) as mock_sleep:
            res = self.client.post(
                reverse("attendance-sessions-sleep", args=[session.id]),
                {"leave_employee_codes": ["HAC-4003"]},
                **self.auth(token),
            )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_sleep.assert_called_once()

    def test_activate_checkout_requires_checkout_phase(self):
        token = self.login("HAC-4002", self.manager_password)
        session = AttendanceSession.objects.create(
            shift=self.shift_main,
            started_by=self.manager,
            is_active=True,
            phase=SessionPhase.CHECK_IN,
        )

        res = self.client.post(
            reverse("attendance-sessions-activate-checkout", args=[session.id]),
            **self.auth(token),
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_checkout_succeeds_for_checkout_phase(self):
        token = self.login("HAC-4002", self.manager_password)
        session = AttendanceSession.objects.create(
            shift=self.shift_main,
            started_by=self.manager,
            is_active=False,
            phase=SessionPhase.CHECK_OUT,
        )

        with patch(
            "attendance.api.views.AttendanceSessionService.activate_checkout"
        ) as mock_activate:
            res = self.client.post(
                reverse("attendance-sessions-activate-checkout", args=[session.id]),
                **self.auth(token),
            )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_activate.assert_called_once()

    # Check-in / checkout capture
    def test_check_in_requires_image(self):
        token = self.login("HAC-4002", self.manager_password)
        res = self.client.post(reverse("attendance-taking-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_in_records_success(self):
        token = self.login("HAC-4002", self.manager_password)
        session = AttendanceSession.objects.create(
            shift=self.shift_main,
            started_by=self.manager,
            is_active=True,
            phase=SessionPhase.CHECK_IN,
            started_at=timezone.now(),
        )

        with patch(
            "attendance.api.views.AttendanceSessionService.check_in_next_worker",
            return_value="STOP_SUCCESS",
        ):
            res = self.client.post(
                reverse("attendance-taking-list"),
                {"image": self._fake_image()},
                format="multipart",
                **self.auth(token),
            )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_check_out_returns_error_when_no_session(self):
        token = self.login("HAC-4002", self.manager_password)
        res = self.client.post(
            reverse("attendance-checkout-list"),
            {"image": self._fake_image()},
            format="multipart",
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # Attendance records
    def test_admin_lists_all_records(self):
        token = self.login("HAC-4001", self.admin_password)
        res = self.client.get(reverse("attendance-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data.get("results", res.data)]
        self.assertIn(self.record_main.id, ids)
        self.assertIn(self.record_other.id, ids)

    def test_manager_records_filtered_to_department(self):
        token = self.login("HAC-4002", self.manager_password)
        res = self.client.get(reverse("attendance-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data.get("results", res.data)]
        self.assertIn(self.record_main.id, ids)
        self.assertNotIn(self.record_other.id, ids)

    def test_employee_only_sees_own_records(self):
        token = self.login("HAC-4003", "EmployeePass123!")
        res = self.client.get(reverse("attendance-list"), **self.auth(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data.get("results", res.data)]
        self.assertIn(self.record_main.id, ids)
        self.assertNotIn(self.record_other.id, ids)

    def test_manager_update_record_rejected(self):
        token = self.login("HAC-4002", self.manager_password)
        res = self.client.put(
            reverse("attendance-detail", args=[self.record_main.id]),
            {"status": "LATE"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.record_main.refresh_from_db()
        self.assertEqual(self.record_main.status, "PRESENT")

    # Shifts
    def test_admin_can_create_shift(self):
        token = self.login("HAC-4001", self.admin_password)
        res = self.client.post(
            reverse("shift-list"),
            {
                "name": "Evening",
                "start_time": "18:00:00",
                "end_time": "22:00:00",
                "monday": True,
            },
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_manager_can_update_shift(self):
        token = self.login("HAC-4002", self.manager_password)
        res = self.client.put(
            reverse("shift-detail", args=[self.shift_main.id]),
            {"description": "Updated"},
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["description"], "Updated")

    # Employee shift assignments
    def test_assignment_validation_errors_return_400(self):
        token = self.login("HAC-4001", self.admin_password)
        with patch(
            "attendance.api.views.EmployeeShiftService.assign_shift",
            side_effect=ValidationError("Too many shifts"),
        ):
            res = self.client.post(
                reverse("employee-shift-list"),
                {"employee": self.emp_main_profile.id, "shift": self.shift_other.id},
                **self.auth(token),
            )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Too many shifts", str(res.data))

    # Employee leaves
    def test_manager_can_create_leave_for_department_employee(self):
        token = self.login("HAC-4002", self.manager_password)
        res = self.client.post(
            reverse("employee-leave-list"),
            {
                "employee": self.emp_main_profile.id,
                "start_date": "2024-01-10",
                "end_date": "2024-01-12",
                "reason": "Vacation",
            },
            **self.auth(token),
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_manager_cannot_manage_other_department_leave(self):
        token = self.login("HAC-4002", self.manager_password)
        leave = EmployeeLeave.objects.create(
            employee=self.emp_other_profile,
            start_date=datetime(2024, 2, 1).date(),
            end_date=datetime(2024, 2, 3).date(),
            created_by=self.admin,
        )

        res = self.client.delete(
            reverse("employee-leave-detail", args=[leave.id]), **self.auth(token)
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
