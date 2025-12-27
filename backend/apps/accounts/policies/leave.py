from .common import BasePolicy


class LeavePolicy(BasePolicy):

    @classmethod
    def can_request_leave(cls, user):
        """
        Any worker can request leave
        """
        return cls.is_worker(user) or cls.is_hr(user) or cls.is_manager(user)

    @classmethod
    def can_approve_leave(cls, user, leave_request):
        """
        - HR: any leave in company
        - Manager: only department employees
        """
        employee = leave_request.employee

        if not cls.same_company(user, employee):
            return False

        if cls.is_hr(user):
            return True

        if cls.is_manager(user) and cls.same_department(user, employee):
            return True

        return False
