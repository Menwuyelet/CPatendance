"""Module backend/apps/accounts/models/role.py

This file contains the implimentation of the role entities.
"""

from django.db import models

class Role(models.Model):
    """Represents a named role that can be assigned to users.

    Roles are simple labeled entities (e.g., "HR", "MANAGER") used to
    control access and permissions across the application.
    """
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        """Return the human-readable name for the role."""
        return self.name
