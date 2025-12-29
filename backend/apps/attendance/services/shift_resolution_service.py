from django.core.exceptions import ValidationError
from django.utils import timezone

from attendance.models import Shift


class ShiftResolutionService:
    @staticmethod
    def get_employee_shifts_for_date(employee, date):
        shifts = Shift.objects.filter(
            employeeshift__employee=employee
        )

        applicable_shifts = [
            shift for shift in shifts
            if shift.applies_today(date)
        ]

        # 🔒 enforce max 2 shifts per day
        if len(applicable_shifts) > 2:
            raise ValidationError(
                "Employee cannot have more than 2 shifts per day."
            )

        return applicable_shifts

    @staticmethod
    def get_today_shifts(employee):
        today = timezone.now().date()
        shifts = ShiftResolutionService.get_employee_shifts_for_date(
            employee, today
        )

        if not shifts:
            raise ValidationError("No shift assigned for today.")

        return shifts
