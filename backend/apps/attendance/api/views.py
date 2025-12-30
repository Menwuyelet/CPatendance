from accounts.permissions.is_hr import IsHR
from attendance.models.employee_shift import EmployeeShift
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from attendance.api.serializers import (
    AttendanceSerializer,
    AttendanceSessionSerializer,
    ShiftSerializer,
    EmployeeShiftSerializer
)

from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin, IsHRorManager
from attendance.models import AttendanceRecord
from attendance.models import AttendanceSession, Shift
from attendance.services.attendance_session_service import AttendanceSessionService
from attendance.services.process_session_service import process_attendance_session
from django.utils import timezone
from attendance.services.shift_service import ShiftService
from attendance.services.employee_shift_service import EmployeeShiftService
from attendance.permissions.employee_shift_permission import CanManageEmployeeShift

class AttendanceSessionCreateViewSet(ViewSet):
    """
    HR / Manager starts attendance session
    """

    permission_classes = [IsAuthenticated, IsHRorManager | IsAdmin]  # set is later isHrorManager only

    def create(self, request):
        shift = get_object_or_404(Shift, id=request.data.get("shift_id"))

        session = AttendanceSession.objects.create(
            shift=shift,
            started_by=request.user,
            is_active=True,
        )

        return Response(
            {
                "session_id": session.id,
                "detail": "Attendance session started",
            },
            status=status.HTTP_201_CREATED,
        )

    # def create(self, request):
    #     """
    #     START SESSION
    #     """
    #     shift_id = request.data.get("shift_id")
    #     if not shift_id:
    #         return Response(
    #             {"detail": "shift_id is required"},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )

    #     shift = get_object_or_404(Shift, id=shift_id)

    #     service = AttendanceSessionService.start_session(
    #         shift=shift,
    #         user=request.user
    #     )

    #     return Response(
    #         {
    #             "session_id": service.session.id,
    #             "shift_id": shift.id
    #         },
    #         status=status.HTTP_201_CREATED
    #     )

    def destroy(self, request, pk=None):
        session = get_object_or_404(AttendanceSession, id=pk)

        if not session.is_active:
            return Response(
                {"detail": "Session already closed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = AttendanceSessionService(session)

        raw_entries = service.close()

        process_attendance_session(session, request.user)

        return Response(
            {
                "session_id": session.id,
                "entries_count": len(raw_entries),
                "status": "closed"
            },
            status=status.HTTP_200_OK
        )


class AttendanceSessionViewSet(ViewSet):
    """
    Attendance session operations:
    - list
    - retrieve
    - update (active state only)
    """

    # -------------------------
    # LIST
    # -------------------------
    def list(self, request):
        qs = AttendanceSession.objects.select_related(
            "shift",
            "started_by"
        ).order_by("-started_at")

        # ---- ROLE SCOPING ----
        if request.user.is_admin() or request.user.is_hr():
            pass

        elif request.user.is_department_manager():
            if hasattr(request.user, "employee"):
                qs = qs.filter(
                    shift__department=request.user.employee.department
                )
            else:
                qs = qs.none()

        else:
            # Employees see nothing
            qs = qs.none()

        # ---- FILTERS ----
        active = request.query_params.get("active")
        if active is not None:
            qs = qs.filter(is_active=(active.lower() == "true"))

        shift_id = request.query_params.get("shift_id")
        if shift_id:
            qs = qs.filter(shift_id=shift_id)

        return Response(
            AttendanceSessionSerializer(qs, many=True).data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # RETRIEVE
    # -------------------------
    def retrieve(self, request, pk=None):
        session = get_object_or_404(AttendanceSession, id=pk)
        self._check_permission(request, session)

        return Response(
            AttendanceSessionSerializer(session).data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # UPDATE
    # -------------------------
    def update(self, request, pk=None):
        session = get_object_or_404(AttendanceSession, id=pk)
        self._check_permission(request, session)

        # Only HR / Admin can modify session state
        if not (request.user.is_admin() or request.user.is_hr()):
            return Response(
                {"detail": "Not allowed to modify attendance sessions"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AttendanceSessionSerializer(
            session,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)

        # Handle manual close
        if (
            "is_active" in serializer.validated_data
            and serializer.validated_data["is_active"] is False
            and session.is_active
        ):
            session.closed_at = timezone.now()

        serializer.save()

        return Response(
            AttendanceSessionSerializer(session).data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # INTERNAL PERMISSION CHECK
    # -------------------------
    def _check_permission(self, request, session):
        if request.user.is_admin() or request.user.is_hr():
            return

        if request.user.is_department_manager():
            if (
                hasattr(request.user, "employee")
                and session.shift.department == request.user.employee.department
            ):
                return

        raise PermissionError("Not allowed to access this session")

class AttendanceTakingViewSet(ViewSet):
    """
    One button click → one worker check-in
    """

    def create(self, request):
        session = (
            AttendanceSession.objects
            .filter(is_active=True)
            .order_by("-started_at")
            .first()
        )

        if not session:
            return Response(
                {"detail": "No active attendance session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = AttendanceSessionService(session)
        service.check_in_next_worker()

        return Response(
            {"detail": "Attendance attempt completed"},
            status=status.HTTP_200_OK,
        )

    
class AttendanceRecordViewSet(ViewSet):
    """
    AttendanceRecord operations:
    - list
    - retrieve
    - update (manual correction)
    """

    # -------------------------
    # LIST
    # -------------------------
    def list(self, request):
        qs = AttendanceRecord.objects.select_related(
            "employee",
            "employee_shift"
        )

        # ---- ROLE SCOPING ----
        if request.user.is_admin() or request.user.is_hr():
            pass

        elif request.user.is_department_manager():
            if hasattr(request.user, "employee") and request.user.employee.department:
                qs = qs.filter(
                    employee__department=request.user.employee.department
                )
            else:
                qs = qs.none()

        else:
            # Employee → self only
            if hasattr(request.user, "employee"):
                qs = qs.filter(employee=request.user.employee)
            else:
                qs = qs.none()

        # ---- FILTERS ----
        date = request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)

        employee_id = request.query_params.get("employee_id")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        shift_id = request.query_params.get("shift_id")
        if shift_id:
            qs = qs.filter(employee_shift__shift_id=shift_id)

        return Response(
            AttendanceSerializer(qs, many=True).data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # RETRIEVE
    # -------------------------
    def retrieve(self, request, pk=None):
        record = get_object_or_404(AttendanceRecord, id=pk)

        self._check_object_permission(request, record)

        return Response(
            AttendanceSerializer(record).data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # UPDATE (Manual correction)
    # -------------------------
    def update(self, request, pk=None):
        record = get_object_or_404(AttendanceRecord, id=pk)

        # Only HR / Admin can manually modify attendance
        if not (request.user.is_admin() or request.user.is_hr()):
            return Response(
                {"detail": "Not allowed to modify attendance records"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AttendanceSerializer(
            record,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(taken_by=request.user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    # -------------------------
    # INTERNAL PERMISSION CHECK
    # -------------------------
    def _check_object_permission(self, request, record):
        if request.user.is_admin() or request.user.is_hr():
            return

        if request.user.is_department_manager():
            if (
                hasattr(request.user, "employee")
                and record.employee.department == request.user.employee.department
            ):
                return

        if hasattr(request.user, "employee") and record.employee == request.user.employee:
            return

        raise PermissionError("Not allowed to view this attendance record")

## Shift Logic

class ShiftViewSet(ViewSet):
    permission_classes = [IsAuthenticated, IsHRorManager | IsAdmin]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsHR]
        return super().get_permissions()
    
    def list(self, request):
        shifts = ShiftService.list_shifts()
        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = ShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shift = ShiftService.create_shift(serializer.validated_data)
        return Response(
            ShiftSerializer(shift).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, pk=None):
        shift = Shift.objects.get(pk=pk)
        serializer = ShiftSerializer(shift, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        shift = ShiftService.update_shift(shift, serializer.validated_data)
        return Response(ShiftSerializer(shift).data)

    def destroy(self, request, pk=None):
        shift = Shift.objects.get(pk=pk)
        ShiftService.delete_shift(shift)
        return Response(status=status.HTTP_204_NO_CONTENT)

class EmployeeShiftViewSet(ViewSet):
    permission_classes = [CanManageEmployeeShift]

    def list(self, request):
        employee_id = request.query_params.get("employee")

        assignments = EmployeeShiftService.list_employee_shifts(employee_id)
        serializer = EmployeeShiftSerializer(assignments, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = EmployeeShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignment = EmployeeShiftService.assign_shift(
            employee=serializer.validated_data["employee"],
            shift=serializer.validated_data["shift"],
        )

        return Response(
            EmployeeShiftSerializer(assignment).data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, pk=None):
        assignment = EmployeeShift.objects.get(pk=pk)
        EmployeeShiftService.remove_shift(assignment)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def _can_manage_employee(self, user, employee):
        # return True
        # HR
        if getattr(user, "role", None) == "HR":
            return True

        # Manager of department
        if getattr(user, "role", None) == "MANAGER":
            return (
                employee.department
                and employee.department.manager_id == user.id
            )

        return False