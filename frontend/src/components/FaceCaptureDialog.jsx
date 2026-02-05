import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import {
  Dialog, DialogContent, Typography, Box, Stack,
  LinearProgress, Alert, IconButton, Chip, Zoom, useTheme, Fade
} from '@mui/material';
import { 
  Close as CloseIcon, CheckCircle, Visibility, 
  Face, SyncAlt, CameraEnhance, LightMode, WbIncandescent
} from '@mui/icons-material';

export default function FaceCaptureDialog({ open, onClose, onCaptured, mode = 'ATTENDANCE' }) {
  const theme = useTheme();
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Initializing AI...');
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  
  const [requirements, setRequirements] = useState({
    aligned: false,
    blinked: false,
    moved: false
  });

  const isCapturing = useRef(false);
  const detectionInterval = useRef(null);
  const countdownInterval = useRef(null);
  
  const baselineEyeHeight = useRef(null);
  const initialNosePos = useRef(null);
  const currentFaceDetection = useRef(null);

  // 1. Model Loading
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; 
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setStatus('Ready');
      } catch (e) {
        setError('Detection models missing. Check /public/models');
      }
    };
    if (open) loadModels();
  }, [open]);

  const stopEverything = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    clearInterval(detectionInterval.current);
    clearInterval(countdownInterval.current);
    isCapturing.current = false;
    setCountdown(null);
    setCaptureSuccess(false);
    baselineEyeHeight.current = null;
    initialNosePos.current = null;
  }, []);

  useEffect(() => {
    if (open && modelsLoaded) {
      setRequirements({ aligned: false, blinked: false, moved: false });
      const timer = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(timer);
    } else {
      stopEverything();
    }
  }, [open, modelsLoaded, stopEverything]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied. Please check site permissions.');
    }
  };

  const runDetection = async () => {
    if (!videoRef.current || isCapturing.current || !modelsLoaded) return;

    const detection = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
    ).withFaceLandmarks();

    if (!detection) {
      setStatus('No face detected. Adjust lighting.');
      setRequirements(prev => ({ ...prev, aligned: false }));
      resetTimer();
      return;
    }

    currentFaceDetection.current = detection;
    const landmarks = detection.landmarks;
    const box = detection.detection.box;

    const isCentered = (box.x + box.width/2) > 180 && (box.x + box.width/2) < 460;
    const isClose = box.width > 160;
    const aligned = isCentered && isClose;

    let blinked = requirements.blinked;
    if (mode === 'ENROLL' && aligned && !blinked) {
      const leftEye = landmarks.getLeftEye();
      const currentH = Math.abs(leftEye[1].y - leftEye[5].y);
      if (!baselineEyeHeight.current) baselineEyeHeight.current = currentH;
      else if (currentH < baselineEyeHeight.current * 0.6) blinked = true;
    }

    let moved = requirements.moved;
    if (mode === 'ENROLL' && aligned && blinked && !moved) {
      const noseX = landmarks.getNose()[3].x;
      if (initialNosePos.current === null) initialNosePos.current = noseX;
      else if (Math.abs(noseX - initialNosePos.current) > 30) moved = true;
    }

    setRequirements({ aligned, blinked, moved });

    if (mode === 'ENROLL') {
      if (!aligned) setStatus(!isClose ? 'Move Closer' : 'Center Face');
      else if (!blinked) setStatus('NOW: Blink your eyes');
      else if (!moved) setStatus('NOW: Turn head slightly');
      else startCaptureSequence();
    } else {
      if (aligned) startCaptureSequence();
      else setStatus('Align Face to Circle');
    }
  };

  const startCaptureSequence = () => {
    if (countdownInterval.current || isCapturing.current) return;
    let count = 3;
    setCountdown(count);
    setStatus('Ready! Hold Still...');
    countdownInterval.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownInterval.current);
        triggerCapture();
      }
    }, 800);
  };

  const resetTimer = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
      setCountdown(null);
    }
  };

  const triggerCapture = () => {
    if (isCapturing.current || !currentFaceDetection.current) return;
    isCapturing.current = true;
    
    const video = videoRef.current;
    const detection = currentFaceDetection.current;
    const { x, y, width, height } = detection.detection.box;

    const canvas = document.createElement('canvas');
    const padding = 60; 
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;
    const ctx = canvas.getContext('2d');

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      x - padding, y - padding, width + padding * 2, height + padding * 2,
      0, 0, canvas.width, canvas.height
    );
    
    canvas.toBlob((blob) => {
      setCaptureSuccess(true);
      setStatus('Verification Complete ✅');
      onCaptured(new File([blob], 'face_capture.jpg', { type: 'image/jpeg' }));
      setTimeout(() => { onClose(); stopEverything(); }, 1200);
    }, 'image/jpeg', 0.95);
  };

  useEffect(() => {
    if (open && modelsLoaded) {
      detectionInterval.current = setInterval(runDetection, 150);
    }
    return () => clearInterval(detectionInterval.current);
  }, [open, modelsLoaded, requirements, mode]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth 
      PaperProps={{ 
        sx: { 
          borderRadius: 6,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.8)' : '0 8px 32px rgba(0,0,0,0.1)'
        } 
      }}
    >
      <Box sx={{ position: 'absolute', right: 16, top: 16, zIndex: 10 }}>
        <IconButton onClick={onClose} sx={{ bgcolor: 'action.hover' }}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <Stack spacing={3} alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight="800" sx={{ color: 'text.primary', mb: 0.5 }}>
              {mode === 'ENROLL' ? 'Face Enrollment' : 'Quick Check-in'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === 'ENROLL' ? 'Create your biometric profile' : 'Verification Mode'}
            </Typography>
          </Box>

          {error && <Alert severity="error" variant="filled" sx={{ width: '100%', borderRadius: 3 }}>{error}</Alert>}

          <Box sx={{ 
            position: 'relative', 
            width: { xs: 240, sm: 280 }, 
            height: { xs: 240, sm: 280 }, 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '8px solid', 
            borderColor: captureSuccess ? 'success.main' : (requirements.aligned ? 'success.light' : 'divider'),
            boxShadow: requirements.aligned ? `0 0 20px ${theme.palette.success.main}44` : 'none',
            bgcolor: 'black',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
            />
            
            <Fade in={countdown !== null}>
              <Box sx={{ 
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', 
                justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 5 
              }}>
                <Typography variant="h1" sx={{ color: 'white', fontWeight: 900, fontSize: '6rem' }}>
                  {countdown}
                </Typography>
              </Box>
            </Fade>

            <Fade in={captureSuccess}>
              <Box sx={{ 
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', 
                justifyContent: 'center', bgcolor: 'rgba(76, 175, 80, 0.7)', backdropFilter: 'blur(8px)', zIndex: 6 
              }}>
                <CheckCircle sx={{ color: 'white', fontSize: 100 }} />
              </Box>
            </Fade>
          </Box>

          <Box sx={{ width: '100%', px: 2 }}>
            <Typography 
              variant="subtitle1" 
              color={captureSuccess ? "success.main" : (requirements.aligned ? "success.main" : "text.primary")} 
              sx={{ fontWeight: 700, minHeight: '1.6em', mb: 1 }}
            >
              {status}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={requirements.aligned ? 100 : 25} 
              color={requirements.aligned ? "success" : "primary"} 
              sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover' }} 
            />
          </Box>

          {mode === 'ENROLL' && (
            <Stack direction="row" spacing={1.5}>
              <Chip 
                icon={<WbIncandescent fontSize="small" />}
                label="Light Verified" 
                color={requirements.aligned ? "success" : "default"} 
                variant={requirements.aligned ? "filled" : "outlined"} 
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                icon={<SyncAlt fontSize="small" />}
                label="Turn Detected" 
                color={requirements.moved ? "success" : "default"} 
                variant={requirements.moved ? "filled" : "outlined"} 
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.7 }}>
            <CameraEnhance sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" fontWeight="500">
              {mode === 'ATTENDANCE' ? 'Look directly at camera' : 'Follow liveness requirements'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}