import insightface

class FaceEmbeddingEngine:
    _model = None

    @classmethod
    def load(cls):
        if cls._model is None:
            cls._model = insightface.app.FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"]
            )
            cls._model.prepare(ctx_id=0)

    @classmethod
    def extract(cls, image):
        cls.load()
        faces = cls._model.get(image)

        if not faces:
            return None

        # Take the most confident face
        return faces[0].embedding.tolist()