"""Module backend/apps/attendance/api/urls.py

This file contains the url routing for the attendance app using DefaultRouter form routers.
"""

from rest_framework.routers import DefaultRouter
from attendance.api.views import (
    AttendanceTakingViewSet,
    AttendanceCheckoutViewSet,
    AttendanceSessionViewSet,
    AttendanceSessionCreateViewSet,
    AttendanceRecordViewSet,
    EmployeeShiftViewSet,
    EmployeeLeaveViewSet,
    ShiftViewSet,
)

router = DefaultRouter()
router.register("attendance", AttendanceRecordViewSet, basename="attendance")
router.register(
    "attendance-sessions",
    AttendanceSessionCreateViewSet,
    basename="attendance-sessions",
)
router.register(
    "attendance-manage-sessions",
    AttendanceSessionViewSet,
    basename="attendance-manage-sessions",
)
router.register(
    "attendance-check-in", AttendanceTakingViewSet, basename="attendance-taking"
)
router.register(
    "attendance-check-out", AttendanceCheckoutViewSet, basename="attendance-checkout"
)
router.register("shifts", ShiftViewSet, basename="shift")
router.register("employee-shifts", EmployeeShiftViewSet, basename="employee-shift")
router.register("employee-leaves", EmployeeLeaveViewSet, basename="employee-leave")


urlpatterns = router.urls
