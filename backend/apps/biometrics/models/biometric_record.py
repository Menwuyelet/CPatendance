"""Module backend/apps/biometrics/models/biometric_record.py

Auto-generated module docstring.
"""

# apps/biometrics/models.py
from django.db import models
from django.core.validators import MinLengthValidator

class BiometricProfile(models.Model):
    """Stores encrypted biometric templates for an `Employee`.

    `template_data` contains an encrypted embedding or template blob.
    """

    class BiometricType(models.TextChoices):
        """Enumeration of supported biometric types (FACE, FINGERPRINT)."""
        FACE = "FACE", "Face Recognition"
        FINGERPRINT = "FINGERPRINT", "Fingerprint"

    employee = models.ForeignKey(
        "employees.Employee",  # Adjust if your Employee model is in different app
        on_delete=models.CASCADE,
        related_name="biometric_profiles"
    )

    biometric_type = models.CharField(
        max_length=20,
        choices=BiometricType.choices,
        default=BiometricType.FACE
    )

    template_data = models.BinaryField(
        help_text="Encrypted biometric template (embeddings/feature vector)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Set to False to revoke access"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used = models.DateTimeField(null=True, blank=True)

    class Meta:
        """Meta information for `BiometricProfile` model."""
        unique_together = ("employee", "biometric_type")
        verbose_name = "Biometric Profile"
        verbose_name_plural = "Biometric Profiles"
        ordering = ['-created_at']

    def __str__(self):
        """Return a readable representation combining employee and type."""
        return f"{self.employee} - {self.get_biometric_type_display()}"