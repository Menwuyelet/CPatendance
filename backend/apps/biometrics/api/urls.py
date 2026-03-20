"""Module backend/apps/biometrics/api/urls.py

This file contains the url routing for the biometrics app using DefaultRouter from routers.
"""

from rest_framework.routers import DefaultRouter
from biometrics.api.views import (
    BiometricProfileViewSet,
)

router = DefaultRouter()
router.register("profiles", BiometricProfileViewSet, basename="biometric-profiles")
urlpatterns = router.urls
