from accounts.constants import Roles


def can_take_attendance(user, employee) -> bool:
    """
    Determines whether a user can take attendance for an employee.
    """

    # Admin can do anything
    if user.has_role(Roles.ADMIN):
        return True

    # HR can take attendance for anyone in the same company
    if user.has_role(Roles.HR):
        return user.employee.company_id == employee.company_id

    # Department manager can take attendance only for their department
    if user.has_role(Roles.DEPARTMENT_MANAGER):
        manager = user.employee
        return (
            employee.department_id == manager.department_id
            and manager.department.manager_id == manager.id
        )

    # Employee can only take their own attendance (self check-in/out)
    if user.has_role(Roles.EMPLOYEE):
        return user.employee_id == employee.id

    return False
