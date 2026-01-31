import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  LinearProgress,
  Alert,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export default function FaceCaptureDialog({ open, onClose, onCaptured }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState(null);
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const isCapturing = useRef(false);
  const countdownInterval = useRef(null);
  const detectionInterval = useRef(null);

  // 1. Load Models on Mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; 
        // Using Task.all to ensure both are ready
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setStatus('Ready');
      } catch (e) {
        console.error("Model Load Error:", e);
        setError('Face models could not be loaded. Check /public/models path.');
      }
    };
    loadModels();
  }, []);

  // 2. Camera Management
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    clearInterval(detectionInterval.current);
    clearInterval(countdownInterval.current);
    resetState();
  };

  const resetState = () => {
    setIsFaceValid(false);
    setCountdown(null);
    isCapturing.current = false;
    countdownInterval.current = null;
  };

  const startCamera = async () => {
    setError(null);
    setStatus('Starting Camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('Align your face');
      }
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Camera access denied.' : 'No camera found or HTTPS required.');
    }
  };

  useEffect(() => {
    if (open && modelsLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, modelsLoaded]);

  // 3. Face Detection Logic
  const onPlay = () => {
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || isCapturing.current || !modelsLoaded) return;

      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
      ).withFaceLandmarks();

      if (detection) {
        const { box } = detection.detection;
        
        // Logical bounds for a 640x480 stream inside a 280x280 circle
        const isCentered = box.x > 80 && (box.x + box.width) < 560;
        const isRightSize = box.width > 150 && box.width < 350;

        if (isCentered && isRightSize) {
          if (!isFaceValid) {
            setIsFaceValid(true);
            startCountdown();
          }
          setStatus('Perfect, hold still...');
        } else {
          setIsFaceValid(false);
          resetCountdown();
          setStatus(isRightSize ? 'Center your face' : 'Move closer');
        }
      } else {
        setIsFaceValid(false);
        resetCountdown();
        setStatus('Scanning for face...');
      }
    }, 200);
  };

  const startCountdown = () => {
    if (countdownInterval.current) return;
    let count = 3;
    setCountdown(count);
    
    countdownInterval.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownInterval.current);
        triggerCapture();
      } else {
        setCountdown(count);
      }
    }, 800);
  };

  const resetCountdown = () => {
    clearInterval(countdownInterval.current);
    countdownInterval.current = null;
    setCountdown(null);
  };

  // 4. Capture and Send to Parent
  const triggerCapture = () => {
    if (isCapturing.current) return;
    isCapturing.current = true;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Mirror the frame to match what the user sees
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
      // Send to Biometrics.jsx component
      onCaptured(file); 
      // Stop and Close
      stopCamera();
    }, 'image/jpeg', 0.95); // High quality to reduce "Face not clear" errors
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 10 }}>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h6" fontWeight="bold">Face Verification</Typography>
          
          {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
          
          {/* Circular Video Container */}
          <Box sx={{ 
            position: 'relative', width: 260, height: 260, borderRadius: '50%', 
            overflow: 'hidden', border: '5px solid', 
            borderColor: isFaceValid ? 'success.main' : 'primary.main',
            boxShadow: isFaceValid ? '0 0 20px rgba(76, 175, 80, 0.4)' : 'none',
            bgcolor: 'black', transition: 'all 0.3s ease'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              onPlay={onPlay}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            
            {/* Detection HUD */}
            <Box sx={{
                position: 'absolute', inset: 0, 
                border: '2px dashed rgba(255,255,255,0.3)', 
                borderRadius: '50%', m: 2, pointerEvents: 'none'
            }} />

            {countdown !== null && (
              <Box sx={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', 
                justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', zIndex: 2
              }}>
                <Typography variant="h1" sx={{ color: 'white', fontWeight: '900', textShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}>
                  {countdown}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="body1" sx={{ 
              fontWeight: 'bold', 
              color: isFaceValid ? 'success.main' : 'text.primary',
              minHeight: '1.5em'
            }}>
              {status}
            </Typography>
            <LinearProgress 
              variant={isFaceValid ? "determinate" : "indeterminate"} 
              value={isFaceValid ? (4 - countdown) * 25 : 100}
              color={isFaceValid ? "success" : "primary"}
              sx={{ mt: 2, borderRadius: 2, height: 8 }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Make sure you are in a bright area and looking directly at the camera.
          </Typography>

          <Button onClick={onClose} fullWidth color="inherit">Cancel</Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}