"""Module backend/apps/accounts/services/user_service.py

This file contains the service for the user management actions.
"""

from accounts.models import User
from employees.models import Employee
from accounts.policies.common import BasePolicy
from config.logging import get_logger

logger = get_logger(__name__)


def create_user(email, password, roles=None, employee_data=None):
    """
    Creates a new user with the given email, password, and roles.
    If employee_data is provided, creates an associated Employee.
    """

    logger.info("CREATE_USER_STARTED | email=%s", email)

    user = User.objects.create_user(email=email, password=password)
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
            full_name=employee_data["full_name"],
            employee_code=employee_data["employee_code"],
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
            list(roles.values_list("id", flat=True)),
        )
        user.roles.set(roles)

    logger.info("UPDATE_USER_COMPLETED | user_id=%s", user.id)

    return user


def get_users_for_user(request_user):
    """
    Returns queryset of users that the request_user can view.
    HR can view all, managers their department, employees only self.
    """
    logger.info(
        "GET_USERS_FOR_USER_STARTED | requester_id=%s",
        request_user.id,
    )

    if BasePolicy.is_hr(request_user) or BasePolicy.is_admin(request_user):
        logger.info(
            "GET_USERS_FOR_USER_SCOPE | requester_id=%s scope=ALL", request_user.id
        )
        return User.objects.all()
    elif BasePolicy.is_manager(request_user):
        if hasattr(request_user, "employee") and request_user.employee.department:
            logger.info(
                "GET_USERS_FOR_USER_SCOPE | requester_id=%s scope=DEPARTMENT department_id=%s",
                request_user.id,
                request_user.employee.department_id,
            )
            return User.objects.filter(
                employee__department=request_user.employee.department
            )
        logger.info(
            "GET_USERS_FOR_USER_SCOPE | requester_id=%s scope=NONE",
            request_user.id,
        )
        return User.objects.none()
    else:
        logger.info(
            "GET_USERS_FOR_USER_SCOPE | requester_id=%s scope=SELF",
            request_user.id,
        )

        return User.objects.filter(id=request_user.id)
