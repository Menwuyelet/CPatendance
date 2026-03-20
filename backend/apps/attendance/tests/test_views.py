"""
Module: backend/apps/attendance/tests/test_views.py

API tests for attendance viewsets.
"""

from datetime import datetime, time, timedelta, date
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import Roles
from accounts.models import Role, User
from attendance.models import AttendanceRecord, AttendanceSession, EmployeeShift, Shift
from employees.models import Employee


class AttendanceSessionViewSetTests(APITestCase):
    """Tests for attendance session endpoints."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.admin = User.objects.create_user(
            email="admin@test.com",
            password="password123",
        )
        cls.admin.roles.add(cls.admin_role)

        cls.employee_user = User.objects.create_user(
            email="employee@test.com",
            password="password123",
        )
        cls.employee = Employee.objects.create(
            user=cls.employee_user,
            full_name="John Doe",
            employee_code="EMP001",
            department=None,
        )

        cls.shift = Shift.objects.create(
            name="Day Shift",
            start_time=time(8, 0),
            end_time=time(16, 0),
            monday=True,
        )
        cls.employee_shift = EmployeeShift.objects.create(
            employee=cls.employee,
            shift=cls.shift,
        )

        cls.create_url = reverse("attendance-sessions-list")
        cls.list_url = reverse("attendance-manage-sessions-list")
        cls.sleep_url = lambda session_id: reverse(
            "attendance-sessions-sleep", args=[session_id]
        )
        cls.activate_checkout_url = lambda session_id: reverse(
            "attendance-sessions-activate-checkout", args=[session_id]
        )
        cls.close_url = lambda session_id: reverse(
            "attendance-sessions-detail", args=[session_id]
        )

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def _aware(self, dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())

    def test_session_start_within_shift_time(self):
        fixed_now = self._aware(datetime(2026, 2, 2, 9, 0))

        with patch("attendance.api.views.timezone.now", return_value=fixed_now):
            response = self.client.post(self.create_url, {"shift_id": self.shift.id})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("session_id", response.data)

    def test_session_start_outside_shift_time(self):
        fixed_now = self._aware(datetime(2026, 2, 2, 20, 0))

        with patch("attendance.api.views.timezone.now", return_value=fixed_now):
            response = self.client.post(self.create_url, {"shift_id": self.shift.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_session_start_on_wrong_day(self):
        fixed_now = self._aware(datetime(2026, 2, 3, 9, 0))

        with patch("attendance.api.views.timezone.now", return_value=fixed_now):
            response = self.client.post(self.create_url, {"shift_id": self.shift.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_session_list_is_paginated(self):
        base_time = self._aware(datetime(2026, 2, 2, 8, 0))
        for i in range(30):
            AttendanceSession.objects.create(
                shift=self.shift,
                started_by=self.admin,
                started_at=base_time + timedelta(minutes=i),
                is_active=False,
            )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 30)
        self.assertEqual(len(response.data["results"]), 25)

    def test_session_sleep_requires_checkin_phase(self):
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            is_active=True,
            phase="CHECK_OUT",
        )

        response = self.client.post(self.sleep_url(session.id), {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_session_activate_checkout_happy_path(self):
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            is_active=False,
            phase="CHECK_OUT",
        )

        response = self.client.post(self.activate_checkout_url(session.id), {})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Session activated for checkout")

    def test_session_close_marks_closed(self):
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            is_active=True,
            phase="CHECK_OUT",
        )

        with patch("attendance.api.views.process_attendance_session") as mocked_process:
            response = self.client.delete(self.close_url(session.id), {})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "closed")
        mocked_process.assert_called_once()


class AttendanceRecordViewSetTests(APITestCase):
    """Tests for attendance record endpoints."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.admin = User.objects.create_user(
            email="admin2@test.com",
            password="password123",
        )
        cls.admin.roles.add(cls.admin_role)

        cls.employee_user = User.objects.create_user(
            email="employee2@test.com",
            password="password123",
        )
        cls.employee = Employee.objects.create(
            user=cls.employee_user,
            full_name="Jane Doe",
            employee_code="EMP002",
            department=None,
        )

        cls.shift = Shift.objects.create(
            name="Record Shift",
            start_time=time(8, 0),
            end_time=time(16, 0),
            monday=True,
        )
        cls.employee_shift = EmployeeShift.objects.create(
            employee=cls.employee,
            shift=cls.shift,
        )

        cls.list_url = reverse("attendance-list")
        cls.check_in_url = reverse("attendance-taking-list")
        cls.check_out_url = reverse("attendance-checkout-list")

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_attendance_record_list_is_paginated(self):
        base_date = date(2026, 2, 1)
        for i in range(30):
            AttendanceRecord.objects.create(
                employee=self.employee,
                employee_shift=self.employee_shift,
                date=base_date + timedelta(days=i),
                taken_by=self.admin,
            )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 30)
        self.assertEqual(len(response.data["results"]), 25)

    def test_attendance_check_in_success(self):
        AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            is_active=True,
            phase="CHECK_IN",
        )

        with patch(
            "attendance.api.views.AttendanceSessionService.check_in_next_worker",
            return_value="STOP_SUCCESS",
        ):
            response = self.client.post(
                self.check_in_url,
                {"image": SimpleUploadedFile("face.jpg", b"fake")},
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["detail"], "Attendance recorded successfully")

    def test_attendance_check_in_duplicate(self):
        AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            is_active=True,
            phase="CHECK_IN",
        )

        with patch(
            "attendance.api.views.AttendanceSessionService.check_in_next_worker",
            return_value="STOP_DUPLICATE",
        ):
            response = self.client.post(
                self.check_in_url,
                {"image": SimpleUploadedFile("face.jpg", b"fake")},
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_attendance_check_out_success(self):
        AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            is_active=True,
            phase="CHECK_OUT",
        )

        with patch(
            "attendance.api.views.AttendanceSessionService.check_in_next_worker",
            return_value="STOP_SUCCESS",
        ):
            response = self.client.post(
                self.check_out_url,
                {"image": SimpleUploadedFile("face.jpg", b"fake")},
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["detail"], "Checkout recorded successfully")

    def test_attendance_list_mine_scope_for_employee(self):
        employee_user = User.objects.create_user(
            email="employee-scope@test.com", password="password123"
        )
        employee = Employee.objects.create(
            user=employee_user, full_name="Scoped", employee_code="EMP-SCOPE"
        )
        employee_shift = EmployeeShift.objects.create(
            employee=employee, shift=self.shift
        )

        AttendanceRecord.objects.create(
            employee=employee,
            employee_shift=employee_shift,
            date=date(2026, 2, 1),
            taken_by=self.admin,
        )

        AttendanceRecord.objects.create(
            employee=self.employee,
            employee_shift=self.employee_shift,
            date=date(2026, 2, 1),
            taken_by=self.admin,
        )

        self.client.force_authenticate(employee_user)
        response = self.client.get(self.list_url + "?mine=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
