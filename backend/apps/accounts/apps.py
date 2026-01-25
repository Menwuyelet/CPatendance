from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _ensure_default_roles(**kwargs):
    # Import inside the function so app registry is ready
    from accounts.constants import Roles
    from accounts.models import Role

    for role_name in (Roles.ADMIN, Roles.HR, Roles.MANAGER, Roles.EMPLOYEE):
        Role.objects.get_or_create(name=role_name)


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Ensure default roles exist after migrations
        post_migrate.connect(_ensure_default_roles, sender=self)
