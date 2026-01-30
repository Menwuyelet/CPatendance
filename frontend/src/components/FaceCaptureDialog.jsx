// src/components/FaceCaptureDialog.jsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Alert,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import { PhotoCamera, AutoAwesome } from '@mui/icons-material';
import { faceDetector } from '../utils/faceDetector';

const FaceCaptureDialog = memo(function FaceCaptureDialog({
  open,
  onClose,
  onCaptured,
  faceDetectionEnabled = true,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Initialize camera and face detector
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError('');

        // Start camera first (don't wait for model)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play().catch(() => {});
        }

        // Initialize face detector in parallel
        const initialized = await faceDetector.init();
        if (!mounted) return;

        if (!initialized) {
          setError('Face detection unavailable. You can still capture manually.');
        }

        setModelReady(initialized);
        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError('Camera access failed. Please check permissions.');
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open]);

  // Face detection loop using faceDetector utility
  useEffect(() => {
    if (!open || !modelReady || !faceDetectionEnabled) return;

    let running = true;
    let lastTime = 0;

    const detectLoop = (timestamp) => {
      if (!running) return;
      
      // Throttle to ~30fps for performance
      if (timestamp - lastTime < 33) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      lastTime = timestamp;

      if (!videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      try {
        const detection = faceDetector.detect(videoRef.current);
        setFaceDetected(!!detection);

        // Draw detection overlay
        if (canvasRef.current) {
          faceDetector.drawDetection(canvasRef.current, videoRef.current, detection);
        }
      } catch {
        // Silently handle detection errors
      }

      if (running) {
        rafRef.current = requestAnimationFrame(detectLoop);
      }
    };

    rafRef.current = requestAnimationFrame(detectLoop);

    return () => {
      running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, modelReady, faceDetectionEnabled]);

  // Capture handler
  const handleCapture = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `face_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCaptured(file);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  }, [onCaptured, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <PhotoCamera />
          <Typography variant="h6">Face Enrollment</Typography>
          {faceDetectionEnabled && (
            <Chip label="Auto-Detection Active" color="success" size="small" icon={<AutoAwesome />} />
          )}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            bgcolor: 'black',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <Stack sx={{ height: '100%' }} alignItems="center" justifyContent="center">
              <CircularProgress color="primary" />
              <Typography sx={{ mt: 2, color: 'white' }}>Loading face detection model...</Typography>
            </Stack>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              />

              {faceDetected ? (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Typography sx={{ color: '#00ff88', bgcolor: 'rgba(0,0,0,0.5)', px: 4, py: 1.5, borderRadius: 2, fontWeight: 'bold' }}>
                    Face Detected – Ready to Capture
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Box sx={{ width: '50%', height: '65%', border: '3px dashed #ffffff', borderRadius: '50%', opacity: 0.7 }} />
                  <Typography sx={{ position: 'absolute', bottom: 40, color: 'white', bgcolor: 'rgba(0,0,0,0.7)', px: 3, py: 1, borderRadius: 2 }}>
                    Center your face in the circle
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>

        <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
          <Typography variant="subtitle2">Tips for Best Detection</Typography>
          <ul style={{ margin: '8px 0 0 20px' }}>
            <li>Good even lighting from the front</li>
            <li>Face 30–50 cm from camera</li>
            <li>Look straight into the camera</li>
            <li>Remove glasses/hat if possible</li>
            <li>If no video: check browser permissions or restart</li>
          </ul>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<PhotoCamera />}
          onClick={handleCapture}
          disabled={loading}
          color={faceDetected ? 'success' : 'primary'}
        >
          {faceDetected ? 'Capture Face' : 'Capture Anyway'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

FaceCaptureDialog.displayName = 'FaceCaptureDialog';

export default FaceCaptureDialog;
