// src/utils/faceDetector.js
export class FaceDetector {
  constructor() {
    this.detector = null;
    this.initialized = false;
    this.modelsLoaded = false;
    this.useFaceAPI = false;
  }

  async init() {
    if (this.initialized) return true;

    try {
      // 1. Prefer native browser FaceDetector (Chrome/Edge)
      if (typeof window.FaceDetector === 'function') {
        console.log('Using native FaceDetector API');
        this.detector = new window.FaceDetector({
          maxDetectedFaces: 1,
          fastMode: true,
        });
        this.initialized = true;
        return true;
      }

      // 2. Fallback to face-api.js
      console.log('Loading face-api.js...');
      this.useFaceAPI = true;
      await this.loadFaceAPI();
      this.initialized = true;
      console.log('face-api.js initialized successfully');
      return true;
    } catch (err) {
      console.error('FaceDetector init failed:', err);
      this.initialized = false;
      return false;
    }
  }

  async loadFaceAPI() {
    // Prevent duplicate loading
    if (window.faceapi?.nets) {
      console.log('face-api.js already loaded');
      this.modelsLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.crossOrigin = 'anonymous';

      script.onload = async () => {
        try {
          console.log('face-api.js script loaded → loading models');

          const modelPaths = [
            '/models',                                          // ← local folder (recommended)
            'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights', // reliable CDN
            'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights', // fallback
          ];

          let success = false;

          for (const path of modelPaths) {
            try {
              console.log(`Trying to load from: ${path}`);
              await window.faceapi.nets.tinyFaceDetector.loadFromUri(path);
              await window.faceapi.nets.faceLandmark68Net.loadFromUri(path);
              // Optional: load expressions if you want smile / neutral etc.
              // await window.faceapi.nets.faceExpressionNet.loadFromUri(path);

              this.modelsLoaded = true;
              success = true;
              console.log(`Models successfully loaded from: ${path}`);
              break;
            } catch (err) {
              console.warn(`Failed to load models from ${path}:`, err.message);
            }
          }

          if (success) {
            resolve();
          } else {
            reject(new Error('Failed to load face-api.js models from any path'));
          }
        } catch (err) {
          reject(err);
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load face-api.js script from CDN'));
      };

      document.head.appendChild(script);
    });
  }

  async detect(videoElement) {
    if (!this.initialized) {
      const success = await this.init();
      if (!success) return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      return null;
    }

    try {
      // 1. Native browser FaceDetector
      if (!this.useFaceAPI && this.detector && typeof this.detector.detect === 'function') {
        const faces = await this.detector.detect(videoElement);
        if (faces.length > 0) {
          return {
            boundingBox: faces[0].boundingBox,
            confidence: 0.85, // native doesn't give confidence → use fixed high value
            hasEyes: false,
          };
        }
      }

      // 2. face-api.js
      if (this.useFaceAPI && window.faceapi && this.modelsLoaded) {
        const detection = await window.faceapi
          .detectSingleFace(videoElement, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detection) {
          const landmarks = detection.landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const leftEAR = this.calculateEAR(leftEye);
          const rightEAR = this.calculateEAR(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2;
          const isBlinking = avgEAR < 0.22; // typical threshold (can be tuned)

          return {
            boundingBox: detection.detection.box,
            confidence: detection.detection.score || 0.75,
            landmarks,
            hasEyes: true,
            eyes: { left: leftEye, right: rightEye },
            ear: avgEAR,
            isBlinking,
          };
        }
      }

      // 3. Fallback simple detection
      return this.basicDetection(videoElement);
    } catch (err) {
      console.warn('Face detection failed:', err);
      return this.basicDetection(videoElement);
    }
  }

  calculateEAR(eyePoints) {
    // 6-point eye landmarks: [left-top, left-top-mid, left-bottom-mid, right-bottom, right-bottom-mid, right-top-mid]
    const A = this.dist(eyePoints[1], eyePoints[5]);
    const B = this.dist(eyePoints[2], eyePoints[4]);
    const C = this.dist(eyePoints[0], eyePoints[3]);
    return (A + B) / (2 * C);
  }

  dist(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  basicDetection(video) {
    if (!video.videoWidth || !video.videoHeight) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;
    const size = Math.min(w, h) * 0.3;

    return {
      boundingBox: {
        x: w / 2 - size / 2,
        y: h / 2 - size / 2,
        width: size,
        height: size,
      },
      confidence: 0.6,
      hasEyes: false,
    };
  }

  drawDetection(canvas, video, detection) {
    if (!detection || !canvas || !video) return;

    const ctx = canvas.getContext('2d');

    // Match video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bounding box
    const { x, y, width, height } = detection.boundingBox;
    ctx.strokeStyle = detection.confidence > 0.7 ? '#00ff88' : '#ff4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    // Confidence label
    ctx.fillStyle = '#00ff88';
    ctx.font = '16px Arial';
    ctx.fillText(`Conf: ${Math.round(detection.confidence * 100)}%`, x, y - 10);

    // Blink indicator
    if (detection.isBlinking) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 22px Arial';
      ctx.fillText('BLINK DETECTED!', 20, 40);
    }

    // Draw landmarks if available
    if (detection.landmarks) {
      ctx.fillStyle = '#ff3366';
      detection.landmarks.positions.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

// Singleton export
export const faceDetector = new FaceDetector();