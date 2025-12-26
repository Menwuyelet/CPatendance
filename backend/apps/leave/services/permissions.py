from accounts.constants import Roles


def can_approve_leave(user, employee) -> bool:
    if user.has_role(Roles.ADMIN):
        return True

    if user.has_role(Roles.HR):
        return user.employee.company_id == employee.company_id

    if user.has_role(Roles.DEPARTMENT_MANAGER):
        return (
            employee.department_id == user.employee.department_id
            and user.employee.department.manager_id == user.employee.id
        )

    return False
