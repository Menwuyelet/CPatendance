from django.utils import timezone
from accounts.policies.attendance import AttendancePolicy
from attendance.models import AttendanceRecord, AttendanceSessionEntry
from .status import evaluate_status
from django.db import transaction
from attendance.models import EmployeeShift
from employees.models import Employee
def mark_attendance(employee, user, session, check_in_time=None):
    if not AttendancePolicy.can_take_attendance(user, employee):
        return None
    shift = session.shift
    employee_shift = EmployeeShift.objects.get(
                employee_id=employee,
                shift=shift
            )
    record, _ = AttendanceRecord.objects.get_or_create(
        employee=employee,
        date=session.date,
        employee_shift=employee_shift.id,
        defaults={
            "taken_by": user
        }
    )
    print("This runs mark attendance")
    record.check_in_time = check_in_time or timezone.now()
    record.status = evaluate_status(record)
    record.save()

    return record



class AttendanceAbsenceService:
    """
    Marks ABSENT employees for a session by comparing:
    - Employees assigned to the session's shift
    - Employees detected in the session
    """

    @staticmethod
    @transaction.atomic
    def mark_absent_for_session(session):
        shift = session.shift

        print(f"[INFO] Evaluating absences for session {session.id}")

        # 1. Employees assigned to this shift
        employee_ids = EmployeeShift.objects.filter(
            shift=shift
        ).values_list("employee_id", flat=True)

        # 2. Attendance records created during this session
        session_records = AttendanceSessionEntry.objects.filter(
            session=session
        )

        # 3. Employees who WERE detected
        detected_employee_ids = set(
            session_records
            .filter(recognized_at__isnull=False)
            .values_list("employee_id", flat=True)
        )

        absent_count = 0

        for employee in employee_ids:
            # Employee detected → skip
            if employee in detected_employee_ids:
                continue


            employee_shift = EmployeeShift.objects.get(
                employee_id=employee,
                shift=shift
            )
            # 4. Get or create attendance record
            record, created = AttendanceRecord.objects.get_or_create(
                employee=Employee.objects.get(id=employee),
                date=session.date,
                employee_shift=employee_shift,
                defaults={
                    "status": "ABSENT",
                    "created_at": timezone.now(),
                    "taken_by": session.started_by
                }
            )

            # 5. If record exists but not yet evaluated
            if not created and record.status is None:
                record.status = "ABSENT"
                record.save(update_fields=["status", "marked_at"])

            absent_count += 1

        print(f"[INFO] Marked {absent_count} employees as ABSENT")
        return absent_count

