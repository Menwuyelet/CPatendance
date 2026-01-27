"""Module backend/apps/attendance/services/shift_service.py

Auto-generated module docstring.
"""

from attendance.models.shift import Shift

class ShiftService:
    """Utility functions for creating, updating and listing `Shift` models.

    Centralizes basic CRUD operations for `Shift` so callers do not
    directly manipulate the model in multiple places.
    """
    @staticmethod
    def list_shifts():
        """Return all `Shift` objects ordered by start time."""
        return Shift.objects.all().order_by("start_time")

    @staticmethod
    def create_shift(data):
        """Create a `Shift` instance from validated `data` dict."""
        return Shift.objects.create(**data)

    @staticmethod
    def update_shift(shift, data):
        """Apply `data` updates to `shift` and persist the model."""
        for field, value in data.items():
            setattr(shift, field, value)
        shift.save()
        return shift

    @staticmethod
    def delete_shift(shift):
        """Permanently delete the provided `Shift` instance."""
        shift.delete()