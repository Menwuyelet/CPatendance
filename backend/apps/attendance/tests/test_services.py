"""
Service-level and status tests for the attendance app.
"""

from datetime import date, datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from accounts.constants import Roles
from accounts.models import Role, User
from attendance.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceSessionEntry,
    EmployeeLeave,
    EmployeeShift,
    Shift,
)
from attendance.models.atendance_session import SessionPhase
from attendance.services.attendance_session_service import AttendanceSessionService
from attendance.services.employee_shift_service import EmployeeShiftService
from attendance.services.process_session_service import process_attendance_session
from attendance.services.shift_resolution_service import ShiftResolutionService
from attendance.services.status import (
    combine_date_time,
    evaluate_final_status,
    evaluate_status,
)
from employees.models import Employee


class AttendanceServiceBase(TestCase):
    """Shared fixtures for attendance service tests."""

    @classmethod
    def setUpTestData(cls):
        cls.today = timezone.now().date()

        cls.admin_role, _ = Role.objects.get_or_create(name=Roles.ADMIN)
        cls.admin = User.objects.create_user(
            email="admin-service@test.com",
            password="password123",
            employee_code="ADM-001",
        )
        cls.admin.roles.add(cls.admin_role)

        cls.employee_user = User.objects.create_user(
            email="employee1-service@test.com",
            password="password123",
            employee_code="EMP-001",
        )
        cls.employee = Employee.objects.create(
            user=cls.employee_user,
            full_name="Employee One",
            employee_code="EMP-001",
            department=None,
        )

        cls.employee2_user = User.objects.create_user(
            email="employee2-service@test.com",
            password="password123",
            employee_code="EMP-002",
        )
        cls.employee2 = Employee.objects.create(
            user=cls.employee2_user,
            full_name="Employee Two",
            employee_code="EMP-002",
            department=None,
        )

        cls.employee3_user = User.objects.create_user(
            email="employee3-service@test.com",
            password="password123",
            employee_code="EMP-003",
        )
        cls.employee3 = Employee.objects.create(
            user=cls.employee3_user,
            full_name="Employee Three",
            employee_code="EMP-003",
            department=None,
        )

        cls.unassigned_user = User.objects.create_user(
            email="employee4-service@test.com",
            password="password123",
            employee_code="EMP-004",
        )
        cls.unassigned_employee = Employee.objects.create(
            user=cls.unassigned_user,
            full_name="Employee Four",
            employee_code="EMP-004",
            department=None,
        )

        cls.shift = Shift.objects.create(
            name="Day Shift",
            start_time=time(8, 0),
            end_time=time(16, 0),
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
            saturday=True,
            sunday=True,
        )

        cls.employee_shift = EmployeeShift.objects.create(
            employee=cls.employee, shift=cls.shift
        )
        cls.employee2_shift = EmployeeShift.objects.create(
            employee=cls.employee2, shift=cls.shift
        )
        cls.employee3_shift = EmployeeShift.objects.create(
            employee=cls.employee3, shift=cls.shift
        )

        cls.shift_a = Shift.objects.create(
            name="Shift A",
            start_time=time(6, 0),
            end_time=time(14, 0),
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
            saturday=True,
            sunday=True,
        )
        cls.shift_b = Shift.objects.create(
            name="Shift B",
            start_time=time(14, 0),
            end_time=time(22, 0),
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
            saturday=True,
            sunday=True,
        )
        cls.shift_c = Shift.objects.create(
            name="Shift C",
            start_time=time(22, 0),
            end_time=time(6, 0),
            monday=True,
            tuesday=True,
            wednesday=True,
            thursday=True,
            friday=True,
            saturday=True,
            sunday=True,
        )

    def _aware(self, dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())

    def _make_record(
        self,
        *,
        employee=None,
        employee_shift=None,
        check_in=None,
        check_out=None,
        status="ABSENT"
    ):
        return AttendanceRecord.objects.create(
            employee=employee or self.employee,
            employee_shift=employee_shift or self.employee_shift,
            date=self.today,
            check_in_time=check_in,
            check_out_time=check_out,
            status=status,
            taken_by=self.admin,
        )


