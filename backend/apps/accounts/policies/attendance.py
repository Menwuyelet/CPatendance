from .common import BasePolicy


class AttendancePolicy(BasePolicy):

    @classmethod
    def can_take_attendance(cls, user, employee):
        """
        HR and Managers can take attendance
        HR can take for anyone, Managers only for their department
        """
        if cls.is_hr(user):
            return True

        if cls.is_manager(user) and cls.same_department(user, employee):
            return True

        return False

    @classmethod
    def can_self_check_in(cls, user):
        """
        Any worker (including HR & Manager) can self check-in
        """
        return cls.is_worker(user) or cls.is_hr(user) or cls.is_manager(user)

    @classmethod
    def can_view_attendance(cls, user, employee):
        """
        - HR: all employees
        - Manager: department
        - Worker: self only
        """
        if cls.is_hr(user):
            return True

        if cls.is_manager(user):
            return cls.same_department(user, employee)

        return user.id == employee.id
