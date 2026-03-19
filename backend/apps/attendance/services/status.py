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


def evaluate_final_status(record):
    """Evaluate final status considering both check-in and check-out.

    Priority:
    1. ON_LEAVE (pre-set)
    2. Missing either timestamp → ABSENT
    3. Early leave when checkout before shift end minus grace
    4. Late when check-in after start plus grace
    5. PRESENT otherwise
    """

    # Respect explicit ON_LEAVE set earlier
    if record.status == "ON_LEAVE":
        return "ON_LEAVE"

    if not record.check_in_time or not record.check_out_time:
        return "ABSENT"

    shift = record.employee_shift.shift

    shift_start = combine_date_time(record.date, shift.start_time)
    shift_end = combine_date_time(record.date, shift.end_time)
    if shift_end <= shift_start:
        shift_end = shift_end + timedelta(days=1)

    grace = timedelta(minutes=15)

    if record.check_out_time < shift_end - grace:
        return "EARLY_LEAVE"

    if record.check_in_time > shift_start + grace:
        return "LATE"

    return "PRESENT"