class StatusEvaluationTests(AttendanceServiceBase):
    """Unit tests for status evaluation helpers."""

    def test_evaluate_status_present_within_grace(self):
        check_in = combine_date_time(self.today, time(8, 10))
        record = self._make_record(check_in=check_in)

        self.assertEqual(evaluate_status(record), "PRESENT")

    def test_evaluate_status_late_after_grace(self):
        check_in = combine_date_time(self.today, time(8, 20))
        record = self._make_record(check_in=check_in)

        self.assertEqual(evaluate_status(record), "LATE")

    def test_evaluate_final_status_on_leave_is_preserved(self):
        record = self._make_record(status="ON_LEAVE")
        self.assertEqual(evaluate_final_status(record), "ON_LEAVE")

    def test_evaluate_final_status_absent_when_missing_checkout(self):
        check_in = combine_date_time(self.today, time(8, 5))
        record = self._make_record(check_in=check_in)

        self.assertEqual(evaluate_final_status(record), "ABSENT")

    def test_evaluate_final_status_early_leave(self):
        check_in = combine_date_time(self.today, time(8, 5))
        checkout = combine_date_time(self.today, time(15, 30))
        record = self._make_record(check_in=check_in, check_out=checkout)

        self.assertEqual(evaluate_final_status(record), "EARLY_LEAVE")

    def test_evaluate_final_status_late_when_checkin_after_grace(self):
        check_in = combine_date_time(self.today, time(8, 20))
        checkout = combine_date_time(self.today, time(16, 5))
        record = self._make_record(check_in=check_in, check_out=checkout)

        self.assertEqual(evaluate_final_status(record), "LATE")

    def test_evaluate_final_status_present_with_complete_window(self):
        check_in = combine_date_time(self.today, time(8, 5))
        checkout = combine_date_time(self.today, time(16, 10))
        record = self._make_record(check_in=check_in, check_out=checkout)

        self.assertEqual(evaluate_final_status(record), "PRESENT")


class EmployeeShiftServiceTests(AttendanceServiceBase):
    """Tests for shift assignment and resolution limits."""

    def test_assign_shift_limits_to_two_per_day(self):
        EmployeeShiftService.assign_shift(self.unassigned_employee, self.shift_a)
        EmployeeShiftService.assign_shift(self.unassigned_employee, self.shift_b)

        with self.assertRaises(ValidationError):
            EmployeeShiftService.assign_shift(self.unassigned_employee, self.shift_c)

    def test_shift_resolution_raises_when_more_than_two_applicable(self):
        EmployeeShift.objects.create(
            employee=self.unassigned_employee, shift=self.shift_a
        )
        EmployeeShift.objects.create(
            employee=self.unassigned_employee, shift=self.shift_b
        )
        EmployeeShift.objects.create(
            employee=self.unassigned_employee, shift=self.shift_c
        )

        with self.assertRaises(ValidationError):
            ShiftResolutionService.get_employee_shifts_for_date(
                self.unassigned_employee, self.today
            )


class ProcessSessionServiceTests(AttendanceServiceBase):
    """Tests for session processing and lifecycle."""

    def test_process_attendance_session_creates_records_once(self):
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            started_at=combine_date_time(self.today, time(8, 0)),
            is_active=False,
            is_processed=False,
        )

        recognized_at = combine_date_time(self.today, time(8, 5))
        AttendanceSessionEntry.objects.create(
            session=session,
            employee=self.employee,
            recognized_at=recognized_at,
        )

        process_attendance_session(session, self.admin)

        records = AttendanceRecord.objects.filter(employee=self.employee)
        self.assertEqual(records.count(), 1)
        record = records.first()
        self.assertEqual(record.check_in_time, recognized_at)
        self.assertEqual(record.status, "PRESENT")

        session.refresh_from_db()
        self.assertTrue(session.is_processed)

        process_attendance_session(session, self.admin)
        self.assertEqual(
            AttendanceRecord.objects.filter(employee=self.employee).count(), 1
        )

    def test_session_sleep_checkout_and_close_flow(self):
        session = AttendanceSession.objects.create(
            shift=self.shift,
            started_by=self.admin,
            started_at=combine_date_time(self.today, time(8, 0)),
            is_active=True,
            phase=SessionPhase.CHECK_IN,
        )

        recognized_at = combine_date_time(self.today, time(8, 5))
        entry = AttendanceSessionEntry.objects.create(
            session=session,
            employee=self.employee,
            recognized_at=recognized_at,
        )

        EmployeeLeave.objects.create(
            employee=self.employee2,
            start_date=self.today,
            end_date=self.today,
            created_by=self.admin,
        )

        service = AttendanceSessionService(session)
        service.make_sleep()

        present_record = AttendanceRecord.objects.get(employee=self.employee)
        leave_record = AttendanceRecord.objects.get(employee=self.employee2)
        absent_record = AttendanceRecord.objects.get(employee=self.employee3)

        self.assertEqual(present_record.status, "PRESENT")
        self.assertEqual(leave_record.status, "ON_LEAVE")
        self.assertEqual(absent_record.status, "ABSENT")

        service.activate_checkout()

        entry.checkout_recognized_at = combine_date_time(self.today, time(16, 5))
        entry.save(update_fields=["checkout_recognized_at"])

        service.close()

        present_record.refresh_from_db()
        leave_record.refresh_from_db()
        absent_record.refresh_from_db()
        session.refresh_from_db()

        self.assertEqual(present_record.status, "PRESENT")
        self.assertIsNotNone(present_record.check_out_time)
        self.assertEqual(leave_record.status, "ON_LEAVE")
        self.assertIsNone(leave_record.check_in_time)
        self.assertEqual(absent_record.status, "ABSENT")
        self.assertFalse(session.is_active)
        self.assertEqual(session.phase, SessionPhase.CLOSED)
