"""Module backend/apps/attendance/services/status.py

This file contains the services used to evaluate the users status.
"""

from django.utils import timezone
from datetime import datetime, timedelta
from config.logging import get_logger

logger = get_logger(__name__)


def combine_date_time(date, time):
    """Combine a `date` and `time` into an aware datetime.

    Returns a timezone-aware `datetime` using Django's timezone utilities.
    """
    logger.debug("COMBINE_DATE_TIME | date=%s time=%s", date, time)

    return timezone.make_aware(datetime.combine(date, time))


def evaluate_status(record):
    """Evaluate attendance status (PRESENT or LATE) for a record.

    Returns a status string based on whether `check_in_time` falls within a
    grace period after the shift start.
    """
    logger.info(
        "EVALUATE_STATUS_STARTED | record_id=%s employee_id=%s",
        record.id,
        record.employee_id,
    )

    shift = record.employee_shift.shift
    shift_start = combine_date_time(record.date, shift.start_time)

    grace = timedelta(minutes=15)

    if record.check_in_time <= shift_start + grace:
        logger.info(
            "EVALUATE_STATUS_RESULT | record_id=%s status=PRESENT",
            record.id,
        )
        return "PRESENT"

    logger.info(
        "EVALUATE_STATUS_RESULT | record_id=%s status=LATE",
        record.id,
    )

    return "LATE"
