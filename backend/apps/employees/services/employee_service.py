"""Module backend/apps/employees/services/employee_service.py

This file contains the services used for employee related tasks update_employee and 
get_employees_for_users.
"""

from employees.models import Employee


def update_employee(employee, **kwargs):
    """
    Updates employee fields.
    """
    for attr, value in kwargs.items():
        if value is not None:
            setattr(employee, attr, value)
    employee.save()
    return employee


def get_employees_for_user(request_user):
    """
    Returns queryset of employees that the request_user can view.
    Admins see all, HR see all, managers their department, employees only self.
    """
    if request_user.is_admin():
        return Employee.objects.all()
    
    elif request_user.is_hr():
        return Employee.objects.all()
    
    elif request_user.is_department_manager():
        if hasattr(request_user, 'employee') and request_user.employee.department:
            return Employee.objects.filter(department=request_user.employee.department)
        return Employee.objects.none()
    
    else:
        return Employee.objects.filter(user=request_user)