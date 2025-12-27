import numpy as np
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity


class InsightFaceEngine:
    def __init__(self):
        self.app = FaceAnalysis(name="buffalo_l")
        self.app.prepare(ctx_id=0, det_size=(640, 640))

    def extract_embedding(self, image):
        faces = self.app.get(image)
        if not faces:
            return None
        return faces[0].embedding

    def match(self, embedding, stored_embeddings, threshold=0.65):
        for employee_id, stored in stored_embeddings.items():
            similarity = cosine_similarity(
                [embedding], [stored]
            )[0][0]
            if similarity >= threshold:
                return employee_id
        return None
