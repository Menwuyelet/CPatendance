from django.utils import timezone    
from datetime import datetime, timedelta

def combine_date_time(date, time):
    return timezone.make_aware(datetime.combine(date, time))

def evaluate_status(record):
    shift = record.employee_shift.shift
    shift_start = combine_date_time(
        record.date,
        shift.start_time
    )

    grace = timedelta(minutes=15)

    if record.check_in_time <= shift_start + grace:
        return "PRESENT"
    return "LATE"