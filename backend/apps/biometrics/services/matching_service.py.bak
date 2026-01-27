# ## the matching service will call an AI service to match the captured embedding with stored embeddings in db encrypted from biometric profile
# ## by loading and decrypting them first and then call the ai for getting reading embedding and iterate through them to find a match by calculating cosine similarity
# import numpy as np
# from biometrics.services.employe_embedding_load_service import ShiftEmbeddingLoader
# class BiometricMatchingService:
#     ## Write the logic to feed the stored embedidings depending on the shift
#     @staticmethod
#     def match_face(embedding, shift):
#         ## ai call for face embedding matching
#         # Placeholder implementation: return the first matching employee_id or None
#         # for employee_id, stored_embedding in stored_embeddings.items():
#         #     if BiometricMatchingService._is_match(embedding, stored_embedding):
#         #         return employee_id
#         # return None
#         stored_embeddings = ShiftEmbeddingLoader.load_for_shift(shift=shift)
#         embedding = BiometricMatchingService.normalize(embedding)
#         if embedding is None:
#             return None

#         for employee_id, stored_embedding in stored_embeddings.items():
#             stored_embedding = BiometricMatchingService.normalize(stored_embedding)
#             if stored_embedding is None:
#                 continue

#             if BiometricMatchingService._is_match(embedding, stored_embedding):
#                 return employee_id

#         return None
        
#     @staticmethod
#     def normalize(vec):
#         vec = np.array(vec, dtype=np.float32)
#         norm = np.linalg.norm(vec)
#         if norm == 0:
#             return None
#         return vec / norm
    
#     @staticmethod
#     def _is_match(embedding, dbembedding, threshold=0.65):
#         """
#         embedding and dbembedding MUST be normalized vectors
#         """
#         similarity = np.dot(embedding, dbembedding)
#         return similarity >= threshold

import numpy as np
from biometrics.services.employe_embedding_load_service import ShiftEmbeddingLoader


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
            print("[WARN] Received None embedding for matching")
            return None

        # Load {employee_id: embedding} for the shift
        stored_embeddings = ShiftEmbeddingLoader.load_for_shift(shift=shift)
        print(f"[INFO] Loaded {len(stored_embeddings) if stored_embeddings else 0} stored embeddings for shift")
        if not stored_embeddings:
            print("[INFO] No stored embeddings found for shift")
            return None

        normalized_embedding = BiometricMatchingService._normalize(embedding)
        if normalized_embedding is None:
            return None

        for employee_id, stored_embedding in stored_embeddings.items():
            print(f"[DEBUG] Comparing embedding of employee {employee_id}")
            normalized_stored = BiometricMatchingService._normalize(stored_embedding)
            if normalized_stored is None:
                continue

            if BiometricMatchingService._is_match(
                normalized_embedding, normalized_stored
            ):
                return employee_id

        return None

    # -------------------------
    # INTERNAL HELPERS
    # -------------------------

    @staticmethod
    def _normalize(vector):
        """
        Normalize a vector to unit length.
        Returns None if vector is invalid.
        """
        vector = np.asarray(vector, dtype=np.float32)
        norm = np.linalg.norm(vector)

        if norm == 0.0:
            return None

        return vector / norm

    @staticmethod
    def _is_match(embedding, stored_embedding, threshold=0.6):
        """
        Compare two normalized embeddings using cosine similarity.

        Assumes both embeddings are already normalized.
        """
        similarity = float(np.dot(embedding, stored_embedding))
        return similarity >= threshold
