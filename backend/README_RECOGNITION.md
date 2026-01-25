FastAPI face recognition endpoints

Run (create a venv and install dependencies):

```bash
python -m venv .venv
source .venv/Scripts/activate    # Windows: .venv\Scripts\activate
pip install -r requirements_recognition.txt
uvicorn face_api:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:
- POST /api/enroll  -> JSON { image: base64 }
- POST /api/recognize -> JSON { image: base64 }

Notes:
- `enroll` saves detected face crops to `backend/enrollments/`.
- This backend does NOT open the webcam. The webcam must run in the browser.
```
