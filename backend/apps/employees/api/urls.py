from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, CompanyViewSet, DepartmentViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register("companies", CompanyViewSet, basename="company")
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path('', include(router.urls)),
]