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


def evaluate_left_early(record, grace_minutes=15):
    """Return True when `record.check_out_time` is before shift end minus grace.

    Uses the shift assigned to the record to compute the scheduled end. Handles
    overnight shifts by rolling the end time into the next day.
    """
    if not record.check_out_time:
        return False

    shift = record.employee_shift.shift
    shift_start = combine_date_time(record.date, shift.start_time)
    shift_end = combine_date_time(record.date, shift.end_time)

    if shift_end <= shift_start:
        shift_end = shift_end + timedelta(days=1)

    grace_delta = timedelta(minutes=grace_minutes)
    left_early = record.check_out_time < (shift_end - grace_delta)

    logger.info(
        "EVALUATE_EARLY_LEAVE | record_id=%s left_early=%s",
        record.id,
        left_early,
    )

    return left_early
