"""Module backend/apps/biometrics/api/urls.py

Auto-generated module docstring.
"""

from rest_framework.routers import DefaultRouter
from biometrics.api.views import (
    FaceEnrollmentViewSet,
    BiometricProfileViewSet
)

router = DefaultRouter()
router.register("face/enroll", FaceEnrollmentViewSet, basename="face-enroll")
router.register("profiles", BiometricProfileViewSet, basename="biometric-profiles")  
urlpatterns = router.urls
