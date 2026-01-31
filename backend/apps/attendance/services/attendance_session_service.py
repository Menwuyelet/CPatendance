"""Module backend/apps/attendance/services/attendance_session_service.py

This file contains the Attendacne sessions service class used to handle session acctivities.
"""

from django.utils import timezone
from attendance.models import AttendanceSessionEntry
from biometrics.services.matching_service import BiometricMatchingService
from attendance.services.attendance_service import AttendanceAbsenceService
from biometrics.services.face_engine import FaceEngine
from config.logging import get_logger

logger = get_logger(__name__)


class AttendanceSessionService:
    """
    Attendance business logic
    """

    def __init__(self, session):
        """Initialize the service with an `AttendanceSession` instance."""
        self.session = session

    def process_embedding(self, embedding):
        """Process a single face embedding and record a session entry.

        Returns a status string indicating how the caller should proceed:
        - "NO_ACTIVE_SESSION" when session inactive or error
        - "TRY_AGAIN" when no matching employee
        - "STOP_DUPLICATE" when the employee already has an entry
        - "STOP_SUCCESS" when an entry was created
        - "NO_FACE_DETECTED" when no face is detected on the image sent
        """
        if not self.session.is_active:
            logger.warning(
                "SESSION_PROCESS_DENIED | reason=session_inactive | session_id=%s",
                self.session.id,
            )
            return "NO_ACTIVE_SESSION"

        employee_id = BiometricMatchingService.match_face(embedding, self.session.shift)

        if not employee_id:
            logger.info(
                "SESSION_EMBEDDING_PROCESS_STARTED | session_id=%s",
                self.session.id,
            )
            return "TRY_AGAIN"

        entry, created = AttendanceSessionEntry.objects.get_or_create(
            session=self.session,
            employee_id=employee_id,
            defaults={"recognized_at": timezone.now()},
        )

        if not created:
            print(f"[WARN] Duplicate entry for {entry.employee}")
            return "STOP_DUPLICATE"

        return "STOP_SUCCESS"

    def check_in_next_worker(self, image_bytes):
        """Convert an uploaded image to an embedding and process it.

        Returns the same status strings as `process_embedding`.
        """
        embedding = FaceEngine.image_to_embedding(image_bytes)

        if embedding is None:
            logger.info(
                "SESSION_NO_FACE_DETECTED | session_id=%s",
                self.session.id,
            )
            return "NO_FACE_DETECTED"

        return self.process_embedding(embedding)

    def close(self):
        """
        Close session and return raw session entries.
        Does NOT create AttendanceRecord.
        """
        if not self.session.is_active:
            return []

        AttendanceAbsenceService.mark_absent_for_session(self.session)
        self.session.is_active = False
        self.session.ended_at = timezone.now()
        self.session.save(update_fields=["is_active", "ended_at"])

        return list(
            self.session.entries.select_related("employee").order_by("recognized_at")
        )
