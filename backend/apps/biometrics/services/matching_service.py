"""Module backend/apps/biometrics/services/matching_service.py

This file contatins the matching service that handles the comparation of the provided
face data and already enrolled face data.
"""

import numpy as np
from biometrics.services.employe_embedding_load_service import ShiftEmbeddingLoader
from config.logging import get_logger

logger = get_logger(__name__)


class BiometricMatchingService:
    """
    Handles biometric matching logic for attendance.
    Loads stored embeddings for a shift and matches against
    a captured embedding using cosine similarity.
    """

    @staticmethod
    def match_face(embedding, shift):
        """
        Returns:
            employee_id if match found
            None if no match or error
        """

        if embedding is None:
            logger.info(
                "BIOMETRIC_MATCH_ABORTED | reason=no_embedding | shift_id=%s",
                shift.id,
            )

            return None

        logger.info(
            "BIOMETRIC_MATCH_STARTED | shift_id=%s",
            shift.id,
        )

        stored_embeddings = ShiftEmbeddingLoader.load_for_shift(shift=shift)

        if not stored_embeddings:
            logger.info(
                "BIOMETRIC_MATCH_ABORTED | reason=no_stored_embeddings | shift_id=%s",
                shift.id,
            )

            return None

        normalized_embedding = BiometricMatchingService._normalize(embedding)
        if normalized_embedding is None:
            logger.warning(
                "BIOMETRIC_MATCH_ABORTED | reason=invalid_input_embedding | shift_id=%s",
                shift.id,
            )

            return None

        for employee_id, stored_embedding in stored_embeddings.items():
            normalized_stored = BiometricMatchingService._normalize(stored_embedding)
            if normalized_stored is None:
                logger.warning(
                    "BIOMETRIC_MATCH_SKIPPED | reason=invalid_stored_embedding | employee_id=%s",
                    employee_id,
                )

                continue

            if BiometricMatchingService._is_match(
                normalized_embedding, normalized_stored
            ):
                logger.info(
                    "BIOMETRIC_MATCH_SUCCESS | shift_id=%s | employee_id=%s",
                    shift.id,
                    employee_id,
                )
                return employee_id

        logger.info(
            "BIOMETRIC_MATCH_FAILED | shift_id=%s",
            shift.id,
        )

        return None

    @staticmethod
    def _normalize(vector):
        """
        Normalize embedding to unit length.

        Returns:
            np.ndarray (512,)
            None if invalid
        """
        try:
            vector = np.array(vector, dtype=np.float32).reshape(-1).copy()

            # Must be 512-d
            if vector.shape[0] != 512:
                logger.warning(
                    "BIOMETRIC_NORMALIZE_FAILED | reason=dimension_mismatch | dim=%s",
                    vector.shape[0],
                )

                return None

            # NaN check
            if np.isnan(vector).any():
                logger.warning("BIOMETRIC_NORMALIZE_FAILED | reason=nan_detected")
                return None

            norm = np.linalg.norm(vector)
            if norm == 0:
                logger.warning("BIOMETRIC_NORMALIZE_FAILED | reason=zero_norm")

                return None

            return vector / norm

        except Exception as e:
            logger.exception(
                "BIOMETRIC_NORMALIZE_EXCEPTION | error=%s",
                str(e),
            )

            return None

    @staticmethod
    def _is_match(embedding, stored_embedding, threshold=0.6):
        """
        Cosine similarity comparison.

        Both embeddings assumed normalized.
        """

        embedding = np.array(embedding, dtype=np.float32).flatten()
        stored_embedding = np.array(stored_embedding, dtype=np.float32).flatten()

        if embedding.shape != stored_embedding.shape:
            logger.warning(
                "BIOMETRIC_MATCH_SHAPE_MISMATCH | input_shape=%s | stored_shape=%s",
                embedding.shape,
                stored_embedding.shape,
            )
            return False

        similarity = float(np.dot(embedding, stored_embedding))

        logger.info(
            "BIOMETRIC_SIMILARITY_COMPUTED | similarity=%.4f | threshold=%.2f",
            similarity,
            threshold,
        )

        return similarity >= threshold
