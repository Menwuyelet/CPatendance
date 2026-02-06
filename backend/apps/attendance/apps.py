"""Module backend/apps/attendance/apps.py

"""

from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    """Django AppConfig for the attendance application.

    Configures app metadata used by Django for application discovery and
    default primary key behavior.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.attendance'
