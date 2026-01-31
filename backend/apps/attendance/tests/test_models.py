"""
Module: backend/apps/attendance/tests/test_models.py

Unit tests for attendance app models.
"""

from datetime import date, time, timedelta
from django.test import TestCase
from django.utils import timezone
from django.db import IntegrityError

from attendance.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceSessionEntry,
    EmployeeShift,
    Shift,
)

from employees.models import Employee
from accounts.models import User


class AttendanceModelBase(TestCase):
    """Base test case that sets up shared objects for attendance model tests."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="admin@test.com",
            password="password123"
        )

        # User linked to employee
        cls.employee_user = User.objects.create_user(
            email="employee@test.com",
            password="password123"
        )
        
        # Employee (must match real model fields)
        cls.employee = Employee.objects.create(
            user=cls.employee_user,
            full_name="John Doe",
            employee_code="EMP001",
            department=None,
        )

        cls.shift = Shift.objects.create(
            name="Morning Shift",
            start_time=time(8, 0),
            end_time=time(16, 0),
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
        )

        cls.employee_shift = EmployeeShift.objects.create(
            employee=cls.employee,
            shift=cls.shift
        )


class AttendanceRecordModelTest(AttendanceModelBase):
    """Tests for the AttendanceRecord model."""

    def test_create_attendance_record(self):
        """AttendanceRecord should be created with valid fields."""
        record = AttendanceRecord.objects.create(
            employee=self.employee,
            employee_shift=self.employee_shift,
            date=date.today(),
            taken_by=self.user,
        )

        self.assertEqual(record.status, "ABSENT")
        self.assertEqual(record.employee, self.employee)

    def test_unique_attendance_record_per_employee_shift_and_date(self):
        """AttendanceRecord must be unique per (employee, employee_shift, date)."""
        AttendanceRecord.objects.create(
            employee=self.employee,
            employee_shift=self.employee_shift,
            date=date.today(),
        )

        with self.assertRaises(IntegrityError):
            AttendanceRecord.objects.create(
                employee=self.employee,
                employee_shift=self.employee_shift,
                date=date.today(),
            )


class AttendanceSessionModelTest(AttendanceModelBase):
    """Tests for the AttendanceSession model."""

    def test_default_session_values(self):
        """AttendanceSession should default to active and not processed."""
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.user
        )

        self.assertTrue(session.is_active)
        self.assertFalse(session.is_processed)
        self.assertIsNotNone(session.started_at)

    def test_session_date_property(self):
        """date property should return the date of started_at."""
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.user
        )

        self.assertEqual(session.date, session.started_at.date())

    def test_close_session(self):
        """close() should deactivate the session and set ended_at."""
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.user
        )

        session.close()
        session.refresh_from_db()

        self.assertFalse(session.is_active)
        self.assertIsNotNone(session.ended_at)


class EmployeeShiftModelTest(AttendanceModelBase):
    """Tests for the EmployeeShift model."""

    def test_unique_employee_shift_constraint(self):
        """An employee cannot be assigned to the same shift twice."""
        with self.assertRaises(IntegrityError):
            EmployeeShift.objects.create(
                employee=self.employee,
                shift=self.shift
            )


class AttendanceSessionEntryModelTest(AttendanceModelBase):
    """Tests for the AttendanceSessionEntry model."""

    def test_unique_session_employee_entry(self):
        """Employee can appear only once per attendance session."""
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.user
        )

        AttendanceSessionEntry.objects.create(
            session=session,
            employee=self.employee,
            recognized_at=timezone.now()
        )

        with self.assertRaises(IntegrityError):
            AttendanceSessionEntry.objects.create(
                session=session,
                employee=self.employee,
                recognized_at=timezone.now()
            )


class ShiftModelTest(TestCase):
    """Tests for the Shift model."""

    def setUp(self):
        self.shift = Shift.objects.create(
            name="Night Shift",
            start_time=time(22, 0),
            end_time=time(6, 0),
            monday=True
        )

    def test_shift_string_representation(self):
        """__str__ should return the shift name."""
        self.assertEqual(str(self.shift), "Night Shift")

    def test_applies_today(self):
        """applies_today should respect weekday flags."""
        monday = date(2024, 1, 1)  # Monday
        tuesday = monday + timedelta(days=1)

        self.assertTrue(self.shift.applies_today(monday))
        self.assertFalse(self.shift.applies_today(tuesday))

    def test_unique_shift_constraint(self):
        """Shift with same name and time range must be unique."""
        with self.assertRaises(IntegrityError):
            Shift.objects.create(
                name="Night Shift",
                start_time=time(22, 0),
                end_time=time(6, 0),
            )
