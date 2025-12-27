import numpy as np
# from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics.pairwise import cosine_similarity

class SimpleFaceEngine:
    """
    Temporary face engine.
    - Deterministic
    - CPU only
    - Swappable
    """

    EMBEDDING_SIZE = 512

    def extract_embedding(self, image):
        """
        Placeholder embedding extractor.
        Replace with real model later.
        """
        if image is None:
            return None

        embedding = np.random.rand(self.EMBEDDING_SIZE)
        return embedding.astype(np.float32)

    def match(self, embedding, stored_embeddings, threshold=0.6):
        """
        Matches embedding against stored templates.
        Returns employee_id or None.
        """
        best_match = None
        best_score = -1.0

        for employee_id, stored_embedding in stored_embeddings.items():
            score = cosine_similarity(
                embedding.reshape(1, -1),
                stored_embedding.reshape(1, -1)
            )[0][0]

            if score > best_score and score >= threshold:
                best_score = score
                best_match = employee_id
