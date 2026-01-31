# backend/apps/biometrics/tests/test_views.py
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.urls import reverse
from io import BytesIO
from unittest.mock import patch
import numpy as np
from uuid import UUID

from accounts.models import User, Role
from accounts.constants import Roles
from employees.models import Employee
from biometrics.models import BiometricProfile


class FaceEnrollmentViewSetTests(APITestCase):
    """Tests for FaceEnrollmentViewSet"""

    @classmethod
    def setUpTestData(cls):
        cls.hr_role = Role.objects.create(name=Roles.HR)
        cls.hr_user = User.objects.create_user(email="hr@test.com", password="pass123")
        cls.hr_user.roles.add(cls.hr_role)

        cls.employee = Employee.objects.create(user=cls.hr_user)

        # URL matches router basename in urls.py
        cls.enroll_url = reverse("face-enroll-list")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.hr_user)

    @patch("biometrics.services.face_engine.FaceEngine.image_to_embedding")
    def test_successful_face_enrollment_creates_profile(self, mock_embedding):
        # Mock embedding to return valid numpy array
        mock_embedding.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)

        from django.core.files.uploadedfile import SimpleUploadedFile
        file = SimpleUploadedFile(
            "face.jpg", b"fake_image_bytes", content_type="image/jpeg"
        )

        response = self.client.post(self.enroll_url, {"image": file}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(response.data["status"], ["created", "updated"])
        self.assertEqual(response.data["biometric_type"], "FACE")
        self.assertEqual(response.data["employee_id"], self.employee.id)


class BiometricProfileViewSetTests(TestCase):
    """Tests for BiometricProfileViewSet"""

    @classmethod
    def setUpTestData(cls):
        # Roles
        cls.hr_role = Role.objects.create(name=Roles.HR)
        cls.emp_role = Role.objects.create(name=Roles.EMPLOYEE)
        cls.mgr_role = Role.objects.create(name=Roles.MANAGER)

        # Users
        cls.hr_user = User.objects.create_user(email="hr@test.com", password="pass123")
        cls.hr_user.roles.add(cls.hr_role)

        cls.emp_user = User.objects.create_user(email="emp@test.com", password="pass123")
        cls.emp_user.roles.add(cls.emp_role)
        cls.employee = Employee.objects.create(user=cls.emp_user)

        cls.mgr_user = User.objects.create_user(email="mgr@test.com", password="pass123")
        cls.mgr_user.roles.add(cls.mgr_role)

        # Biometric profile
        cls.profile = BiometricProfile.objects.create(
            employee=cls.employee,
            biometric_type=BiometricProfile.BiometricType.FACE,
            template_data=b"fake_template"
        )

        # URLs
        cls.list_url = reverse("biometric-profiles-list")
        cls.update_url = reverse("biometric-profiles-detail", args=[cls.profile.id])

    def setUp(self):
        self.client = APIClient()

    def test_hr_can_list_all_profiles(self):
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_employee_can_list_own_profiles_only(self):
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["employee"], self.employee.id)
      
    def test_manager_cannot_list_profiles(self):
        self.client.force_authenticate(user=self.mgr_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_partial_update_requires_permission(self):
        # Employee trying to update → forbidden
        self.client.force_authenticate(user=self.emp_user)
        response = self.client.patch(self.update_url, {"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_can_activate_deactivate_profile(self):
        # HR can deactivate
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.patch(self.update_url, {"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()
        self.assertFalse(self.profile.is_active)
