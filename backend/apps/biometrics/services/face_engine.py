"""Module backend/apps/biometrics/services/face_engine.py

This file contains the FaceEngine that handles the extraction of embedding 
from the provided raw image.
"""

import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEngine:
    """Wrapper around InsightFace FaceAnalysis for embedding extraction.

    The class lazily initializes the underlying `FaceAnalysis` app and
    provides helpers to convert image bytes to numeric embeddings.
    """
    _app = None

    @classmethod
    def get_app(cls):
        """Return a prepared `FaceAnalysis` instance (initialized once)."""
        if cls._app is None:
            cls._app = FaceAnalysis(name="buffalo_l")
            cls._app.prepare(ctx_id=0, det_size=(640, 640))
        return cls._app

    @classmethod
    def image_to_embedding(cls, image_bytes):
        """Convert raw image bytes to a face embedding array.

        Parameters:
        - `image_bytes` (bytes): JPEG/PNG encoded image bytes.

        Returns:
        - numpy.ndarray or None: embedding vector for the first detected face,
          or None when no face is detected.
        """
        app = cls.get_app()

        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        faces = app.get(img)

        if not faces:
            return None

        return faces[0].embedding
