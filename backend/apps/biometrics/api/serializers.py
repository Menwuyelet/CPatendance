from rest_framework import serializers


class FaceEnrollSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    image = serializers.ImageField()


class FaceRecognizeSerializer(serializers.Serializer):
    image = serializers.ImageField()
