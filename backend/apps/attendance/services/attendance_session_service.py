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

        logger.info(
            "ATTENDANCE_SESSION_SERVICE_INIT | session_id=%s",
            session.id,
        )

    def _match_employee(self, embedding):
        """Match a face embedding to an employee id or return None."""
        return BiometricMatchingService.match_face(embedding, self.session.shift)

    def process_check_in(self, embedding):
        """Process a face embedding for check-in.

        Returns a status string:
        - "NO_ACTIVE_SESSION" when session inactive
        - "TRY_AGAIN" when no matching employee
        - "STOP_DUPLICATE" when already checked in
        - "STOP_SUCCESS" when check-in recorded
        """
        if not self.session.is_active:
            logger.warning(
                "SESSION_PROCESS_DENIED | reason=session_inactive | session_id=%s",
                self.session.id,
            )
            return "NO_ACTIVE_SESSION"

        if self.session.phase != self.session.PHASE_CHECK_IN:
            logger.warning(
                "SESSION_PROCESS_DENIED | reason=not_check_in_phase | session_id=%s",
                self.session.id,
            )
            return "NOT_IN_CHECK_IN"

        employee_id = self._match_employee(embedding)

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
            logger.warning(
                "SESSION_DUPLICATE_ENTRY | session_id=%s | employee_id=%s",
                self.session.id,
                employee_id,
            )
            return "STOP_DUPLICATE"

        logger.info(
            "SESSION_ENTRY_CREATED | session_id=%s | employee_id=%s",
            self.session.id,
            employee_id,
        )
        return "STOP_SUCCESS"

    def process_check_out(self, embedding):
        """Process a face embedding for check-out.

        Returns a status string:
        - "NO_ACTIVE_SESSION" when session inactive
        - "TRY_AGAIN" when no matching employee
        - "NO_CHECK_IN" when no check-in exists
        - "ALREADY_CHECKED_OUT" when checkout already recorded
        - "CHECK_OUT_SUCCESS" when checkout recorded
        """
        if not self.session.is_active:
            logger.warning(
                "SESSION_PROCESS_DENIED | reason=session_inactive | session_id=%s",
                self.session.id,
            )
            return "NO_ACTIVE_SESSION"

        if self.session.phase != self.session.PHASE_CHECK_OUT:
            logger.warning(
                "SESSION_PROCESS_DENIED | reason=not_check_out_phase | session_id=%s",
                self.session.id,
            )
            return "NOT_IN_CHECK_OUT"

        employee_id = self._match_employee(embedding)

        if not employee_id:
            logger.info(
                "SESSION_EMBEDDING_PROCESS_STARTED | session_id=%s",
                self.session.id,
            )
            return "TRY_AGAIN"

        entry = AttendanceSessionEntry.objects.filter(
            session=self.session,
            employee_id=employee_id,
        ).first()

        if not entry:
            logger.warning(
                "SESSION_CHECK_OUT_MISSING_CHECK_IN | session_id=%s | employee_id=%s",
                self.session.id,
                employee_id,
            )
            return "NO_CHECK_IN"

        if entry.check_out_at:
            logger.warning(
                "SESSION_CHECK_OUT_DUPLICATE | session_id=%s | employee_id=%s",
                self.session.id,
                employee_id,
            )
            return "ALREADY_CHECKED_OUT"

        entry.check_out_at = timezone.now()
        entry.save(update_fields=["check_out_at"])

        logger.info(
            "SESSION_CHECK_OUT_RECORDED | session_id=%s | employee_id=%s",
            self.session.id,
            employee_id,
        )
        return "CHECK_OUT_SUCCESS"

    def check_in_next_worker(self, image_bytes):
        """Convert an uploaded image to an embedding and process it.

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

        return self.process_check_in(embedding)

    def check_out_next_worker(self, image_bytes):
        """Convert an uploaded image to an embedding and record check-out."""
        logger.info(
            "SESSION_CHECK_OUT_IMAGE_RECEIVED | session_id=%s",
            self.session.id,
        )

        embedding = FaceEngine.image_to_embedding(image_bytes)

        if embedding is None:
            logger.info(
                "SESSION_NO_FACE_DETECTED | session_id=%s",
                self.session.id,
            )
            return "NO_FACE_DETECTED"

        return self.process_check_out(embedding)

    def close(self):
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

        absent_count = AttendanceAbsenceService.mark_absent_for_session(self.session)

        now = timezone.now()
        self.session.is_active = False
        self.session.phase = self.session.PHASE_CLOSED
        self.session.check_out_closed_at = self.session.check_out_closed_at or now
        self.session.ended_at = now
        self.session.save(
            update_fields=[
                "is_active",
                "phase",
                "check_out_closed_at",
                "ended_at",
            ]
        )

        logger.info(
            "SESSION_CLOSE_COMPLETED | session_id=%s | absent_count=%s",
            self.session.id,
            absent_count,
        )

        return list(
            self.session.entries.select_related("employee").order_by("recognized_at")
        )
