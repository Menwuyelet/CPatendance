"""Module backend/apps/attendance/services/attendance_session_service.py

This file contains the Attendance sessions service class used to handle session acctivities.
"""

from django.utils import timezone
from attendance.models import AttendanceSessionEntry
from attendance.models.atendance_session import SessionPhase
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

        logger.info(
            "ATTENDANCE_SESSION_SERVICE_INIT | session_id=%s",
            session.id,
        )

    def process_embedding(self, embedding):
        """
        Process a single face embedding and record a session entry.

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

        if self.session.phase == SessionPhase.CHECK_IN:
            if not created:
                logger.warning(
                    "SESSION_DUPLICATE_ENTRY | phase=CHECK_IN | session_id=%s | employee_id=%s",
                    self.session.id,
                    employee_id,
                )
                return "STOP_DUPLICATE"

            logger.info(
                "SESSION_ENTRY_CREATED | phase=CHECK_IN | session_id=%s | employee_id=%s",
                self.session.id,
                employee_id,
            )
            return "STOP_SUCCESS"

        if self.session.phase == SessionPhase.CHECK_OUT:
            if entry.checkout_recognized_at:
                logger.warning(
                    "SESSION_DUPLICATE_ENTRY | phase=CHECK_OUT | session_id=%s | employee_id=%s",
                    self.session.id,
                    employee_id,
                )
                return "STOP_DUPLICATE"

            entry.checkout_recognized_at = timezone.now()
            entry.save(update_fields=["checkout_recognized_at"])

            logger.info(
                "SESSION_ENTRY_CREATED | phase=CHECK_OUT | session_id=%s | employee_id=%s",
                self.session.id,
                employee_id,
            )
            return "STOP_SUCCESS"

        logger.warning(
            "SESSION_PROCESS_DENIED | reason=invalid_phase | session_id=%s | phase=%s",
            self.session.id,
            self.session.phase,
        )
        return "NO_ACTIVE_SESSION"

    def check_in_next_worker(self, image_bytes):
        """
        Convert an uploaded image to an embedding and process it.

        Returns the same status strings as `process_embedding`.
        """
        logger.info(
            "SESSION_IMAGE_RECEIVED | session_id=%s",
            self.session.id,
        )

        embedding = FaceEngine.image_to_embedding(image_bytes)

        if embedding is None:
            logger.info(
                "SESSION_NO_FACE_DETECTED | session_id=%s",
                self.session.id,
            )

            return "NO_FACE_DETECTED"

        return self.process_embedding(embedding)

    def make_sleep(self, leave_employee_codes=None):
        """
        Mark the session as a 'sleep' session for checkout session and process check-in attendance.
        """
        leave_employee_codes = leave_employee_codes or []
        self.session.make_sleep()
        AttendanceAbsenceService.process_check_in(self.session, leave_employee_codes)

    def activate_checkout(self):
        """Wake the session for checkout window."""
        self.session.activate_checkout()

    def close(self, leave_employee_codes=None):
        """
        Close session and return raw session entries.
        Does NOT create AttendanceRecord.
        """
        if not self.session.is_active:
            logger.warning(
                "SESSION_CLOSE_SKIPPED | reason=already_closed | session_id=%s",
                self.session.id,
            )
            return []

        logger.info(
            "SESSION_CLOSE_STARTED | session_id=%s",
            self.session.id,
        )

        leave_employee_codes = leave_employee_codes or []

        AttendanceAbsenceService.process_check_out(self.session, leave_employee_codes)

        self.session.close()

        logger.info(
            "SESSION_CLOSE_COMPLETED | session_id=%s",
            self.session.id,
        )

        return list(
            self.session.entries.select_related("employee").order_by("recognized_at")
        )
