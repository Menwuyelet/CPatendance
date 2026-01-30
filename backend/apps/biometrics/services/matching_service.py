"""Module backend/apps/biometrics/services/matching_service.py

This file contatins the matching service that handles the comparation of the provided 
face data and already enrolled face data.
"""

import numpy as np
from biometrics.services.employe_embedding_load_service import ShiftEmbeddingLoader
from rest_framework import status
from rest_framework.response import Response

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
            return None

        stored_embeddings = ShiftEmbeddingLoader.load_for_shift(shift=shift)

        if not stored_embeddings:
            return None

        normalized_embedding = BiometricMatchingService._normalize(embedding)
        if normalized_embedding is None:
            return None

        for employee_id, stored_embedding in stored_embeddings.items():
            normalized_stored = BiometricMatchingService._normalize(stored_embedding)
            if normalized_stored is None:
                continue

            if BiometricMatchingService._is_match(
                normalized_embedding,
                normalized_stored
            ):
                return employee_id

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
                # print("[WARN] Embedding size mismatch:", vector.shape)
                return None

            # NaN check
            if np.isnan(vector).any():
                # print("[WARN] Embedding contains NaN")
                return None

            norm = np.linalg.norm(vector)
            if norm == 0:
                # print("[WARN] Zero norm embedding")
                return None

            return vector / norm

        except Exception as e:
            # print("[ERROR] Normalize failed:", e)
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
            print("[WARN] Shape mismatch:", embedding.shape, stored_embedding.shape)
            return False

        similarity = float(np.dot(embedding, stored_embedding))

        return similarity >= threshold
