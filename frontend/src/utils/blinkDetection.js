/**
 * Eye Blink Detection Utility using MediaPipe FaceMesh
 * Detects eye blinks for liveness verification
 */

// Eye landmark indices for MediaPipe FaceMesh
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

// Eye Aspect Ratio (EAR) threshold for blink detection
const EAR_THRESHOLD = 0.21;

/**
 * Calculate Eye Aspect Ratio (EAR)
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 */
function calculateEAR(eye) {
  const euclidean = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // Vertical eye landmarks
  const A = euclidean(eye[1], eye[5]);
  const B = euclidean(eye[2], eye[4]);
  
  // Horizontal eye landmarks
  const C = euclidean(eye[0], eye[3]);
  
  return (A + B) / (2.0 * C);
}

/**
 * Extract eye landmarks from face landmarks
 */
function getEyeLandmarks(landmarks, eyeIndices) {
  return eyeIndices.map(index => ({
    x: landmarks[index].x,
    y: landmarks[index].y,
    z: landmarks[index].z
  }));
}

/**
 * Blink Detector Class
 */
export class BlinkDetector {
  constructor() {
    this.blinkCount = 0;
    this.isBlinking = false;
    this.frameCounter = 0;
    this.consecutiveFrames = 3; // Frames needed to confirm a blink
  }

  /**
   * Reset blink counter
   */
  reset() {
    this.blinkCount = 0;
    this.isBlinking = false;
    this.frameCounter = 0;
  }

  /**
   * Detect blink from face landmarks
   * @param {Array} landmarks - Face landmarks from MediaPipe
   * @returns {Object} - { blinked: boolean, blinkCount: number, leftEAR: number, rightEAR: number }
   */
  detectBlink(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return { blinked: false, blinkCount: this.blinkCount, leftEAR: 0, rightEAR: 0 };
    }

    // Extract eye landmarks
    const leftEye = getEyeLandmarks(landmarks, LEFT_EYE_INDICES);
    const rightEye = getEyeLandmarks(landmarks, RIGHT_EYE_INDICES);

    // Calculate EAR for both eyes
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    // Blink detection logic
    let blinked = false;
    
    if (avgEAR < EAR_THRESHOLD) {
      this.frameCounter++;
      
      if (this.frameCounter >= this.consecutiveFrames && !this.isBlinking) {
        this.blinkCount++;
        this.isBlinking = true;
        blinked = true;
      }
    } else {
      if (this.isBlinking) {
        this.isBlinking = false;
      }
      this.frameCounter = 0;
    }

    return {
      blinked,
      blinkCount: this.blinkCount,
      leftEAR: leftEAR.toFixed(3),
      rightEAR: rightEAR.toFixed(3),
      avgEAR: avgEAR.toFixed(3),
      isEyesClosed: avgEAR < EAR_THRESHOLD
    };
  }

  /**
   * Get current blink count
   */
  getBlinkCount() {
    return this.blinkCount;
  }
}

export default BlinkDetector;
