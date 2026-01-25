from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import base64
import numpy as np
import cv2
import os
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImagePayload(BaseModel):
    image: str


def decode_base64_image(b64: str):
    if b64.startswith('data:'):
        b64 = b64.split(',', 1)[1]
    try:
        img_bytes = base64.b64decode(b64)
    except Exception:
        return None
    nparr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


@app.post('/api/recognize')
async def recognize(payload: ImagePayload):
    img = decode_base64_image(payload.image)
    if img is None:
        return {'error': 'invalid image'}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

    boxes = []
    for (x, y, w, h) in faces:
        boxes.append({'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)})

    return {
        'shape': {'height': int(img.shape[0]), 'width': int(img.shape[1])},
        'faces': len(boxes),
        'boxes': boxes,
    }


@app.post('/api/enroll')
async def enroll(payload: ImagePayload, name: str = Form(None)):
    img = decode_base64_image(payload.image)
    if img is None:
        return {'error': 'invalid image'}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

    enroll_dir = os.path.join(os.path.dirname(__file__), 'enrollments')
    ensure_dir(enroll_dir)

    saved = []
    for i, (x, y, w, h) in enumerate(faces):
        crop = img[y:y+h, x:x+w]
        ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S%f')
        fname = f'enroll_{ts}_{i}.jpg'
        path = os.path.join(enroll_dir, fname)
        cv2.imwrite(path, crop)
        saved.append({'file': fname, 'box': {'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)}})

    # In a real system: compute embedding and store (DB or secure storage).
    return {'saved': saved, 'faces': len(saved)}
