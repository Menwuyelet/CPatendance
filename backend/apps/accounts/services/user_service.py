"""Module backend/apps/accounts/services/user_service.py

This file contains the service for the user management actions.
"""

from accounts.models import User
from employees.models import Employee
from config.logging import get_logger

logger = get_logger(__name__)


def create_user(
    employee_code, full_name, phone_number, password, roles=None, employee_data=None
):
    """
    Creates a new user with the given employee_code, password, and roles.
    If employee_data is provided, creates an associated Employee.
    """

    logger.info("CREATE_USER_STARTED | employee_code=%s", employee_code)

    user = User.objects.create_user(
        employee_code=employee_code,
        full_name=full_name,
        phone_number=phone_number,
        password=password,
    )

    if roles:
        logger.debug(
            "CREATE_USER_ASSIGN_ROLES | user_id=%s roles=%s",
            user.id,
            list(roles),
        )
        user.roles.set(roles)

    if employee_data:
        logger.info(
            "CREATE_USER_EMPLOYEE_STARTED | user_id=%s employee_code=%s",
            user.id,
            employee_data.get("employee_code"),
        )
        Employee.objects.create(
            user=user,
            department=employee_data.get("department"),
        )
        logger.info(
            "CREATE_USER_EMPLOYEE_COMPLETED | user_id=%s",
            user.id,
        )

    logger.info("CREATE_USER_COMPLETED | user_id=%s", user.id)

    return user


def update_user(user, **kwargs):
    """
    Updates user fields and roles safely.
    """
    logger.info("UPDATE_USER_STARTED | user_id=%s", user.id)

    roles = kwargs.pop("roles", None)
    password = kwargs.pop("password", None)

    for attr, value in kwargs.items():
        logger.debug(
            "UPDATE_USER_FIELD | user_id=%s field=%s",
            user.id,
            attr,
        )
        setattr(user, attr, value)

    if password:
        logger.debug("UPDATE_USER_PASSWORD | user_id=%s", user.id)
        user.set_password(password)

    user.save()

    if roles is not None:
        logger.debug(
            "UPDATE_USER_ROLES | user_id=%s roles=%s",
            user.id,
            list(roles),
        )
        user.roles.set(roles)

    logger.info("UPDATE_USER_COMPLETED | user_id=%s", user.id)

    return user


def get_users_for_user(request_user):
    """
    Returns queryset of users that the request_user can view.
    Admins can view all and managers their department.
    """
    logger.info(
        "GET_USERS_FOR_USER_STARTED | requester_id=%s",
        request_user.id,
    )

    if request_user.is_admin():
        logger.info(
            "GET_USERS_FOR_USER_SCOPE | requester_id=%s scope=ALL", request_user.id
        )
        return User.objects.all()

    elif request_user.is_department_manager():

        logger.info(
            "GET_USERS_FOR_USER_SCOPE | requester_id=%s scope=DEPARTMENT department_id=%s",
            request_user.id,
            request_user.employee.department_id,
        )
        return User.objects.filter(
            employee__department=request_user.employee.department
        )

    else:
        return None


def generate_password():
    """Generates a random password for new users."""
    import string
    import random

    length = 8
    characters = string.ascii_letters + string.digits + string.punctuation
    password = "".join(random.choice(characters) for _ in range(length))
    return password


def generate_employee_code():
    """
    Generates a unique employee code for new users.

    Uses the company initials and last created id as starting to insure uniqueness.
    """

    last_user = User.objects.order_by("-created_at").first()
    if last_user:
        next_id = last_user.employee_code[-4:]  # Get the last 4 characters
        next_id = int(next_id) + 1
    else:
        next_id = 1001  # Starting employee code if no users exist

    return f"HAC-{next_id:04d}"
