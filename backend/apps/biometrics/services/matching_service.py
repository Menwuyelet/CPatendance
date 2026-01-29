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
        Match a captured embedding against stored embeddings
        for employees assigned to the given shift.

        Returns:
            employee_id (int) if match found
            None if no match
        """
        if embedding is None:
            return Response(
                {"detail": "No embedding provided to perform matching."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR

            )

        """
        Load {employee_id: embedding} for the given shift
        """
        stored_embeddings = ShiftEmbeddingLoader.load_for_shift(shift=shift)

        if not stored_embeddings:
            return Response(
                {"detail": "No stored embeddings found."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        """
        This normalizes the provided embedding.
        """
        normalized_embedding = BiometricMatchingService._normalize(embedding)
        if normalized_embedding is None:
            return Response(
                {"detail": "No Normalized embedding found."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        for employee_id, stored_embedding in stored_embeddings.items():
            """
            This normalizes the stored embeddings and try to match them with the provided embedding.
            """
            normalized_stored = BiometricMatchingService._normalize(stored_embedding)
            if normalized_stored is None:
                continue

            """
            This uses the _is_match method to compare the embeddings and give output.
            """
            if BiometricMatchingService._is_match(
                normalized_embedding, normalized_stored
            ):
                return employee_id

        return Response(
                {"detail": "No stored embeddings matches the users embedidng."},
                status=status.HTTP_404_NOT_FOUND
        )


    @staticmethod
    def _normalize(vector):
        """
        This method is used to normalize the embeddings to perform matching actions.
        """
        try:
            vector = np.array(vector, dtype=np.float32).reshape(-1).copy()

            if vector.shape[0] != 512:
                return Response(
                            {"detail": "The given embedding is not the right size."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            if np.isnan(vector).any():
                return Response(
                    {"detail": "Invalid type of embedding used."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            norm = np.linalg.norm(vector)
            if norm == 0:
                return Response(
                    {"detail": "Normalization faild."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return vector / norm

        except Exception as e:
            return Response(
                    {"ERROR": "Normalization faild.", "detail": e},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


    @staticmethod
    def _is_match(embedding, stored_embedding, threshold=0.6):
        """
        This method performs the cossine comparation to determine match faces.
        """
        embedding = np.array(embedding, dtype=np.float32).flatten()
        stored_embedding = np.array(stored_embedding, dtype=np.float32).flatten()

        if embedding.shape != stored_embedding.shape:
            return Response(
                    {"detail": "Shape of the embeddings mismatch"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        similarity = float(np.dot(embedding, stored_embedding))

        return similarity >= threshold
