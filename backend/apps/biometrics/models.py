from django.db import models



class BiometricProfile(models.Model):
    class BiometricType(models.TextChoices):
        FACE = "FACE", "Face"
        FINGERPRINT = "FINGERPRINT", "Fingerprint"

    employee = models.ForeignKey(
        "accounts.Employee",
        on_delete=models.CASCADE,
        related_name="biometrics"
    )

    biometric_type = models.CharField(
        max_length=20,
        choices=BiometricType.choices
    )

    template_data = models.BinaryField()  # encrypted embeddings
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("employee", "biometric_type")
