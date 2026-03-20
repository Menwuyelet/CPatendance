"""Module backend/apps/employees/services/employee_service.py

This file contains the services used for employee related tasks update_employee and
get_employees_for_users.
"""

from employees.models import Employee

from config.logging import get_logger

logger = get_logger(__name__)


def update_employee(employee, **kwargs):
    """
    Updates employee fields.
    """

    logger.info(
        "event=employee_update_started employee_id=%s",
        employee.id,
    )

    updated_fields = []

    for attr, value in kwargs.items():
        if value is not None:
            setattr(employee, attr, value)
            updated_fields.append(attr)
    employee.save()

    logger.info(
        "event=employee_update_success employee_id=%s updated_fields=%s",
        employee.id,
        updated_fields,
    )
    return employee


def get_employees_for_user(request_user):
    """
    Returns queryset of employees that the request_user can view.
    Admins see all, managers their department.
    """
    logger.info(
        "event=employee_list_started user_id=%s",
        request_user.id,
    )

    if request_user.is_admin():
        logger.info(
            "event=employee_list_granted role=admin user_id=%s",
            request_user.id,
        )

        return Employee.objects.all()

    elif request_user.is_department_manager():
        logger.info(
            "event=employee_list_granted role=manager user_id=%s department_id=%s",
            request_user.id,
            request_user.employee.department.id,
        )

        return Employee.objects.filter(department=request_user.employee.department)

    else:
        logger.info("event=employee_list_denied")

        return Employee.objects.none()
