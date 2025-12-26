# attendance/models/shift.py
from django.db import models

class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()

    is_overnight = models.BooleanField(default=False)

    class Meta:
        unique_together = ("name", "start_time", "end_time")

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"
