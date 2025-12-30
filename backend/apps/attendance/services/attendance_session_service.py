from django.utils import timezone
from attendance.models import AttendanceSessionEntry
from biometrics.services.matching_service import BiometricMatchingService
from AI.controller.recognition_loop import run_recognition_loop


# class AttendanceSessionService:
#     def __init__(self, session):
#         self.session = session

#     def process_embedding(self, embedding):
#         if embedding is None:
#             return "STOP_UNKNOWN"

#         employee_id = BiometricMatchingService.match_face(
#             embedding, self.session.shift
#         )

#         if not employee_id:
#             return "CONTINUE"

#         entry, created = AttendanceSessionEntry.objects.get_or_create(
#             session=self.session,
#             employee_id=employee_id,
#             defaults={"recognized_at": timezone.now()},
#         )

#         if not created:
#             return "STOP_DUPLICATE"

#         return "STOP_SUCCESS"

#     def run(self):
#         run_recognition_loop(self.process_embedding)

class AttendanceSessionService:
    """
    Attendance business logic (NO camera code)
    """

    def __init__(self, session):
        self.session = session

    def process_embedding(self, embedding):
        if not self.session.is_active:
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

    def check_in_next_worker(self):
        from AI.controller.recognizer import run_attendance_capture
        run_attendance_capture(self.process_embedding)

    def close(self):
        """
        Close session and return raw session entries.
        Does NOT create AttendanceRecord.
        """
        if not self.session.is_active:
            return []

        self.session.is_active = False
        self.session.ended_at = timezone.now()
        self.session.save(update_fields=["is_active", "ended_at"])

        return list(
            self.session.entries
            .select_related("employee")
            .order_by("recognized_at")
        )