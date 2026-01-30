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
} from '@mui/material';

export default function FaceCaptureDialog({ open, onClose, onCaptured }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const isCapturing = useRef(false);
  const countdownInterval = useRef(null);
  const detectionInterval = useRef(null);

  // Reset all states when dialog opens (Allows re-capture)
  useEffect(() => {
    if (open) {
      isCapturing.current = false;
      setIsFaceValid(false);
      setCountdown(null);
      setStatus('Loading Models...');
      loadModels();
    } else {
      stopCamera();
    }
  }, [open]);

  const loadModels = async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      setStatus('Ready! Center your face');
      startCamera();
    } catch (e) {
      setStatus('Error: Models not found');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      setStatus('Camera Access Denied');
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    clearInterval(detectionInterval.current);
    clearInterval(countdownInterval.current);
  };

  const onPlay = () => {
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || isCapturing.current) return;

      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
      ).withFaceLandmarks();

      if (detection) {
        const box = detection.detection.box;
        const landmarks = detection.landmarks;
        
        // 1. Check if face is too small (too far away)
        if (box.width < 150) {
          setStatus('Please move closer to the camera');
          setIsFaceValid(false);
          resetCountdown();
          return;
        }

        // 2. Check if face is roughly centered in video (640x480)
        const faceCenterX = box.x + box.width / 2;
        if (faceCenterX < 150 || faceCenterX > 490) {
          setStatus('Center your face in the circle');
          setIsFaceValid(false);
          resetCountdown();
          return;
        }

        // 3. Face is valid
        if (!isFaceValid) {
          setIsFaceValid(true);
          startCountdown();
        }
        setStatus('Looking good! Hold still...');

        // Instant Capture on Blink
        if (checkBlink(landmarks.getLeftEye()) || checkBlink(landmarks.getRightEye())) {
          triggerCapture();
        }
      } else {
        setIsFaceValid(false);
        resetCountdown();
        setStatus('No face detected. Look at the camera');
      }
    }, 200);
  };

  const startCountdown = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    let count = 5; // Increased to 5 seconds for better client ease
    setCountdown(count);
    countdownInterval.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownInterval.current);
        triggerCapture();
      }
    }, 1000);
  };

  const resetCountdown = () => {
    clearInterval(countdownInterval.current);
    countdownInterval.current = null;
    setCountdown(null);
  };

  const checkBlink = (eye) => {
    const height = Math.abs(eye[1].y - eye[5].y);
    const width = Math.abs(eye[0].x - eye[3].x);
    return (height / width) < 0.20;
  };

  const triggerCapture = () => {
    if (isCapturing.current) return;
    isCapturing.current = true;
    
    clearInterval(detectionInterval.current);
    resetCountdown();
    setStatus('Capturing Attendance...');
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' });
      onCaptured(file);
      onClose();
    }, 'image/jpeg', 0.95);
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogContent>
        <Stack alignItems="center" spacing={3} sx={{ py: 2, px: 1 }}>
          <Box sx={{ 
            position: 'relative', 
            width: 320, 
            height: 320, 
            borderRadius: '50%', 
            overflow: 'hidden',
            border: '8px solid',
            borderColor: isFaceValid ? '#4caf50' : '#ff9800', // Green if good, Orange if warning
            boxShadow: isFaceValid ? '0 0 30px rgba(76, 175, 80, 0.5)' : 'none',
            transition: 'all 0.3s ease',
            bgcolor: '#000'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              onPlay={onPlay}
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />

            {countdown && (
              <Box sx={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)', pointerEvents: 'none'
              }}>
                <Typography sx={{ fontSize: '7rem', color: '#fff', fontWeight: 'bold' }}>
                  {countdown}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ width: '100%', textAlign: 'center', minHeight: '60px' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: isFaceValid ? '#2e7d32' : '#d32f2f' }}>
              {status}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attendance Liveness Detection
            </Typography>
          </Box>

          {isFaceValid && !isCapturing.current && (
            <LinearProgress color="success" sx={{ width: '100%', height: 6, borderRadius: 3 }} />
          )}

          <Button onClick={onClose} variant="outlined" color="inherit" fullWidth>
            Cancel
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}