import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Box, Alert,
  Paper, LinearProgress, Chip, CircularProgress
} from '@mui/material';
import { PhotoCamera, AutoAwesome } from '@mui/icons-material';
import { faceDetector } from '../utils/faceDetector';

export default function FaceCaptureDialog({
  open,
  onClose,
  onCaptured,
  enableAutoDetection = true,
  faceDetectionEnabled = true,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [error, setError] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const stopCamera = useCallback(() => {
    console.log('[Dialog] Stopping camera');
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setVideoVisible(false);
    setIsDetecting(false);
    setError('');
  }, []);

  const startCamera = async () => {
    setError('');
    setCameraReady(false);
    setVideoVisible(false);
    setIsDetecting(false);

    try {
      console.log('[Dialog] Requesting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      console.log('[Dialog] Stream received');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;

        const forcePlay = () => {
          videoRef.current?.play().catch(e => console.log('[Play attempt]', e.message));
        };
        forcePlay();
        setTimeout(forcePlay, 300);
        setTimeout(forcePlay, 800);
        setTimeout(forcePlay, 1500);

        setCameraReady(true);
      }

      const interval = setInterval(() => {
        if (videoRef.current?.videoWidth > 0 && videoRef.current?.videoHeight > 0) {
          console.log('[Dialog] Video visible - width:', videoRef.current.videoWidth);
          setVideoVisible(true);
          clearInterval(interval);
        }
      }, 200);

      setTimeout(() => clearInterval(interval), 12000);

      const initOk = await faceDetector.init();
      if (!initOk) throw new Error('Face detector init failed');

      if (enableAutoDetection && faceDetectionEnabled) {
        setIsDetecting(true);
      }
    } catch (err) {
      console.error('[Dialog] Error:', err);
      setError('Failed to start camera. Try again or check permissions.');
    }
  };

  useEffect(() => {
    let rafId;

    const detectionLoop = async () => {
      if (!isDetecting || !cameraReady || !videoVisible || !videoRef.current || !canvasRef.current) return;

      try {
        const detection = await faceDetector.detect(videoRef.current);
        console.log('[Detection]', detection ? 'FOUND' : 'no face');

        faceDetector.drawDetection(canvasRef.current, videoRef.current, detection);
      } catch (err) {
        console.warn('[Detection loop error]', err);
      }

      rafId = requestAnimationFrame(detectionLoop);
    };

    if (isDetecting && cameraReady && videoVisible) {
      console.log('[Dialog] Detection loop started');
      detectionLoop();
    }

    return () => cancelAnimationFrame(rafId);
  }, [isDetecting, cameraReady, videoVisible]);

  useEffect(() => {
    if (open) startCamera();
    return () => stopCamera();
  }, [open, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !videoVisible) {
      setError('Camera not ready yet');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw mirrored for capture (if you want mirrored photo)
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
        onCaptured(file);
        onClose();
      }
    }, 'image/jpeg', 0.92);
  };

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
            cursor: 'pointer',
          }}
          onClick={() => videoRef.current?.play().catch(() => {})}
        >
          {!cameraReady ? (
            <Stack sx={{ height: '100%' }} alignItems="center" justifyContent="center">
              <CircularProgress color="primary" />
              <Typography sx={{ mt: 2, color: 'white' }}>Starting camera...</Typography>
            </Stack>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onLoadedMetadata={() => {
                  if (videoRef.current?.videoWidth > 0) {
                    console.log('[Video] Metadata loaded - width:', videoRef.current.videoWidth);
                    setVideoVisible(true);
                  }
                }}
                onCanPlay={() => setVideoVisible(true)}
                onPlaying={() => console.log('[Video] Playing - face should be visible')}
              />

              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  transform: 'scaleX(-1)', // ← mirror only the output canvas
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    width: '45%',
                    height: '60%',
                    border: '3px dashed #00ff88',
                    borderRadius: '50%',
                  }}
                />
              </Box>
            </>
          )}
        </Box>

        <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
          <Typography variant="subtitle2">Tips for Best Detection</Typography>
          <ul style={{ margin: '8px 0 0 20px' }}>
            <li>Good front lighting – no strong backlight</li>
            <li>Face 30–50 cm from camera</li>
            <li>Center face inside oval</li>
            <li>Look straight at camera</li>
            <li>If still black: click inside box or retry</li>
          </ul>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<PhotoCamera />}
          onClick={handleCapture}
          disabled={!videoVisible}
        >
          Capture Face
        </Button>
      </DialogActions>
    </Dialog>
  );
}