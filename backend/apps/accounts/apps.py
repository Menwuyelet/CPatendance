"""Module backend/apps/accounts/apps.py

"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Django AppConfig for the accounts application.

    Provides Django with configuration for the `accounts` app such as
    the default primary key field type and the application label.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
