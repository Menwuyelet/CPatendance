// src/components/WebcamCapture.jsx
import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  CameraAlt,
  Refresh,
  Face,
  FaceRetouchingOff,
} from '@mui/icons-material';

const WebcamCapture = forwardRef(
  (
    {
      onCapture,                    // (blob, action) => void
      autoSend = false,
      countdownSeconds = 5,
      showFaceDetectionFeedback = true,
      disabled = false,
    },
    ref
  ) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [streamActive, setStreamActive] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [faceDetected, setFaceDetected] = useState(null); // null | true | false
    const [error, setError] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    useImperativeHandle(ref, () => ({
      startCamera,
      stopCamera,
      startCountdown: (secs = countdownSeconds, action = 'capture') =>
        startCountdownCapture(secs, action),
    }));

    useEffect(() => {
      return () => stopCamera();
    }, []);

    const startCamera = async () => {
      try {
        setError(null);
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          setStream(s);
          setStreamActive(true);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera permission.'
            : 'Unable to access camera. Please check your device.'
        );
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setStreamActive(false);
      setCountdown(null);
      setFaceDetected(null);
    };

    // Simulated face detection (replace with real library later)
    const detectFace = () => {
      // TODO: Integrate face-api.js or MediaPipe here
      const hasFace = Math.random() > 0.35; // ~65% chance of detecting face
      setFaceDetected(hasFace);
      return hasFace;
    };

    const captureBlob = (callback) => {
      if (!videoRef.current || !streamActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) callback(blob);
      }, 'image/jpeg', 0.92);
    };

    const startCountdownCapture = (secs = countdownSeconds, action = 'capture') => {
      if (!streamActive) {
        setError('Camera is not active');
        return;
      }

      setIsCapturing(true);
      setCountdown(secs);
      setFaceDetected(null);

      let remaining = secs;
      const interval = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);

        if (showFaceDetectionFeedback) {
          detectFace();
        }

        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(null);

          captureBlob((blob) => {
            if (onCapture) onCapture(blob, action);
            setIsCapturing(false);
          });
        }
      }, 1000);
    };

    return (
      <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
        <Paper
          elevation={6}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: '#000',
            aspectRatio: '4/3',
            maxHeight: '70vh',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Countdown Overlay */}
          {countdown !== null && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'rgba(0,0,0,0.65)',
                color: 'white',
                borderRadius: '50%',
                width: 140,
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                fontWeight: 'bold',
                boxShadow: 10,
                border: '4px solid white',
              }}
            >
              {countdown}
            </Box>
          )}

          {/* Face Detection Feedback */}
          {showFaceDetectionFeedback && streamActive && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                minWidth: 280,
              }}
            >
              {faceDetected === true ? (
                <Alert severity="success" icon={<Face />} sx={{ borderRadius: 3 }}>
                  Face detected successfully!
                </Alert>
              ) : faceDetected === false ? (
                <Alert severity="warning" icon={<FaceRetouchingOff />} sx={{ borderRadius: 3 }}>
                  No face detected — please adjust your position
                </Alert>
              ) : (
                <Alert severity="info" icon={<CircularProgress size={22} />} sx={{ borderRadius: 3 }}>
                  Detecting your face...
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        {/* Controls */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!streamActive ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Videocam />}
              onClick={startCamera}
              disabled={disabled || isCapturing}
              size="large"
            >
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<VideocamOff />}
                onClick={stopCamera}
                disabled={disabled || isCapturing}
              >
                Stop Camera
              </Button>

              <Button
                variant="contained"
                color="success"
                startIcon={<CameraAlt />}
                onClick={() => startCountdownCapture(countdownSeconds, 'capture')}
                disabled={disabled || isCapturing || countdown !== null}
              >
                {isCapturing ? 'Capturing...' : 'Capture Now'}
              </Button>

              <IconButton
                color="primary"
                onClick={startCamera}
                disabled={disabled || isCapturing}
                title="Refresh Camera"
              >
                <Refresh />
              </IconButton>
            </>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {isCapturing && (
          <Box sx={{ mt: 3 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Capturing and processing your photo...
            </Typography>
          </Box>
        )}
      </Box>
    );
  }
);

export default WebcamCapture;