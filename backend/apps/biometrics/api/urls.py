from rest_framework.routers import DefaultRouter
from biometrics.api.views import (
    FaceEnrollmentViewSet,
    FaceRecognitionViewSet
)

router = DefaultRouter()
router.register("biometrics/face/enroll", FaceEnrollmentViewSet, basename="face-enroll")
router.register("biometrics/face/recognize", FaceRecognitionViewSet, basename="face-recognize")

urlpatterns = router.urls
