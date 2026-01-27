"""Module backend/apps/employees/services/employee_service.py

Auto-generated module docstring.
"""

from employees.models import Employee, Department
from accounts.models import User


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
        # HR sees all employees
        return Employee.objects.all()
    elif request_user.is_department_manager():
        if hasattr(request_user, 'employee') and request_user.employee.department:
            return Employee.objects.filter(department=request_user.employee.department)
        return Employee.objects.none()
    else:
        # Employee sees only self
        return Employee.objects.filter(user=request_user)