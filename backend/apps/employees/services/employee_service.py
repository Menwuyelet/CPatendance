from employees.models import Employee, Company, Department
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
    Admins see all, HR see all in company, managers their department, employees only self.
    """
    if request_user.is_admin():
        return Employee.objects.all()
    elif request_user.is_hr():
        # Assuming HR can see all in their company, but need to get company from employee
        # For simplicity, assume HR sees all, or filter by company if user has employee
        if hasattr(request_user, 'employee'):
            return Employee.objects.filter(company=request_user.employee.company)
        return Employee.objects.none()
    elif request_user.is_department_manager():
        if hasattr(request_user, 'employee') and request_user.employee.department:
            return Employee.objects.filter(department=request_user.employee.department)
        return Employee.objects.none()
    else:
        # Employee sees only self
        return Employee.objects.filter(user=request_user)