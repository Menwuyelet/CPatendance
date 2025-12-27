from rest_framework.routers import DefaultRouter
from attendance.api.views import AttendanceViewSet

router = DefaultRouter()
router.register("attendance", AttendanceViewSet, basename="attendance")

urlpatterns = router.urls
