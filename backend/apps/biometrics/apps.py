"""Module backend/apps/biometrics/apps.py

"""

from django.apps import AppConfig


class BiometricsConfig(AppConfig):
    """Django AppConfig for the biometrics application.

    Registers the `biometrics` app and provides app-level configuration
    used by Django at startup.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'biometrics'
