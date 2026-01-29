// src/utils/faceDetector.js
export class FaceDetector {
  constructor() {
    this.landmarker = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return true;

    try {
      console.log('[FaceDetector] Starting MediaPipe initialization...');

      const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
      );

      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
          delegate: 'GPU', // try 'CPU' if still black
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      });

      this.initialized = true;
      console.log('[FaceDetector] MediaPipe initialized successfully');
      return true;
    } catch (err) {
      console.error('[FaceDetector] Init failed:', err);
      return false;
    }
  }

  async detect(video) {
    if (!this.initialized) await this.init();
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    try {
      const results = await this.landmarker.detectForVideo(video, performance.now());

      if (results.faceLandmarks?.length > 0) {
        const lm = results.faceLandmarks[0];
        const bs = results.faceBlendshapes?.[0] || [];

        const xs = lm.map(p => p.x * video.videoWidth);
        const ys = lm.map(p => p.y * video.videoHeight);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const width = Math.max(...xs) - x;
        const height = Math.max(...ys) - y;

        const leftBlink = bs.find(b => b.categoryName === 'eyeBlinkLeft')?.score || 0;
        const rightBlink = bs.find(b => b.categoryName === 'eyeBlinkRight')?.score || 0;
        const isBlinking = (leftBlink + rightBlink) / 2 > 0.65;

        return {
          boundingBox: { x, y, width, height },
          confidence: 0.92,
          landmarks: lm,
          isBlinking
        };
      }
      return null;
    } catch (err) {
      console.warn('[Detect error]', err);
      return null;
    }
  }

  drawDetection(canvas, video, detection) {
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // DRAW VIDEO NORMALLY (no scale(-1)) — this fixes black screen in most cases
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (detection) {
      // If you want mirrored look, mirror overlays only (or use CSS transform on canvas)
      ctx.strokeStyle = detection.isBlinking ? '#ff0000' : '#00ff88';
      ctx.lineWidth = 5;
      ctx.strokeRect(detection.boundingBox.x, detection.boundingBox.y,
                     detection.boundingBox.width, detection.boundingBox.height);

      ctx.fillStyle = '#00ff88';
      ctx.font = '22px Arial';
      ctx.fillText(`Face ${Math.round(detection.confidence * 100)}%`,
                   detection.boundingBox.x + 10, detection.boundingBox.y + 40);

      if (detection.isBlinking) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('BLINK!', 60, 90);
      }

      ctx.fillStyle = '#ff3366';
      detection.landmarks.forEach((p, i) => {
        if (i % 8 === 0) {
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '24px Arial';
      ctx.fillText('No face detected - center in oval', 50, canvas.height / 2);
    }
  }
}

export const faceDetector = new FaceDetector();