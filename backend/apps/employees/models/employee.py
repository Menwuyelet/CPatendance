# core/models/employee.py
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Employee(models.Model):
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

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.id}"
    
    def get_today_shift(self):
        today = timezone.localdate()
        assignment = (
            self.shift_assignments
            .select_related("shift")
            .filter(date=today)
            .first()
        )
        return assignment.shift if assignment else None

    class Meta:
        indexes = [
            models.Index(fields=["employee_code"]),
            models.Index(fields=["department"]),
        ]