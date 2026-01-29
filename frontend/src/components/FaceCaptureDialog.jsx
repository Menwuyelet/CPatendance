// src/components/FaceCaptureDialog.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Paper,
  LinearProgress,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  PhotoCamera,
  AutoAwesome,
  CheckCircle,
  Error as ErrorIcon,
  Face,
  Visibility,
} from '@mui/icons-material';
import { faceDetector } from '../utils/faceDetector';

export default function FaceCaptureDialog({
  open,
  onClose,
  onCaptured,
  enableAutoDetection = true,
  faceDetectionEnabled = true,
  detectionStatus = 'Initializing...',
  detectionProgress = 0,
  autoCaptureCountdown = null,
  videoRef: parentVideoRef,
  onStartFaceDetection,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [videoHasContent, setVideoHasContent] = useState(false);
  const [error, setError] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    const stream = videoRef.current?.srcObject;
    if (stream) {
      console.log('Stopping all tracks:', stream.getTracks().length);
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
        track.enabled = false;
      });
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
      videoRef.current.load();
    }
    setCameraReady(false);
    setVideoHasContent(false);
    setIsDetecting(false);
    setError('');
    setShowRetry(false);
  }, []);

  const startCamera = async () => {
    setError('');
    setCameraReady(false);
    setVideoHasContent(false);
    setIsDetecting(false);
    setShowRetry(false);

    try {
      console.log('Step 1: Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });

      console.log('Step 2: Camera stream received. Tracks:', stream.getVideoTracks().length);
      
      // Verify stream is active
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') {
        throw new Error('Camera track is not active');
      }
      console.log('Video track state:', videoTrack.readyState, 'enabled:', videoTrack.enabled);

      if (videoRef.current) {
        console.log('Step 3: Attaching stream to video element');
        
        // Ensure video element is ready
        videoRef.current.srcObject = null; // Clear any previous stream
        videoRef.current.load(); // Reset video element
        
        // Small delay to ensure element is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        videoRef.current.srcObject = stream;
        if (parentVideoRef) parentVideoRef.current = videoRef.current;

        // Set explicit attributes
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        
        // Set camera ready immediately - video element is attached
        setCameraReady(true);
        console.log('Step 3.5: Camera marked as ready, video element attached');
        
        // Force play with better error handling
        try {
          await videoRef.current.play();
          console.log('Step 4: video.play() succeeded');
        } catch (e) {
          console.error('Step 4 ERROR: video.play() failed:', e.name, e.message);
          setError('Browser blocked video playback. Click inside the video area or use the "Retry Camera" button.');
        }
      }

      // Check for real video content with multiple recovery attempts
      let checkAttempts = 0;
      const maxAttempts = 40; // 40 * 300ms = 12 seconds
      
      const checkVideo = setInterval(() => {
        if (videoRef.current) {
          const w = videoRef.current.videoWidth;
          const h = videoRef.current.videoHeight;
          const readyState = videoRef.current.readyState;
          
          console.log(`Video check #${checkAttempts} → width: ${w} height: ${h} readyState: ${readyState}`);
          
          // Try to force play every few attempts if not playing
          if (checkAttempts % 3 === 0 && videoRef.current.paused) {
            console.log('Video is paused, attempting to play...');
            videoRef.current.play().catch(e => console.log('Auto-play attempt failed:', e.message));
          }
          
          if (w > 0 && h > 0) {
            console.log('SUCCESS: Video feed loaded! Ready for detection.');
            setVideoHasContent(true);
            setCameraReady(true);
            clearInterval(checkVideo);
            return;
          }
          
          checkAttempts++;
          
          // If we've tried many times, try to force refresh the stream
          if (checkAttempts === 20 && videoRef.current.srcObject) {
            console.log('Halfway through checks - forcing stream refresh...');
            const currentStream = videoRef.current.srcObject;
            videoRef.current.srcObject = null;
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.srcObject = currentStream;
                videoRef.current.play().catch(e => console.log('Refresh play failed:', e.message));
              }
            }, 100);
          }
          
          if (checkAttempts >= maxAttempts) {
            console.error('Video check timeout - dimensions still 0x0');
            setError('Video feed not loading. Click "Retry Camera" or close other apps using camera.');
            setShowRetry(true);
            clearInterval(checkVideo);
          }
        }
      }, 300);

      // Init face detector
      console.log('Step 5: Initializing face detector...');
      const initSuccess = await faceDetector.init();
      if (!initSuccess) {
        throw new Error('Face detector initialization failed');
      }
      console.log('Face detector initialized successfully');

      if (enableAutoDetection && faceDetectionEnabled) {
        setIsDetecting(true);
        if (onStartFaceDetection) onStartFaceDetection();
      }
    } catch (err) {
      console.error('Camera / init error:', err.name || 'Unknown', err.message || err);
      setShowRetry(true);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow access in browser settings (lock icon → Camera → Allow).');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Make sure your webcam is connected/enabled, or close other apps using it.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another app (Zoom, Teams, OBS, etc.). Close them and try again.');
      } else {
        setError(`Failed to start camera or detection: ${err.message || 'Unknown error'}. Check console (F12).`);
      }
    }
  };

  // Detection loop
  useEffect(() => {
    let rafId;

    const detectLoop = async () => {
      if (!isDetecting || !cameraReady || !videoHasContent || !videoRef.current || !canvasRef.current) return;

      try {
        const detection = await faceDetector.detect(videoRef.current);
        if (detection) {
          faceDetector.drawDetection(canvasRef.current, videoRef.current, detection);
        } else {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (err) {
        console.warn('Detection loop error:', err);
      }

      rafId = requestAnimationFrame(detectLoop);
    };

    if (isDetecting && cameraReady && videoHasContent) {
      detectLoop();
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isDetecting, cameraReady, videoHasContent]);

  // Dialog open/close
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !cameraReady || !videoHasContent) {
      setError('Camera is not ready or has no video feed. Please check permissions and try again.');
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      setError('Video stream not fully loaded yet.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Failed to capture image.');
          return;
        }
        const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
        onCaptured(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetry = () => {
    stopCamera();
    startCamera();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <PhotoCamera />
          <Typography variant="h6">Face Enrollment</Typography>
          {faceDetectionEnabled && (
            <Chip
              label="Auto-Detection Active"
              color="success"
              size="small"
              icon={<AutoAwesome />}
            />
          )}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Status Bar */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Detection Status</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {cameraReady && videoHasContent
                  ? detectionStatus || 'Detecting face...'
                  : cameraReady
                  ? 'Waiting for video feed...'
                  : 'Initializing camera...'}
              </Typography>
              {cameraReady && (
                <Chip 
                  label={videoHasContent ? "Video OK" : "No Video"} 
                  size="small" 
                  color={videoHasContent ? "success" : "warning"}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Stack>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={detectionProgress}
            color={detectionProgress >= 75 ? 'success' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />

          {autoCaptureCountdown !== null && autoCaptureCountdown > 0 && (
            <Typography variant="body2" color="success.main" align="center" sx={{ mt: 1 }}>
              Auto-capturing in {autoCaptureCountdown}...
            </Typography>
          )}

          {!videoHasContent && cameraReady && (
            <Typography variant="body2" color="warning.main" align="center" sx={{ mt: 1 }}>
              Video not showing? Click inside the black area or use "Retry Camera".
            </Typography>
          )}
        </Paper>

        {/* Video Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'grey.900',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer', // clickable to force play
          }}
          onClick={async () => {
            if (videoRef.current) {
              try {
                console.log('User clicked video area, attempting to play...');
                videoRef.current.muted = true; // Ensure muted for autoplay
                await videoRef.current.play();
                console.log('Play triggered successfully from click');
                setError(''); // Clear any playback errors
              } catch (e) {
                console.error('Click play failed:', e.message);
                setError(`Click-to-play failed: ${e.message}`);
              }
            }
          }}
        >
          {!cameraReady ? (
            <Stack alignItems="center" spacing={2}>
              <CircularProgress color="primary" />
              <Typography color="grey.400">Starting camera...</Typography>
            </Stack>
          ) : (
            <>
              {/* Show overlay if video hasn't loaded yet */}
              {!videoHasContent && (
                <Stack 
                  alignItems="center" 
                  spacing={2}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 10,
                    bgcolor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CircularProgress color="warning" />
                  <Typography color="grey.300">Waiting for video feed...</Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        console.log('Manual play button clicked');
                        videoRef.current.muted = true;
                        try {
                          await videoRef.current.play();
                          console.log('Manual play succeeded');
                        } catch (err) {
                          console.error('Manual play failed:', err);
                        }
                      }
                    }}
                  >
                    Click to Start Video
                  </Button>
                </Stack>
              )}
              
              {/* Always render video element when camera is ready */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: 'block', // Ensure video is visible
                  backgroundColor: '#000', // Show black background while loading
                }}
                onLoadedMetadata={(e) => {
                  console.log('onLoadedMetadata: dimensions', e.target.videoWidth, 'x', e.target.videoHeight);
                  if (e.target.videoWidth > 0 && e.target.videoHeight > 0) {
                    console.log('Video dimensions are valid, setting hasContent TRUE');
                    setVideoHasContent(true);
                    setCameraReady(true);
                  } else {
                    console.warn('onLoadedMetadata fired but dimensions are still 0x0');
                  }
                }}
                onLoadedData={() => {
                  console.log('onLoadedData: First frame loaded');
                  setVideoHasContent(true);
                }}
                onCanPlay={() => {
                  console.log('onCanPlay: Video can play');
                  setVideoHasContent(true);
                }}
                onCanPlayThrough={() => {
                  console.log('onCanPlayThrough: can play through - video should show');
                  setVideoHasContent(true);
                  setCameraReady(true);
                }}
                onPlay={() => {
                  console.log('onPlay: Video is playing – face should show!');
                  setVideoHasContent(true);
                }}
                onPlaying={() => {
                  console.log('onPlaying: Video is actively playing');
                  setVideoHasContent(true);
                  setCameraReady(true);
                }}
                onError={(e) => {
                  console.error('Video element error:', e);
                  setError('Video playback error. Try "Retry Camera".');
                }}
                onStalled={() => console.warn('Video stalled')}
                onSuspend={() => console.warn('Video suspended')}
                onWaiting={() => console.log('Video waiting for data...')}
              />

              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  transform: 'scaleX(-1)',
                }}
              />

              {/* Guide circle */}
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
                    width: '40%',
                    height: '55%',
                    border: '3px dashed rgba(0, 255, 136, 0.6)',
                    borderRadius: '50%',
                  }}
                />
              </Box>
            </>
          )}
        </Box>

        {/* Tips */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="info.dark" gutterBottom>
            Tips for Best Detection
          </Typography>
          <Stack spacing={1} sx={{ pl: 2 }}>
            <Typography variant="body2">• Ensure good lighting and face visibility</Typography>
            <Typography variant="body2">• Center face inside the circle</Typography>
            <Typography variant="body2">• Look directly at the camera</Typography>
            <Typography variant="body2">• Avoid hats/glasses if possible</Typography>
            <Typography variant="body2">• If black screen: click inside the box or use "Retry Camera"</Typography>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCapture}
          disabled={!cameraReady || !videoHasContent}
          startIcon={<PhotoCamera />}
        >
          Capture Face
        </Button>
        {showRetry && (
          <Button variant="outlined" color="primary" onClick={() => {
            stopCamera();
            startCamera();
          }}>
            Retry Camera
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}