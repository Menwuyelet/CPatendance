import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Stack,
  Paper,
  IconButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CameraAlt,
  Visibility,
  CheckCircle,
  Warning,
  Close,
  RemoveRedEye,
  FlashOn,
} from '@mui/icons-material';
import BlinkDetector from '../utils/blinkDetection';

const BiometricCaptureWithBlink = ({ open, onClose, onCapture, minBlinks = 2 }) => {
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [status, setStatus] = useState('Starting camera...');
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [requireBlinks, setRequireBlinks] = useState(true);
  const [currentEAR, setCurrentEAR] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const blinkDetectorRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Initialize blink detector
  useEffect(() => {
    blinkDetectorRef.current = new BlinkDetector();
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      setStatus('Starting camera...');
      setError('');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStatus('Camera ready. Please look at the camera.');
          startDetection();
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
      setStatus('Camera error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    resetState();
  };

  const resetState = () => {
    setCapturing(false);
    setBlinkCount(0);
    setStatus('');
    setCapturedImage(null);
    setFaceDetected(false);
    setCurrentEAR(0);
    if (blinkDetectorRef.current) {
      blinkDetectorRef.current.reset();
    }
  };

  const startDetection = () => {
    if (detectionIntervalRef.current) return;

    // Simple face detection + blink simulation
    detectionIntervalRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused) return;

      // Simulate face detection using video dimensions
      const video = videoRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setFaceDetected(true);
        
        // For demonstration: simulate blink detection using simplified logic
        // In production, you'd use actual face landmarks from TensorFlow.js or similar
        detectBlinkSimple();
      } else {
        setFaceDetected(false);
      }
    }, 100);
  };

  // Simplified blink detection (placeholder - replace with actual face landmark detection)
  const detectBlinkSimple = () => {
    // This is a simplified version. For production, integrate TensorFlow.js Face Landmarks Detection
    // or use the MediaPipe solution via CDN
    
    // Placeholder: Randomly detect blinks for demo (remove in production)
    // In production: use actual eye landmarks to calculate EAR
    
    // For now, we'll use manual capture mode
    // To implement proper blink detection, you need:
    // 1. Load TensorFlow.js FaceLandmarksDetection model
    // 2. Extract eye landmarks
    // 3. Calculate EAR (Eye Aspect Ratio)
    // 4. Detect when EAR drops below threshold
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready');
      return;
    }

    setCapturing(true);
    setStatus('Capturing image...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          setStatus('Image captured successfully!');
          
          // Create File object for upload
          const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
          onCapture(file, blinkCount);
        }
      }, 'image/jpeg', 0.95);
      
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture image');
      setStatus('Capture failed');
    } finally {
      setCapturing(false);
    }
  };

  const handleConfirmCapture = () => {
    if (requireBlinks && blinkCount < minBlinks) {
      setError(`Please blink at least ${minBlinks} times for liveness verification`);
      return;
    }
    captureImage();
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setStatus('Ready to capture');
    resetState();
    if (blinkDetectorRef.current) {
      blinkDetectorRef.current.reset();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const manualBlinkIncrement = () => {
    setBlinkCount(prev => prev + 1);
    if (blinkDetectorRef.current) {
      blinkDetectorRef.current.blinkCount++;
    }
  };

  const canCapture = !requireBlinks || blinkCount >= minBlinks;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Biometric Capture with Liveness Detection</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Status Display */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip 
                icon={faceDetected ? <CheckCircle /> : <Warning />}
                label={faceDetected ? 'Face Detected' : 'No Face Detected'}
                color={faceDetected ? 'success' : 'warning'}
                size="small"
              />
              <Chip 
                icon={<RemoveRedEye />}
                label={`Blinks: ${blinkCount}/${minBlinks}`}
                color={blinkCount >= minBlinks ? 'success' : 'default'}
                size="small"
              />
              {requireBlinks && !canCapture && (
                <Typography variant="caption" color="text.secondary">
                  Blink {minBlinks - blinkCount} more time(s)
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* Video Preview */}
          <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 2, overflow: 'hidden' }}>
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    transform: 'scaleX(-1)', // Mirror effect
                  }}
                />
                {/* Face Detection Overlay */}
                {faceDetected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '60%',
                      height: '70%',
                      border: '3px solid',
                      borderColor: canCapture ? 'success.main' : 'warning.main',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Status Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    p: 1,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2">{status}</Typography>
                  {capturing && <LinearProgress sx={{ mt: 1 }} />}
                </Box>
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            )}
          </Box>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Options */}
          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={requireBlinks}
                  onChange={(e) => setRequireBlinks(e.target.checked)}
                />
              }
              label="Require Blink Verification"
            />
            
            {/* Manual blink button for demo */}
            {requireBlinks && !capturedImage && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RemoveRedEye />}
                onClick={manualBlinkIncrement}
              >
                Simulate Blink (Demo)
              </Button>
            )}
          </Stack>

          {/* Instructions */}
          <Alert severity="info" icon={<FlashOn />}>
            <Typography variant="body2">
              {requireBlinks ? (
                <>Please look at the camera and blink {minBlinks} times naturally to verify liveness.</>
              ) : (
                <>Position your face in the frame and click capture when ready.</>
              )}
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        {capturedImage ? (
          <>
            <Button onClick={handleRetry} variant="outlined">
              Retake
            </Button>
            <Button 
              variant="contained" 
              color="success"
              onClick={() => {
                stopCamera();
                onClose();
              }}
            >
              Confirm & Upload
            </Button>
          </>
        ) : (
          <Button
            onClick={handleConfirmCapture}
            variant="contained"
            disabled={!faceDetected || (requireBlinks && !canCapture) || capturing}
            startIcon={<CameraAlt />}
          >
            {capturing ? 'Capturing...' : 'Capture Photo'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BiometricCaptureWithBlink;
