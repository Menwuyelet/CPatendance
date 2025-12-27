import cv2
import numpy as np
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from employees.models import Employee
from biometrics.api.serializers import (
    FaceEnrollSerializer,
    FaceRecognizeSerializer
)
from biometrics.services.face_service import (
    enroll_face,
    recognize_and_mark_attendance
)
from .permissions import (
    CanEnrollFace,
    CanRecognizeFace
)

class FaceEnrollmentViewSet(ViewSet):
    permission_classes = [CanEnrollFace]
    def create(self, request):
        serializer = FaceEnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = get_object_or_404(
            Employee,
            id=serializer.validated_data["employee_id"]
        )

        image = cv2.imdecode(
            np.frombuffer(
                serializer.validated_data["image"].read(),
                np.uint8
            ),
            cv2.IMREAD_COLOR
        )

        enroll_face(employee, image)
        return Response({"status": "enrolled"}, status=201)


class FaceRecognitionViewSet(ViewSet):
    permission_classes = [CanRecognizeFace]
    def create(self, request):
        serializer = FaceRecognizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image = cv2.imdecode(
            np.frombuffer(
                serializer.validated_data["image"].read(),
                np.uint8
            ),
            cv2.IMREAD_COLOR
        )

        record = recognize_and_mark_attendance(
            image=image,
            system_user=request.user
        )

        if not record:
            return Response(
                {"detail": "Face not recognized"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {"attendance_id": record.id},
            status=status.HTTP_201_CREATED
        )
