"""Module backend/apps/employees/models/employee.py

Auto-generated module docstring.
"""

# core/models/employee.py
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Employee(models.Model):
    """Represents an employee and links to the system `User`.

    Stores HR-visible attributes such as `full_name`, `employee_code` and
    department membership. Provides helpers to resolve shifts for dates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee"
    )

    department = models.ForeignKey(
        "employees.Department",
        on_delete=models.SET_NULL,
        null=True,
        related_name="employees"
    )

    employee_code = models.CharField(
        max_length=20,
        unique=True
    )

    full_name = models.CharField(max_length=255)
    photo = models.ImageField(upload_to='employees/photos/', null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Return a short identifier for the employee (UUID)."""
        return f"{self.id}"
    
    def get_today_shift(self):
        """Return the effective `EmployeeShift` for today, if any.

        Uses the shift resolution service to determine applicable shifts for
        the current date and returns the first matching assignment.
        """
        today = timezone.localdate()
        assignment = (
            self.shifts
            .select_related("shift")
            .first()
        )
        return assignment.shift if assignment else None
    
    def get_shift_for_date(self, date):
        """Get the first EmployeeShift assignment for the given date (if shift applies on that date)"""
        from attendance.models import EmployeeShift
        from attendance.services.shift_resolution_service import ShiftResolutionService
        
        try:
            shifts = ShiftResolutionService.get_employee_shifts_for_date(self, date)
            if shifts:
                # Return the first matching EmployeeShift object
                employee_shift = EmployeeShift.objects.filter(
                    employee=self,
                    shift__in=shifts
                ).select_related('shift').first()
                return employee_shift
        except Exception:
            pass
        return None

    class Meta:
        """Model `Meta`: database indexes for common lookup fields."""
        indexes = [
            models.Index(fields=["employee_code"]),
            models.Index(fields=["department"]),
        ]