// src/utils/faceDetector.js
export class FaceDetector {
  constructor() {
    this.landmarker = null;
    this.initialized = false;
    this.lastDetectionTime = 0;
  }

  async init() {
    if (this.initialized && this.landmarker) return true;

    try {
      const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
      );

      // Try GPU first, fall back to CPU if it fails
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      } catch {
        // Fallback to CPU delegate
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      }

      this.initialized = true;
      return true;
    } catch (err) {
      console.error('FaceDetector init failed:', err);
      return false;
    }
  }

  detect(video) {
    if (!this.initialized || !this.landmarker) return null;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    try {
      // MediaPipe requires monotonically increasing timestamps
      const now = performance.now();
      if (now <= this.lastDetectionTime) {
        return null; // Skip this frame
      }
      this.lastDetectionTime = now;

      const results = this.landmarker.detectForVideo(video, now);

      if (results?.faceLandmarks?.length > 0) {
        const lm = results.faceLandmarks[0];
        // faceBlendshapes is array of objects with categories array
        const blendshapes = results.faceBlendshapes?.[0]?.categories || [];

        const xs = lm.map(p => p.x * video.videoWidth);
        const ys = lm.map(p => p.y * video.videoHeight);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const width = Math.max(...xs) - x;
        const height = Math.max(...ys) - y;

        // Find blink scores from blendshapes categories
        const leftBlink = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score || 0;
        const rightBlink = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score || 0;
        const isBlinking = (leftBlink + rightBlink) / 2 > 0.5;

        return {
          boundingBox: { x, y, width, height },
          confidence: 0.92,
          landmarks: lm,
          isBlinking,
          hasEyes: true,
          blinkScores: { left: leftBlink, right: rightBlink }
        };
      }
      return null;
    } catch (err) {
      console.error('FaceDetector detect error:', err);
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