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
    Handles attendance recognition logic
    """

    def __init__(self, session):
        self.session = session

    def process_embedding(self, embedding):
        if embedding is None:
            return "CONTINUE"

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
