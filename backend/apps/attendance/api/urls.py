from rest_framework.routers import DefaultRouter
from attendance.api.views import ( 
                            AttendanceTakingViewSet, 
                            AttendanceSessionViewSet, 
                            AttendanceSessionCreateViewSet, 
                            AttendanceRecordViewSet, 
                            EmployeeShiftViewSet,
                            ShiftViewSet
                        )
router = DefaultRouter()
router.register("attendance", AttendanceRecordViewSet, basename="attendance")
router.register("attendance-sessions", AttendanceSessionCreateViewSet, basename="attendance-sessions")  
router.register("attendance-manage-sessions", AttendanceSessionViewSet, basename="attendance-manage-sessions")
router.register("attendance/check-in", AttendanceTakingViewSet, basename="attendance-taking")
router.register("shifts", ShiftViewSet, basename="shift")
router.register("employee-shifts", EmployeeShiftViewSet, basename="employee-shift")


urlpatterns = router.urls
