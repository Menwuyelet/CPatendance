from accounts.constants import Roles


class BasePolicy:
    @staticmethod
    def is_hr(user):
        return user.has_role(Roles.HR)

    @staticmethod
    def is_manager(user):
        return user.has_role(Roles.MANAGER)

    @staticmethod
    def is_worker(user):
        return user.has_role(Roles.EMPLOYEE)

    @staticmethod
    def same_department(user, employee):
        return (
            user.employee.department_id is not None and
            user.employee.department_id == employee.department_id
        )
