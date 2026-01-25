import os

from insightface.app import FaceAnalysis


_face_app = None


def get_face_app(det_size=None):
    """Return a cached InsightFace FaceAnalysis instance.

    This avoids expensive model initialization on every request.

    Env vars:
      - INSIGHTFACE_MODEL (default: buffalo_l)
      - INSIGHTFACE_DET_SIZE (default: 640,640)
    """
    global _face_app

    if _face_app is None:
        model_name = os.getenv("INSIGHTFACE_MODEL", "buffalo_l")

        if det_size is None:
            det_size_env = os.getenv("INSIGHTFACE_DET_SIZE", "640,640")
            try:
                w, h = [int(x.strip()) for x in det_size_env.split(",", 1)]
                det_size = (w, h)
            except Exception:
                det_size = (640, 640)

        _face_app = FaceAnalysis(name=model_name, providers=["CPUExecutionProvider"])
        _face_app.prepare(ctx_id=0, det_size=det_size)

    return _face_app
