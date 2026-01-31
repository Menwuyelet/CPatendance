"""Module backend/apps/biometrics/services/face_engine.py

This file contains the FaceEngine that handles the extraction of embedding
from the provided raw image.
"""

import os

os.environ["ORT_LOGGING_LEVEL"] = "4"
os.environ["GLOG_minloglevel"] = "3"
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from config.logging import get_logger

logger = get_logger(__name__)


class FaceEngine:
    """Wrapper around InsightFace FaceAnalysis for embedding extraction.

    The class lazily initializes the underlying `FaceAnalysis` app and
    provides helpers to convert image bytes to numeric embeddings.
    """

    logger.info("FACE_ENGINE_INIT_STARTED")
    _app = FaceAnalysis(name="buffalo_l")
    _app.prepare(ctx_id=0, det_size=(320, 320))
    logger.info("FACE_ENGINE_INIT_SUCCESS")

    @classmethod
    def image_to_embedding(cls, image_bytes):
        """Convert raw image bytes to a face embedding array.

        Parameters:
        - `image_bytes` (bytes): JPEG/PNG encoded image bytes.

        Returns:
        - numpy.ndarray or None: embedding vector for the first detected face,
          or None when no face is detected.
        """

        logger.info(
            "FACE_EMBEDDING_EXTRACTION_STARTED | image_size=%s",
            len(image_bytes),
        )

        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        faces = cls._app.get(img)

        if not faces:
            logger.info("FACE_EMBEDDING_EXTRACTION_NO_FACE")
            return None

        embedding = faces[0].embedding

        logger.info(
            "FACE_EMBEDDING_EXTRACTION_SUCCESS | embedding_dim=%s",
            embedding.shape[0],
        )

        return embedding
