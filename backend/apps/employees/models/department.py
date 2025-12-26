from django.db import models
import uuid


class Department(models.Model):
    """
    Logical working unit inside a company.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    company = models.ForeignKey(
        "employees.Company",
        on_delete=models.CASCADE,
        related_name="departments"
    )

    name = models.CharField(max_length=255)

    code = models.CharField(
        max_length=20,
        help_text="Unique department code per company"
    )

    manager = models.ForeignKey(
        "employees.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_departments"
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("company", "code")
        indexes = [
            models.Index(fields=["company", "code"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.company.name})"
