"""Module backend/apps/attendance/api/views.py

This file contains the views for the attendance app.
"""

from datetime import timedelta
from attendance.models.employee_shift import EmployeeShift
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.core.exceptions import ValidationError
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from accounts.permissions import IsManagerOrAdmin
from attendance.models import AttendanceRecord
from attendance.models import AttendanceSession, Shift, EmployeeLeave
from attendance.models.atendance_session import SessionPhase
from attendance.services.attendance_session_service import AttendanceSessionService
from attendance.services.process_session_service import process_attendance_session
from django.utils import timezone
from attendance.services.shift_service import ShiftService
from attendance.services.status import combine_date_time
from attendance.services.employee_shift_service import EmployeeShiftService
from attendance.permissions.employee_shift_permission import CanManageEmployeeShift
from rest_framework.parsers import MultiPartParser
from attendance.api.serializers import (
    AttendanceSerializer,
    AttendanceSessionSerializer,
    ShiftSerializer,
    EmployeeShiftSerializer,
    EmployeeLeaveSerializer,
)


class AttendanceSessionCreateViewSet(ViewSet):
    """
    Manager / Admin starts attendance session
    """

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    @transaction.atomic
    def create(self, request):
        """Start a new attendance session for a given shift.

        Expects `shift_id` in the request data. Returns the created
        session identifier on success.
        """
        shift = get_object_or_404(Shift, id=request.data.get("shift_id"))

        now = timezone.localtime(timezone.now())
        today = now.date()

        if not shift.applies_today(today):
            return Response(
                {"detail": "Attendance session can only start on a shift day."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shift_start = combine_date_time(today, shift.start_time)
        shift_end = combine_date_time(today, shift.end_time)
        if shift_end <= shift_start:
            shift_end = shift_end + timedelta(days=1)

        if not (shift_start <= now <= shift_end):
            return Response(
                {"detail": "Attendance session can only start during shift hours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = AttendanceSession.objects.create(
            shift=shift,
            started_by=request.user,
            started_at=now,
            is_active=True,
        )

        return Response(
            {
                "session_id": session.id,
                "detail": "Attendance session started",
            },
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def destroy(self, request, pk=None):
        """Close an active attendance session identified by `pk`.

        Processes session entries and triggers post-processing once closed.
        """
        session = get_object_or_404(AttendanceSession, id=pk)

        if not session.is_active:
            return Response(
                {"detail": "Session already closed"}, status=status.HTTP_400_BAD_REQUEST
            )

        service = AttendanceSessionService(session)

        leave_codes = request.data.get("leave_employee_codes", [])
        raw_entries = service.close(leave_codes)

        process_attendance_session(session, request.user)

        return Response(
            {
                "session_id": session.id,
                "entries_count": len(raw_entries),
                "status": "closed",
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsManagerOrAdmin],
    )
    @transaction.atomic
    def sleep(self, request, pk=None):
        """Put session to sleep and process check-in window (mark absences/leave)."""
        session = get_object_or_404(AttendanceSession, id=pk)
        if not session.is_active or session.phase != SessionPhase.CHECK_IN:
            return Response(
                {"detail": "Session not in check-in phase"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave_codes = request.data.get("leave_employee_codes", [])
        service = AttendanceSessionService(session)
        service.make_sleep(leave_codes)

        return Response(
            {"detail": "Session moved to checkout phase"}, status=status.HTTP_200_OK
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsManagerOrAdmin],
        url_path="activate-checkout",
    )
    @transaction.atomic
    def activate_checkout(self, request, pk=None):
        """Reactivate session for checkout captures."""
        session = get_object_or_404(AttendanceSession, id=pk)
        if session.phase != SessionPhase.CHECK_OUT:
            return Response(
                {"detail": "Session not ready for checkout"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = AttendanceSessionService(session)
        service.activate_checkout()

        return Response(
            {"detail": "Session activated for checkout"}, status=status.HTTP_200_OK
        )


class AttendanceSessionViewSet(ViewSet):
    """
    Attendance session operations:
    - list
    - retrieve
    - update (active state only)
    """

    serializer_class = AttendanceSessionSerializer

    def _paginate(self, request, qs, serializer_class):
        """Paginate a queryset using default DRF pagination settings."""
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = serializer_class(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = serializer_class(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def list(self, request):
        """List attendance sessions visible to the requesting user."""
        qs = AttendanceSession.objects.select_related("shift", "started_by").order_by(
            "-started_at"
        )
        if request.user.is_admin():
            pass
        elif request.user.is_department_manager():
            employee = getattr(request.user, "employee", None)
            if employee and employee.department_id:
                qs = qs.filter(shift__department_id=employee.department_id).distinct()
            else:
                qs = qs.none()
        else:
            qs = qs.none()

        active = request.query_params.get("active")
        if active is not None:
            qs = qs.filter(is_active=(active.lower() == "true"))

        shift_id = request.query_params.get("shift_id")
        if shift_id:
            qs = qs.filter(shift_id=shift_id)

        return self._paginate(request, qs, AttendanceSessionSerializer)

    def retrieve(self, request, pk=None):
        """Retrieve a single attendance session by id after permission checks."""
        session = get_object_or_404(AttendanceSession, id=pk)
        self._check_permission(request, session)

        return Response(
            AttendanceSessionSerializer(session).data, status=status.HTTP_200_OK
        )

    @transaction.atomic
    @transaction.atomic
    @transaction.atomic
    def update(self, request, pk=None):
        """Partially update an attendance session (e.g., mark closed)."""
        session = get_object_or_404(AttendanceSession, id=pk)
        self._check_permission(request, session)

        # Admin or Manager can modify session state
        if not (request.user.is_admin() or request.user.is_department_manager()):
            return Response(
                {"detail": "Not allowed to modify attendance sessions"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AttendanceSessionSerializer(
            session, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)

        if (
            "is_active" in serializer.validated_data
            and serializer.validated_data["is_active"] is False
            and session.is_active
        ):
            session.closed_at = timezone.now()

        serializer.save()

        return Response(
            AttendanceSessionSerializer(session).data, status=status.HTTP_200_OK
        )

    def _check_permission(self, request, session):
        """Internal helper that raises when the `request.user` cannot access `session`.

        - Admins bypass checks.
        - Department managers may access sessions for their department.
        - Otherwise raises `PermissionError`.
        """
        if request.user.is_admin():
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
    One button click → one worker check-in (via facial recognition)
    """

    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    @transaction.atomic
    def create(self, request):
        """Handle POST with image to perform a single facial check-in.

        Expects `image` in `request.FILES`. Returns a dictionary with a
        `result` status string describing the outcome of processing.
        """
        image = request.FILES.get("image")

        if not image:
            return Response({"detail": "Image required"}, status=400)

        session = (
            AttendanceSession.objects.filter(
                is_active=True, phase=SessionPhase.CHECK_IN
            )
            .order_by("-started_at")
            .first()
        )

        if not session:
            return Response(
                {"detail": "No active attendance session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = AttendanceSessionService(session)
        result = service.check_in_next_worker(image.read())

        if result == "NO_ACTIVE_SESSION":
            return Response(
                {"detail": "No active attendance session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elif result == "TRY_AGAIN":
            return Response(
                {"detail": "Face not clear. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elif result == "NO_FACE_DETECTED":
            return Response(
                {"detail": "No face detected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elif result == "STOP_DUPLICATE":
            return Response(
                {"detail": "Attendance already recorded"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Attendance recorded successfully"},
            status=status.HTTP_201_CREATED,
        )


class AttendanceCheckoutViewSet(ViewSet):
    """Checkout capture for an active session in checkout phase."""

    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    @transaction.atomic
    def create(self, request):
        image = request.FILES.get("image")

        if not image:
            return Response({"detail": "Image required"}, status=400)

        session = (
            AttendanceSession.objects.filter(
                is_active=True, phase=SessionPhase.CHECK_OUT
            )
            .order_by("-started_at")
            .first()
        )

        if not session:
            return Response(
                {"detail": "No active attendance session for checkout"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = AttendanceSessionService(session)
        result = service.check_in_next_worker(image.read())

        if result == "NO_ACTIVE_SESSION":
            return Response(
                {"detail": "No active attendance session"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elif result == "TRY_AGAIN":
            return Response(
                {"detail": "Face not clear. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elif result == "NO_FACE_DETECTED":
            return Response(
                {"detail": "No face detected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elif result == "STOP_DUPLICATE":
            return Response(
                {"detail": "Attendance already recorded"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Checkout recorded successfully"},
            status=status.HTTP_201_CREATED,
        )


class AttendanceRecordViewSet(ViewSet):
    """
    AttendanceRecord operations:
    - list
    - retrieve
    - update (manual correction)
    """

    serializer_class = AttendanceSerializer

    def _paginate(self, request, qs, serializer_class):
        """Paginate a queryset using default DRF pagination settings."""
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = serializer_class(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = serializer_class(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def list(self, request):
        """List attendance sessions visible to the requesting user."""
        qs = AttendanceRecord.objects.select_related("employee", "employee_shift")

        if request.user.is_admin():
            pass
        elif request.user.is_department_manager():
            if hasattr(request.user, "employee") and request.user.employee.department:
                qs = qs.filter(employee__department=request.user.employee.department)
            else:
                qs = qs.none()

        else:
            # Employee → self only
            if hasattr(request.user, "employee"):
                qs = qs.filter(employee=request.user.employee)
            else:
                qs = qs.none()

        # ---- FILTERS ----
        date_gte = request.query_params.get("date__gte")
        if date_gte:
            qs = qs.filter(date__gte=date_gte)

        date_lte = request.query_params.get("date__lte")
        if date_lte:
            qs = qs.filter(date__lte=date_lte)

        mine = request.query_params.get("mine")
        if mine and mine.lower() == "true":
            if hasattr(request.user, "employee"):
                qs = qs.filter(employee=request.user.employee)
            else:
                qs = qs.none()

        employee_id = request.query_params.get("employee_id")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        shift_id = request.query_params.get("shift_id")
        if shift_id:
            qs = qs.filter(employee_shift__shift_id=shift_id)

        return self._paginate(request, qs, AttendanceSerializer)

    def retrieve(self, request, pk=None):
        """Retrieve a single attendance session by id after permission checks."""
        record = get_object_or_404(AttendanceRecord, id=pk)

        self._check_object_permission(request, record)

        return Response(AttendanceSerializer(record).data, status=status.HTTP_200_OK)

    @transaction.atomic
    def update(self, request, pk=None):
        """Partially update an attendance session (e.g., mark closed)."""
        record = get_object_or_404(AttendanceRecord, id=pk)

        # Only Admin or Manager can manually modify attendance
        if not (request.user.is_admin() or request.user.is_department_manager()):
            return Response(
                {"detail": "Not allowed to modify attendance records"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AttendanceSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(taken_by=request.user)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def _check_object_permission(self, request, record):
        """Ensure `request.user` may access the given `AttendanceRecord`.

        Raises `PermissionError` when access is not permitted. Admins bypass checks;
        department managers and the record's employee may access as appropriate.
        """
        if request.user.is_admin():
            return

        if request.user.is_department_manager():
            if (
                hasattr(request.user, "employee")
                and record.employee.department == request.user.employee.department
            ):
                return

        if (
            hasattr(request.user, "employee")
            and record.employee == request.user.employee
        ):
            return

        raise PermissionError("Not allowed to view this attendance record")


class ShiftViewSet(ViewSet):
    """API operations for managing shifts (list, create, update, delete).

    Provides CRUD endpoints used by managers/admins to maintain shift
    definitions used across attendance sessions.
    """

    serializer_class = ShiftSerializer

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def list(self, request):
        """Return all configured shifts serialized for clients."""
        shifts = ShiftService.list_shifts()
        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """Create a new `Shift` from validated request payload."""
        serializer = ShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shift = ShiftService.create_shift(serializer.validated_data)
        return Response(ShiftSerializer(shift).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, pk=None):
        """Update an existing `Shift` with provided partial data."""
        shift = Shift.objects.get(pk=pk)
        serializer = ShiftSerializer(shift, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        shift = ShiftService.update_shift(shift, serializer.validated_data)
        return Response(ShiftSerializer(shift).data)

    @transaction.atomic
    def destroy(self, request, pk=None):
        """Delete the specified `Shift` instance permanently."""
        shift = Shift.objects.get(pk=pk)
        ShiftService.delete_shift(shift)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeShiftViewSet(ViewSet):
    """Endpoints to assign or remove shifts for employees.

    Allows listing assignments and creating/deleting employee-shift
    relationships. Permission checks ensure only authorized users can
    modify assignments.
    """

    serializer_class = EmployeeShiftSerializer

    permission_classes = [CanManageEmployeeShift]

    def list(self, request):
        """List employee-shift assignments, optionally filtered by employee."""
        employee_id = request.query_params.get("employee")

        assignments = EmployeeShiftService.list_employee_shifts(employee_id)
        serializer = EmployeeShiftSerializer(assignments, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """Assign a `Shift` to an `Employee` based on the request payload."""
        serializer = EmployeeShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            assignment = EmployeeShiftService.assign_shift(
                employee=serializer.validated_data["employee"],
                shift=serializer.validated_data["shift"],
            )
        except ValidationError as exc:
            message = (
                exc.messages[0]
                if hasattr(exc, "messages") and exc.messages
                else str(exc)
            )
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            EmployeeShiftSerializer(assignment).data, status=status.HTTP_201_CREATED
        )

    @transaction.atomic
    def destroy(self, request, pk=None):
        """Remove the specified employee-shift assignment from the system."""
        assignment = EmployeeShift.objects.get(pk=pk)
        EmployeeShiftService.remove_shift(assignment)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _can_manage_employee(self, user, employee):
        """Return True when `user` is allowed to manage the given `employee`.

        Considers admin role and department manager relationship.
        """
        if hasattr(user, "is_admin") and user.is_admin():
            return True

        if getattr(user, "role", None) == "MANAGER":
            return employee.department and employee.department.manager_id == user.id

        return False


class EmployeeLeaveViewSet(ViewSet):
    """CRUD for long-term leave windows.

    Admin can manage all. Managers are limited to employees in their department.
    """

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]
    serializer_class = EmployeeLeaveSerializer

    def _filter_queryset(self, request):
        qs = EmployeeLeave.objects.select_related("employee", "employee__department")
        if request.user.is_admin():
            return qs

        if request.user.is_department_manager():
            employee = getattr(request.user, "employee", None)
            if employee and employee.department_id:
                return qs.filter(employee__department_id=employee.department_id)
        return qs.none()

    def _assert_can_manage(self, request, employee):
        if request.user.is_admin():
            return
        if request.user.is_department_manager():
            manager_emp = getattr(request.user, "employee", None)
            if (
                manager_emp
                and manager_emp.department_id
                and employee.department_id == manager_emp.department_id
            ):
                return
        raise PermissionDenied("Not allowed to manage leave for this employee")

    def list(self, request):
        qs = self._filter_queryset(request)
        serializer = EmployeeLeaveSerializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        leave = get_object_or_404(self._filter_queryset(request), pk=pk)
        serializer = EmployeeLeaveSerializer(leave)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        serializer = EmployeeLeaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = serializer.validated_data["employee"]
        self._assert_can_manage(request, employee)

        leave = serializer.save(created_by=request.user)
        return Response(
            EmployeeLeaveSerializer(leave).data, status=status.HTTP_201_CREATED
        )

    @transaction.atomic
    def update(self, request, pk=None):
        leave = get_object_or_404(EmployeeLeave, pk=pk)
        self._assert_can_manage(request, leave.employee)

        serializer = EmployeeLeaveSerializer(leave, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        leave = get_object_or_404(EmployeeLeave, pk=pk)
        self._assert_can_manage(request, leave.employee)

        serializer = EmployeeLeaveSerializer(leave, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, pk=None):
        leave = get_object_or_404(EmployeeLeave, pk=pk)
        self._assert_can_manage(request, leave.employee)
        leave.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
