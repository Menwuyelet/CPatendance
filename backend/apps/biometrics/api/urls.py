from rest_framework.routers import DefaultRouter
from biometrics.api.views import (
    FaceEnrollmentViewSet,
    BiometricProfileViewSet
)

router = DefaultRouter()
router.register("face/enroll", FaceEnrollmentViewSet, basename="face-enroll")
router.register("biometrics/profiles", BiometricProfileViewSet, basename="biometric-profiles")  
urlpatterns = router.urls
