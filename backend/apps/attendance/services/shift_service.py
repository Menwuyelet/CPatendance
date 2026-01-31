"""Module backend/apps/attendance/services/shift_service.py

This file contains services used to manage and control shift activities.
"""

from attendance.models.shift import Shift
from config.logging import get_logger

logger = get_logger(__name__)


class ShiftService:
    """Utility functions for creating, updating and listing `Shift` models.

    Centralizes basic CRUD operations for `Shift` so callers do not
    directly manipulate the model in multiple places.
    """

    @staticmethod
    def list_shifts():
        """Return all `Shift` objects ordered by start time."""

        logger.info("SHIFT_LIST_STARTED")

        qs = Shift.objects.all().order_by("start_time")

        logger.info("SHIFT_LIST_SUCCESS | count=%s", qs.count())

        return qs

    @staticmethod
    def create_shift(data):
        """Create a `Shift` instance from validated `data` dict."""

        logger.info("SHIFT_CREATE_STARTED")

        shift = Shift.objects.create(**data)

        logger.info("SHIFT_CREATE_SUCCESS | shift_id=%s", shift.id)

        return shift

    @staticmethod
    def update_shift(shift, data):
        """Apply `data` updates to `shift` and persist the model."""

        logger.info("SHIFT_UPDATE_STARTED | shift_id=%s", shift.id)

        for field, value in data.items():
            setattr(shift, field, value)

        shift.save()

        logger.info("SHIFT_UPDATE_SUCCESS | shift_id=%s", shift.id)

        return shift

    @staticmethod
    def delete_shift(shift):
        """Permanently delete the provided `Shift` instance."""
        shift_id = shift.id

        logger.info("SHIFT_DELETE_STARTED | shift_id=%s", shift_id)

        shift.delete()

        logger.info("SHIFT_DELETE_SUCCESS | shift_id=%s", shift_id)
