from rest_framework.routers import DefaultRouter
from attendance.api.views import AttendanceTakingViewSet, AttendanceSessionViewSet, AttendanceSessionCreateViewSet, AttendanceRecordViewSet
router = DefaultRouter()
router.register("attendance", AttendanceRecordViewSet, basename="attendance")
router.register("attendance-sessions", AttendanceSessionCreateViewSet, basename="attendance-sessions")  
router.register("attendance-manage-sessions", AttendanceSessionViewSet, basename="attendance-manage-sessions")
router.register("attendance/check-in", AttendanceTakingViewSet, basename="attendance-taking")

urlpatterns = router.urls
