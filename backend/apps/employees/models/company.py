from django.db import models
import uuid


class Company(models.Model):
    """
    Represents a single organization.
    This allows future multi-company support without redesign.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    name = models.CharField(max_length=255, unique=True)

    timezone = models.CharField(
        max_length=50,
        default="UTC",
        help_text="IANA timezone, e.g. Africa/Addis_Ababa"
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
