import numpy as np
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from biometrics.models import BiometricProfile
from biometrics.services.encryption_service import encrypt_template
from employees.models import Employee   # ← this import is required


class BiometricEnrollmentService:
    """
    Handles storage of biometric embeddings.
    Converts User → Employee and safely saves the profile.
    """

    def __init__(self, user_or_employee):
        """
        Accept either User or Employee — convert to Employee safely.
        """
        if isinstance(user_or_employee, Employee):
            self.employee = user_or_employee
        else:
            # Assume it's a User instance (most common case from view)
            try:
                self.employee = Employee.objects.get(user=user_or_employee)
            except Employee.DoesNotExist:
                raise ValidationError(
                    detail="No Employee profile linked to this user account. "
                           "Please contact HR to create or link your Employee record."
                )

    def handle_embedding(self, embedding):
        """
        Process and store the face embedding.
        """
        if not self.employee.is_active:
            raise ValidationError("Inactive employee cannot be enrolled")

        # Convert embedding list → bytes
        vector = np.asarray(embedding, dtype="float32").tobytes()
        encrypted = encrypt_template(vector)

        # Save or update profile — now using real Employee object
        profile, created = BiometricProfile.objects.update_or_create(
            employee=self.employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            defaults={
                "template_data": encrypted,
                "is_active": True,
                "last_used": timezone.now(),
            }
        )

        return {
            "created": created,
            "employee_id": self.employee.id
        }