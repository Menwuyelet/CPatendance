from django.db import models

class AttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ("PRESENT", "Present"),
        ("LATE", "Late"),
        ("ABSENT", "Absent"),
        ("ON_LEAVE", "On Leave"),
    )

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )
    employee_shift = models.ForeignKey(
        "attendance.EmployeeShift",
        on_delete=models.PROTECT,
        related_name="attendance_records"
    )

    date = models.DateField()

    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="ABSENT"
    )

    taken_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="taken_attendance"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("employee", "date")
        indexes = [
            models.Index(fields=["employee", "date"]),
            models.Index(fields=["date"]),
        ]
