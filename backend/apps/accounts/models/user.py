# accounts/models/user.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from ..managers import UserManager
from ..constants import Roles
class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    roles = models.ManyToManyField(
                "accounts.Role",
                related_name="users",
                blank=True
            )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    def has_role(self, role_name: str) -> bool:
        """
        Checks if user has a specific role.
        """
        return self.roles.filter(name=role_name).exists()

    def is_admin(self):
        return self.has_role(Roles.ADMIN)

    def is_hr(self):
        return self.has_role(Roles.HR)

    def is_department_manager(self):
        return self.has_role(Roles.DEPARTMENT_MANAGER)

    def is_employee(self):
        return self.has_role(Roles.EMPLOYEE)