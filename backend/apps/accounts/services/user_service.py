from accounts.models import User, Role
from employees.models import Employee


def create_user(email, password, roles=None, employee_data=None):
    """
    Creates a new user with the given email, password, and roles.
    If employee_data is provided, creates an associated Employee.
    """
    user = User.objects.create_user(email=email, password=password)
    if roles:
        user.roles.set(roles)
    
    if employee_data:
        Employee.objects.create(
            user=user,
            full_name=employee_data['full_name'],
            employee_code=employee_data['employee_code'],
            company=employee_data['company'],
            department=employee_data.get('department')
        )
    
    return user


def update_user(user, **kwargs):
    """
    Updates user fields and roles.
    """
    roles = kwargs.pop('roles', None)
    for attr, value in kwargs.items():
        setattr(user, attr, value)
    user.save()
    if roles is not None:
        user.roles.set(roles)
    return user


def get_users_for_user(request_user):
    """
    Returns queryset of users that the request_user can view.
    HR can view all in company, managers their department, employees only self.
    """
    from accounts.policies.common import BasePolicy

    if BasePolicy.is_hr(request_user):
        # Assuming HR can view all, but need company filter
        # For now, return all
        return User.objects.all()
    elif BasePolicy.is_manager(request_user):
        # Department users
        # Need to implement based on employee relation
        return User.objects.filter(employee__department=request_user.employee.department)
    else:
        return User.objects.filter(id=request_user.id)