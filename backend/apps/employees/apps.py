"""Module backend/apps/employees/apps.py

"""

from django.apps import AppConfig


class EmployeesConfig(AppConfig):
    """Django AppConfig for the employees application.

    Configures the `employees` Django application and its default
    auto field for primary keys.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.employees'
