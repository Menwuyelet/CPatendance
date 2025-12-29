from django.utils import timezone
from attendance.models import (
    Shift,
    EmployeeShift,
    AttendanceSession,
    AttendanceSessionEntry
)
from biometrics.services.matching_service import BiometricMatchingService
# adapters (still abstract)
# from ai.camera import start_camera, stop_camera, recognize_single_employee


class AttendanceSessionService:
    """
    DB-backed attendance session.
    One recognition per call.
    """

    def __init__(self, session: AttendanceSession):
        self.session = session

    # -------------------------
    # SESSION INITIALIZATION
    # -------------------------
    @classmethod
    def start_session(cls, shift: Shift, user):
        if AttendanceSession.objects.filter(
            shift=shift,
            is_active=True
        ).exists():
            raise RuntimeError("Active session already exists for this shift")

        employees = EmployeeShift.objects.filter(shift=shift)
        if not employees.exists():
            raise ValueError("No employees assigned to this shift")

        session = AttendanceSession.objects.create(
            shift=shift,
            started_by=user
        )

        return cls(session)

    # -------------------------
    # SINGLE WORKER CHECK-IN
    # -------------------------
    def check_in_next_worker(self):
        if not self.session.is_active:
            raise RuntimeError("Session is closed")

        # start_camera()
        print("simulating camera start...")
        try:
            ## AI call to send embeddidngs of a face detected in camera
            # result = recognize_single_employee()
            result = {
                "embedding": [1, 2, 4],
                "timestamp": timezone.now()
            }
            employee_id = BiometricMatchingService.match_face(result.get("embedding"))
            recognized_at = result.get("timestamp", timezone.now())
            print(f"recognized employee ID: {employee_id}")
            # if not EmployeeShift.objects.filter(
            #     shift=self.session.shift,
            #     employee_id=employee_id
            # ).exists():
            #     return {"status": "ignored", "reason": "not_in_shift"}
            if not employee_id:
                return {"status": "ignored", "reason": "no_match"}
            entry, created = AttendanceSessionEntry.objects.get_or_create(
                session=self.session,
                employee_id=employee_id,
                defaults={"recognized_at": recognized_at}
            )

            if not created:
                return {"status": "ignored", "reason": "already_checked_in"}

            return {
                "status": "success",
                "employee_id": employee_id,
                "recognized_at": recognized_at
            }

        finally:
            # stop_camera()
            print("simulating camera stop...")

    # -------------------------
    # SESSION CLOSE
    # -------------------------
    def close(self):
        self.session.close()

        return {
            entry.employee_id: entry.recognized_at
            for entry in self.session.entries.all()
        }
