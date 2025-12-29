from django.db import models
from attendance.models.shift import Shift

class EmployeeShift(models.Model):
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="shifts"
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE
    )

    class Meta:
        unique_together = ("employee", "shift")
