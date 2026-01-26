import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEngine:
    _app = None

    @classmethod
    def get_app(cls):
        if cls._app is None:
            cls._app = FaceAnalysis(name="buffalo_l")
            cls._app.prepare(ctx_id=0, det_size=(640, 640))
        return cls._app

    @classmethod
    def image_to_embedding(cls, image_bytes):

        app = cls.get_app()

        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        faces = app.get(img)

        if not faces:
            return None

        return faces[0].embedding
