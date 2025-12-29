# from django.utils import timezone
# from attendance.models import (
#     Shift,
#     EmployeeShift,
#     AttendanceSession,
#     AttendanceSessionEntry
# )
# from backend.AI.controller import start_session
# from biometrics.services.matching_service import BiometricMatchingService
# # adapters (still abstract)
# # from ai.camera import start_camera, stop_camera, recognize_single_employee


# class AttendanceSessionService:
#     """
#     DB-backed attendance session.
#     One recognition per call.
#     """

#     def __init__(self, session: AttendanceSession):
#         self.session = session
#         self.decision = None
#     # -------------------------
#     # SESSION INITIALIZATION
#     # -------------------------
#     def backend_handler(self, embedding):
#         ## process embedding and return result
#         return self.decision

#     @classmethod
#     def start_session(cls, shift: Shift, user):
#         if AttendanceSession.objects.filter(
#             shift=shift,
#             is_active=True
#         ).exists():
#             raise RuntimeError("Active session already exists for this shift")

#         employees = EmployeeShift.objects.filter(shift=shift)
#         if not employees.exists():
#             raise ValueError("No employees assigned to this shift")

#         session = AttendanceSession.objects.create(
#             shift=shift,
#             started_by=user
#         )

#         return cls(session)

#     # -------------------------
#     # SINGLE WORKER CHECK-IN
#     # -------------------------
#     def check_in_next_worker(self):
#         if not self.session.is_active:
#             raise RuntimeError("Session is closed")

#         # start_camera()
#         print("simulating camera start...")
#         try:
#             ## AI call to send embeddidngs of a face detected in camera
#             # result = recognize_single_employee()
#             result = start_session(self.backend_handler) # process embedding and return true or false
#             employee_id = BiometricMatchingService.match_face(result, self.session.shift)
#             recognized_at = result.get("timestamp", timezone.now())
#             print(f"recognized employee ID: {employee_id}")
#             # if not EmployeeShift.objects.filter(
#             #     shift=self.session.shift,
#             #     employee_id=employee_id
#             # ).exists():
#             #     return {"status": "ignored", "reason": "not_in_shift"}
#             if not employee_id:
#                 self.decision = "STOP_UNKNOWN"
#                 return {"status": "ignored", "reason": "no_match"}
#             entry, created = AttendanceSessionEntry.objects.get_or_create(
#                 session=self.session,
#                 employee_id=employee_id,
#                 defaults={"recognized_at": recognized_at}
#             )

#             if not created:
#                 self.decision = "STOP_DUPLICATE"
#                 return {"status": "ignored", "reason": "already_checked_in"}
#             self.decision = "STOP_SUCCESS"
#             return {
#                 "status": "success",
#                 "employee_id": employee_id,
#                 "recognized_at": recognized_at
#             }

#         finally:
#             # stop_camera()

#     # -------------------------
#     # SESSION CLOSE
#     # -------------------------
#     def close(self):
#         self.session.close()

#         return {
#             entry.employee_id: entry.recognized_at
#             for entry in self.session.entries.all()
#         }

from django.utils import timezone
from attendance.models import AttendanceSessionEntry
from biometrics.services.matching_service import BiometricMatchingService
from AI.controller.recognition_loop import run_recognition_loop


class AttendanceSessionService:
    def __init__(self, session):
        self.session = session

    def process_embedding(self, embedding):
        if embedding is None:
            return "STOP_UNKNOWN"

        employee_id = BiometricMatchingService.match_face(
            embedding, self.session.shift
        )

        if not employee_id:
            return "CONTINUE"

        entry, created = AttendanceSessionEntry.objects.get_or_create(
            session=self.session,
            employee_id=employee_id,
            defaults={"recognized_at": timezone.now()},
        )

        if not created:
            return "STOP_DUPLICATE"

        return "STOP_SUCCESS"

    def run(self):
        run_recognition_loop(self.process_embedding)

