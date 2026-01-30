"""Module backend/apps/employees/services/employee_service.py

This file contains the services used for employee related tasks update_employee and 
get_employees_for_users.
"""

import logging

from employees.models import Employee

logger = logging.getLogger(__name__)

def update_employee(employee, **kwargs):
    """
    Updates employee fields.
    """
    logger.info(
        "EMPLOYEE_UPDATE_STARTED | employee_id=%s",
        employee.id,
    )

    updated_fields = []

    for attr, value in kwargs.items():
        if value is not None:
            setattr(employee, attr, value)
    employee.save()

    logger.info(
        "EMPLOYEE_UPDATE_SUCCESS | employee_id=%s | fields=%s",
        employee.id,
        updated_fields,
    )
    return employee


def get_employees_for_user(request_user):
    """
    Returns queryset of employees that the request_user can view.
    Admins see all, HR see all, managers their department, employees only self.
    """
    logger.info(
        "EMPLOYEE_LIST_REQUEST | user_id=%s",
        request_user.id,
    )

    if request_user.is_admin():
        logger.info(
            "EMPLOYEE_LIST_GRANTED | role=admin | user_id=%s",
            request_user.id,
        )

        return Employee.objects.all()
    
    elif request_user.is_hr():
        logger.info(
            "EMPLOYEE_LIST_GRANTED | role=hr | user_id=%s",
            request_user.id,
        )

        return Employee.objects.all()
    
    elif request_user.is_department_manager():
        logger.info(
            "EMPLOYEE_LIST_GRANTED | role=manager | user_id=%s | department_id=%s",
            request_user.id,
            request_user.employee.department.id,
        )

        if hasattr(request_user, 'employee') and request_user.employee.department:
            return Employee.objects.filter(department=request_user.employee.department)
        
        logger.warning(
            "EMPLOYEE_LIST_DENIED | role=manager | reason=no_department | user_id=%s",
            request_user.id,
        )
        return Employee.objects.none()
    
    else:
        logger.info(
            "EMPLOYEE_LIST_GRANTED | role=employee | user_id=%s",
            request_user.id,
        )
        return Employee.objects.filter(user=request_user)