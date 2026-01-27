import React, { useEffect, useRef, useState } from 'react';
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
} from '@mui/material';

export default function FaceCaptureDialog({
  open,
  title = 'Capture Photo',
  onClose,
  onCaptured,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = () => {
    try {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (_) {}
    setCameraReady(false);
  };

  const startCamera = async () => {
    setError('');
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setError('Unable to access camera. Please check browser permissions.');
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setError('');
      return;
    }

    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;

    // Prevent blank captures
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError('Camera is not ready yet. Wait 1–2 seconds and try again.');
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Failed to capture image. Please try again.');
          return;
        }

        const file = new File([blob], 'capture.jpg', {
          type: blob.type || 'image/jpeg',
        });

        onCaptured?.(file);
        onClose?.();
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box
            sx={{
              width: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'grey.100',
              border: '1px solid',
              borderColor: 'grey.300',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              onLoadedMetadata={() => setCameraReady(true)}
              onCanPlay={() => setCameraReady(true)}
              style={{ width: '100%', display: 'block' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Make sure your face is centered and well-lit.
          </Typography>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={capture} disabled={!cameraReady}>
          Capture
        </Button>
      </DialogActions>
    </Dialog>
  );
}
