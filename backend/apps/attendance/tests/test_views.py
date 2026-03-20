"""
Module: backend/apps/attendance/tests/test_views.py

API tests for attendance viewsets.
"""

from datetime import datetime, time, timedelta, date
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import Roles
from accounts.models import Role, User
from attendance.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceSessionEntry,
    EmployeeShift,
    Shift,
)
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


class AttendanceTakingViewSetTests(APITestCase):
    """Tests for attendance check-in/check-out endpoint."""

    @classmethod
    def setUpTestData(cls):
        cls.admin_role, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.admin = User.objects.create_user(
            email="admin3@test.com",
            password="password123",
        )
        cls.admin.roles.add(cls.admin_role)

        cls.employee_user = User.objects.create_user(
            email="employee3@test.com",
            password="password123",
        )
        cls.employee = Employee.objects.create(
            user=cls.employee_user,
            full_name="Jamie Doe",
            employee_code="EMP003",
            department=None,
        )

        cls.shift = Shift.objects.create(
            name="Test Shift",
            start_time=time(8, 0),
            end_time=time(16, 0),
            monday=True,
        )

        cls.session = AttendanceSession.objects.create(
            shift=cls.shift,
            started_by=cls.admin,
            is_active=True,
        )

        cls.url = reverse("attendance-taking-list")
        cls.end_check_in_url = reverse(
            "attendance-manage-sessions-end-check-in", args=[cls.session.id]
        )
        cls.start_check_out_url = reverse(
            "attendance-manage-sessions-start-check-out", args=[cls.session.id]
        )

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def _image(self):
        return SimpleUploadedFile("face.jpg", b"fake-image", content_type="image/jpeg")

    def test_check_in_then_check_out(self):
        with patch(
            "attendance.services.face_engine.FaceEngine.image_to_embedding",
            return_value=b"embedding",
        ), patch(
            "attendance.services.matching_service.BiometricMatchingService.match_face",
            return_value=self.employee.id,
        ):
            check_in_response = self.client.post(
                self.url,
                {"image": self._image(), "action": "check_in"},
                format="multipart",
            )

            self.assertEqual(check_in_response.status_code, status.HTTP_201_CREATED)

            end_check_in_response = self.client.post(self.end_check_in_url)
            self.assertEqual(end_check_in_response.status_code, status.HTTP_200_OK)

            start_check_out_response = self.client.post(self.start_check_out_url)
            self.assertEqual(start_check_out_response.status_code, status.HTTP_200_OK)

            check_out_response = self.client.post(
                self.url,
                {"image": self._image(), "action": "check_out"},
                format="multipart",
            )

        self.assertEqual(check_out_response.status_code, status.HTTP_201_CREATED)
        entry = AttendanceSessionEntry.objects.get(
            session=self.session, employee=self.employee
        )
        self.assertIsNotNone(entry.check_out_at)

    def test_check_out_requires_check_in(self):
        with patch(
            "attendance.services.face_engine.FaceEngine.image_to_embedding",
            return_value=b"embedding",
        ), patch(
            "attendance.services.matching_service.BiometricMatchingService.match_face",
            return_value=self.employee.id,
        ):
            response = self.client.post(
                self.url,
                {"image": self._image(), "action": "check_out"},
                format="multipart",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
