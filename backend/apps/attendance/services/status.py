from datetime import datetime, timedelta, timezone    


def combine_date_time(date, time):
    return timezone.make_aware(datetime.combine(date, time))

def evaluate_status(record):
    shift = record.employee_shift.shift
    shift_start = combine_date_time(
        record.date,
        shift.start_time
    )

    grace = timedelta(minutes=shift.grace_period_minutes)

    if record.check_in_time <= shift_start + grace:
        return "PRESENT"
    return "LATE"