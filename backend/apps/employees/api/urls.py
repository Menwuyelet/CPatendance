"""Module backend/apps/employees/api/urls.py

This file contains the url routing for the employee app using DefaultRouter from routers.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, DepartmentViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path('', include(router.urls)),
]