# """Module backend/apps/attendance/services/daily_jobs.py

# Auto-generated module docstring.
# """

# from django.utils import timezone
# from attendance.models import AttendanceRecord, EmployeeShift


# def mark_absentees():
#     """
#     Marks employees as ABSENT if they have no attendance record for the day.
#     Intended to be run as a scheduled job (cron / celery).
#     """
#     today = timezone.localdate()

#     assignments = EmployeeShift.objects.filter(
#         effective_date__lte=today
#     )

#     for assignment in assignments:
#         AttendanceRecord.objects.get_or_create(
#             employee=assignment.employee,
#             date=today,
#             defaults={
#                 "employee_shift": assignment,
#                 "status": "ABSENT",
#             }
#         )
