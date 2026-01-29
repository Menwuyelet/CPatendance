// src/pages/Biometrics.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Paper,
  Stack,
  Avatar,
  Divider,
  Alert,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Switch,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Modal as MUIModal,
  FormControlLabel,
  Slider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Fingerprint,
  Security,
  CameraAlt,
  HowToReg,
  CheckCircleOutline,
  Schedule,
  Shield,
  Info,
  Refresh,
  Visibility,
  Search,
  Clear,
  Delete,
  Face,
  FlashOn,
  FlashOff,
  AutoAwesome,
  Camera,
  FaceRetouchingNatural,
  Sensors,
  Settings,
  CloudUpload,
  TaskAlt,
  Error as ErrorIcon,
  PhotoCamera,
  CheckCircle,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import FaceCaptureDialog from '../components/FaceCaptureDialog';
import { faceDetector } from '../utils/faceDetector';  // ← Correct import

const Biometrics = ({ onNotify, role }) => {
  const isEmployee = role === 'Employee';
  const isAdmin = role === 'Admin';
  const isHR = role === 'HR';

  const [tabValue, setTabValue] = useState(0);
  const [employeeId, setEmployeeId] = useState('');
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoSending, setAutoSending] = useState(false);

  // Face capture dialog state
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Enhanced features state
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(true);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [blinkDetectionEnabled, setBlinkDetectionEnabled] = useState(true); // now real
  const [qualityThreshold, setQualityThreshold] = useState(0.7);
  const [captureDelay, setCaptureDelay] = useState(3);

  // Face detection state
  const [detectionStatus, setDetectionStatus] = useState('Ready');
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState(null);
  const [showAutoCaptureDialog, setShowAutoCaptureDialog] = useState(false);
  const [capturedImageData, setCapturedImageData] = useState(null);
  const [lastFaceData, setLastFaceData] = useState(null);
  const [eyeBlinkDetected, setEyeBlinkDetected] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const captureTimeoutRef = useRef(null);
  const consecutiveFramesRef = useRef(0);
  const detectionActiveRef = useRef(false);

  // Load current user's employee profile
  useEffect(() => {
    const loadEmployeeProfile = async () => {
      setLoadingProfile(true);
      try {
        const emp = await api.getMyEmployee();
        const empId = emp?.id;
        if (empId) {
          setEmployeeId(String(empId));
          setHasEmployeeProfile(true);
        } else {
          setHasEmployeeProfile(false);
        }
      } catch (e) {
        console.error('Failed to load Employee profile', e);
        setHasEmployeeProfile(false);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadEmployeeProfile();
  }, []);

  const loadProfiles = useCallback(async () => {
    if (isEmployee) return;
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const res = await api.getAllProfiles();
      const list = Array.isArray(res) ? res : res?.results || [];
      setProfiles(list);
    } catch (err) {
      console.error('Failed to load biometric profiles:', err);
      setProfiles([]);
      setProfilesError('Unable to load profiles. Please try again later.');
      onNotify?.('Failed to load biometric profiles.', 'error');
    } finally {
      setProfilesLoading(false);
    }
  }, [isEmployee, onNotify]);

  useEffect(() => {
    if (!isEmployee) {
      loadProfiles();
    }
  }, [isEmployee, loadProfiles]);

  // Handle auto-capture countdown
  useEffect(() => {
    if (autoCaptureCountdown !== null && autoCaptureCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoCaptureCountdown(autoCaptureCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoCaptureCountdown === 0) {
      setAutoCaptureCountdown(null);
      performAutoCapture();
    }
  }, [autoCaptureCountdown]);

  // Handle auto-send after capture
  useEffect(() => {
    if (capturedImageData && autoSendEnabled && hasEmployeeProfile) {
      autoSendToBackend(capturedImageData);
    }
  }, [capturedImageData, autoSendEnabled, hasEmployeeProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      if (capturedImageData?.url) {
        URL.revokeObjectURL(capturedImageData.url);
      }
    };
  }, [imagePreview, capturedImageData]);

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      !search ||
      (p.employee_name || p.employee || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && p.is_active) ||
      (statusFilter === 'Inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalEnrolled = profiles.length;
  const totalActive = profiles.filter((p) => p.is_active).length;
  const stats = {
    totalEnrolled,
    activeToday: totalActive,
    totalRevoked: totalEnrolled - totalActive,
    securityLevel: totalActive > 0 ? 'High' : 'Medium',
  };

  // ─────────────────────────────────────────────────────────────
  // Real face detection loop – using faceDetector from faceDetector.js
  // ─────────────────────────────────────────────────────────────
  const startFaceDetection = useCallback(() => {
    if (!captureDialogOpen || !faceDetectionEnabled || !videoRef.current || detectionActiveRef.current) {
      return;
    }

    detectionActiveRef.current = true;

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const face = await faceDetector.detect(videoRef.current);

        if (face) {
          const confidence = face.confidence || 0.6;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;

          if (!videoWidth || !videoHeight) return;

          const bbox = face.boundingBox;
          const faceX = bbox.x + bbox.width / 2;
          const faceY = bbox.y + bbox.height / 2;
          const faceSize = Math.max(bbox.width, bbox.height);

          const isInFrame = confidence > qualityThreshold;
          const isCentered =
            Math.abs(faceX - videoWidth / 2) < videoWidth * 0.15 &&
            Math.abs(faceY - videoHeight / 2) < videoHeight * 0.15;
          const isSizeOptimal =
            faceSize > Math.min(videoWidth, videoHeight) * 0.25 &&
            faceSize < Math.min(videoWidth, videoHeight) * 0.45;

          let progress = 0;
          if (isInFrame) progress += 25;
          if (isCentered) progress += 25;
          if (isSizeOptimal) progress += 25;
          if (face.hasEyes) progress += 25;

          let status = 'Detecting...';
          if (!isInFrame) {
            status = 'Move face into frame';
            consecutiveFramesRef.current = 0;
          } else if (!isCentered) {
            status = 'Center your face in the circle';
            consecutiveFramesRef.current = 0;
          } else if (!isSizeOptimal) {
            status = faceSize < Math.min(videoWidth, videoHeight) * 0.3 ? 'Move closer' : 'Move farther';
            consecutiveFramesRef.current = 0;
          } else {
            status = 'Perfect! Hold still for auto-capture';
            consecutiveFramesRef.current = Math.min(consecutiveFramesRef.current + 1, 10);
          }

          // ── REAL BLINK DETECTION ── (from faceDetector.js)
          if (blinkDetectionEnabled && face.hasEyes && face.isBlinking) {
            setEyeBlinkDetected(true);
            setTimeout(() => setEyeBlinkDetected(false), 500); // show for 0.5s
          }

          setDetectionStatus(status);
          setDetectionProgress(progress);

          setLastFaceData({
            confidence: Math.round(confidence * 100),
            isCentered,
            isSizeOptimal,
            isInFrame,
            hasEyes: face.hasEyes,
            x: Math.round(faceX),
            y: Math.round(faceY),
            ear: face.ear ? face.ear.toFixed(3) : null,
            isBlinking: face.isBlinking || false,
          });

          if (
            autoCaptureEnabled &&
            isInFrame &&
            isCentered &&
            isSizeOptimal &&
            consecutiveFramesRef.current >= 5 &&
            !autoCaptureCountdown
          ) {
            setAutoCaptureCountdown(captureDelay);
          }
        } else {
          setDetectionStatus('No face detected');
          setDetectionProgress(0);
          consecutiveFramesRef.current = 0;
          setLastFaceData(null);
          setEyeBlinkDetected(false);
        }
      } catch (error) {
        console.warn('Detection error:', error);
        setDetectionStatus('Detection error - check console');
        setDetectionProgress(0);
      }
    }, 300);
  }, [
    captureDialogOpen,
    faceDetectionEnabled,
    qualityThreshold,
    autoCaptureEnabled,
    autoCaptureCountdown,
    captureDelay,
    blinkDetectionEnabled,
  ]);

  const clearDetectionInterval = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    detectionActiveRef.current = false;
    consecutiveFramesRef.current = 0;
  }, []);

  const clearCaptureTimeout = useCallback(() => {
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
  }, []);

  const handleCaptureDialogOpen = () => {
    setCaptureDialogOpen(true);
    setCapturedImage(null);
    setImagePreview(null);
    setDetectionStatus('Starting camera...');
    setDetectionProgress(0);
    setAutoCaptureCountdown(null);
    setEyeBlinkDetected(false);
    consecutiveFramesRef.current = 0;

    setTimeout(() => {
      faceDetector.init()
        .then(() => {
          console.log('Face detector ready');
          onNotify?.('Face detection initialized successfully', 'success');
        })
        .catch((err) => {
          console.error('Failed to initialize face detector:', err);
          onNotify?.('Face detection initialization failed. Using basic mode.', 'warning');
        });
    }, 500);
  };

  const handleCaptureDialogClose = () => {
    setCaptureDialogOpen(false);
    clearDetectionInterval();
    clearCaptureTimeout();
    consecutiveFramesRef.current = 0;
    setAutoCaptureCountdown(null);
    setEyeBlinkDetected(false);
  };

  const handleCaptured = async (file) => {
    setCapturedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);

    if (autoSendEnabled && hasEmployeeProfile) {
      await autoSendImage(file);
    } else {
      onNotify?.('Image captured successfully. Click "Enroll Face" to submit.', 'success');
    }
  };

  const performAutoCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;

        const file = new File([blob], `auto_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        setCapturedImageData({ file, url });
        setShowAutoCaptureDialog(true);

        if (autoSendEnabled) {
          setTimeout(() => {
            handleCaptureDialogClose();
          }, 1000);
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Auto-capture failed:', error);
      onNotify?.('Auto-capture failed. Please try manual capture.', 'error');
    }
  };

  const autoSendImage = async (file) => {
    if (!hasEmployeeProfile || !file) return;

    setSubmitting(true);
    setAutoSending(true);

    try {
      const form = new FormData();
      form.append('biometric_type', 'FACE');
      form.append('image', file);
      form.append('employee_id', employeeId);
      form.append('auto_captured', 'true');

      if (lastFaceData) {
        form.append('face_confidence', lastFaceData.confidence.toString());
        form.append('detection_quality', 'auto');
        if (lastFaceData.hasEyes) {
          form.append('eyes_detected', 'true');
        }
      }
      await api.postForm('/biometrics/face/enroll/', form);

      onNotify?.('Face auto-enrolled successfully!', 'success');

      if (!isEmployee) {
        await loadProfiles();
      }

      setCapturedImage(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    } catch (err) {
      console.error('Auto-enrollment failed:', err);
      let msg = err?.message || 'Auto-enrollment failed. Please try manual enrollment.';
      onNotify?.(msg, 'error');
    } finally {
      setSubmitting(false);
      setAutoSending(false);
    }
  };

  const autoSendToBackend = async (imageData) => {
    if (!hasEmployeeProfile || !imageData) return;

    setAutoSending(true);

    try {
      const form = new FormData();
      form.append('biometric_type', 'FACE');
      form.append('image', imageData.file);
      form.append('employee_id', employeeId);
      form.append('auto_captured', 'true');

      if (lastFaceData) {
        form.append('face_confidence', lastFaceData.confidence.toString());
        form.append('detection_quality', 'auto');
        if (lastFaceData.hasEyes) {
          form.append('eyes_detected', 'true');
        }
      }
      await api.postForm('/biometrics/face/enroll/', form);

      onNotify?.('Face auto-enrolled successfully!', 'success');
      setShowAutoCaptureDialog(false);

      if (!isEmployee) {
        await loadProfiles();
      }

      setCapturedImageData(null);
      if (imageData.url) {
        URL.revokeObjectURL(imageData.url);
      }
    } catch (err) {
      console.error('Auto-enrollment failed:', err);
      let msg = err?.message || 'Auto-enrollment failed. Please try manual enrollment.';
      onNotify?.(msg, 'error');
    } finally {
      setAutoSending(false);
    }
  };

  const handleManualEnroll = async () => {
    if (!hasEmployeeProfile) {
      onNotify?.(
        "Face enrollment requires a linked Employee profile.\n\nPlease contact HR or system administrator to link your account.",
        'info'
      );
      return;
    }
    if (!capturedImage) {
      onNotify?.('Please capture a photo first.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('biometric_type', 'FACE');
      form.append('image', capturedImage);
      form.append('employee_id', employeeId);
      await api.postForm('/biometrics/face/enroll/', form);
      onNotify?.('Face enrolled successfully!', 'success');
      if (!isEmployee) await loadProfiles();
      setCapturedImage(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    } catch (err) {
      let msg = err?.message || 'Enrollment failed. Please try again.';
      onNotify?.(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleProfile = async (profile) => {
    if (!(isAdmin || isHR)) return;
    const newActive = !profile.is_active;
    try {
      const updated = await api.patch(`/biometrics/profiles/${profile.id}/`, {
        is_active: newActive,
      });
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      onNotify?.(newActive ? 'Profile activated.' : 'Profile deactivated.', 'success');
    } catch (err) {
      onNotify?.('Failed to update profile status.', 'error');
    }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this profile permanently?')) return;
    try {
      await api.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      onNotify?.('Profile deleted successfully.', 'info');
    } catch (err) {
      onNotify?.('Failed to delete profile.', 'error');
    }
  };

  const openDetails = (profile) => {
    setSelectedProfile(profile);
    setDetailsOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 7 }}>
        <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 2 }}>
          <Fingerprint sx={{ fontSize: 56, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight="bold">
              Attendance Management System - Face Enrollment
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Advanced facial recognition with auto-detection and enrollment
            </Typography>
          </Box>
          <Chip
            label="Auto-Detection Active"
            color="success"
            icon={<AutoAwesome />}
            sx={{ ml: 'auto', px: 2, py: 1, fontWeight: 'bold', fontSize: '0.95rem' }}
          />
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {[
          { value: stats.totalEnrolled, label: 'Total Enrolled', icon: <HowToReg />, color: 'primary' },
          { value: stats.activeToday, label: 'Active Today', icon: <CheckCircleOutline />, color: 'success' },
          { value: stats.totalRevoked, label: 'Revoked', icon: <Shield />, color: 'error' },
          { value: 'Auto', label: 'Detection Mode', icon: <AutoAwesome />, color: 'warning' },
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: 6,
                bgcolor: `${stat.color}.light`,
                color: `${stat.color}.contrastText`,
                transition: 'transform 0.3s',
                '&:hover': { transform: 'translateY(-8px)' },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 5 }}>
                <Box sx={{ mb: 2 }}>
                  {React.cloneElement(stat.icon, { sx: { fontSize: 60, opacity: 0.9 } })}
                </Box>
                <Typography variant="h3" fontWeight="bold">{stat.value}</Typography>
                <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={6} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'primary.main',
            '& .MuiTab-root': { color: 'white', opacity: 0.8, fontWeight: 'medium', py: 2.5 },
            '& .Mui-selected': { color: 'white', opacity: 1, fontWeight: 'bold' },
          }}
        >
          {!isEmployee && <Tab label="Overview" />}
          <Tab label="Face Enrollment" />
          <Tab label="Detection Settings" />
          {!isEmployee && <Tab label="Security & Privacy" />}
        </Tabs>

        <Box sx={{ p: { xs: 4, md: 6 } }}>
          {/* OVERVIEW TAB */}
          {!isEmployee && tabValue === 0 && (
            <>
              <Grid container spacing={6}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 5, borderRadius: 4, height: '100%', bgcolor: 'grey.50' }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Info sx={{ color: 'info.main' }} /> Auto-Detection System
                    </Typography>
                    <Alert severity="success" sx={{ borderRadius: 3, p: 3 }}>
                      <Typography variant="body1" fontWeight="medium">
                        Smart face detection and auto-enrollment active
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        The system will automatically detect faces, verify conditions, capture, and enroll.
                      </Typography>
                    </Alert>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 5, borderRadius: 4 }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>
                      Auto-Detection Process
                    </Typography>
                    <Timeline>
                      {[
                        { title: 'Face Detection', desc: 'Real-time face tracking', color: 'primary' },
                        { title: 'Alignment Check', desc: 'Verifies position and size', color: 'success' },
                        { title: 'Quality Verification', desc: 'Confidence threshold check', color: 'warning' },
                        { title: 'Auto-Capture & Send', desc: 'Captures and sends to backend', color: 'info' },
                      ].map((item, i) => (
                        <TimelineItem key={i}>
                          <TimelineSeparator>
                            <TimelineDot color={item.color} />
                            {i < 3 && <TimelineConnector />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="body1" fontWeight="medium">{item.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  </Paper>
                </Grid>
              </Grid>

              {/* Search & Filter */}
              <Box sx={{ mt: 6, mb: 4 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    fullWidth
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                      endAdornment: search && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearch('')}><Clear /></IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                      <MenuItem value="ALL">All</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    startIcon={profilesLoading ? <CircularProgress size={20} /> : <Refresh />}
                    onClick={loadProfiles}
                    disabled={profilesLoading}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Box>

              {/* Profiles Table */}
              <Card>
                <CardHeader title={<Typography variant="h6">Enrolled Profiles ({filteredProfiles.length})</Typography>} />
                <Divider />
                <CardContent>
                  {profilesLoading ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
                  ) : profilesError ? (
                    <Alert severity="error">{profilesError}</Alert>
                  ) : filteredProfiles.length === 0 ? (
                    <Alert severity="info">
                      {search || statusFilter !== 'ALL'
                        ? 'No matching profiles.'
                        : 'No biometric profiles enrolled yet.'}
                    </Alert>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Employee</strong></TableCell>
                          <TableCell><strong>Type</strong></TableCell>
                          <TableCell><strong>Created</strong></TableCell>
                          <TableCell><strong>Last Used</strong></TableCell>
                          <TableCell align="center"><strong>Active</strong></TableCell>
                          <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProfiles.map((p) => (
                          <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}>
                            <TableCell onClick={() => openDetails(p)}>
                              {p.employee_name || p.employee || 'Unknown'}
                            </TableCell>
                            <TableCell onClick={() => openDetails(p)}>{p.biometric_type}</TableCell>
                            <TableCell onClick={() => openDetails(p)}>
                              {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell onClick={() => openDetails(p)}>
                              {p.last_used ? new Date(p.last_used).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell align="center">
                              {isAdmin || isHR ? (
                                <Switch
                                  checked={!!p.is_active}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleProfile(p);
                                  }}
                                  color="success"
                                />
                              ) : (
                                <Chip
                                  label={p.is_active ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={p.is_active ? 'success' : 'default'}
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); openDetails(p); }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                              {(isAdmin || isHR) && (
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ENROLLMENT TAB */}
          {(isEmployee ? tabValue === 0 : tabValue === 1) && (
            <Grid container spacing={6}>
              <Grid item xs={12} lg={7}>
                <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
                  <CardHeader
                    title={<Typography variant="h5" fontWeight="bold">Face Enrollment</Typography>}
                    subheader="Click 'Capture Face' to start auto-detection and enrollment"
                  />
                  <Divider />
                  <CardContent sx={{ pt: 4 }}>
                    <Stack spacing={5}>
                      <Paper
                        sx={{
                          height: 400,
                          borderRadius: 4,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px dashed',
                          borderColor: capturedImage ? 'success.main' : 'grey.400',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {loadingProfile ? (
                          <Box sx={{ textAlign: 'center', p: 8 }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 3 }}>Checking your account status...</Typography>
                          </Box>
                        ) : imagePreview ? (
                          <Box sx={{ textAlign: 'center', p: 4 }}>
                            <img
                              src={imagePreview}
                              alt="captured face"
                              style={{
                                width: '100%',
                                maxWidth: 400,
                                height: 'auto',
                                borderRadius: 8,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                              }}
                            />
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  setCapturedImage(null);
                                  if (imagePreview) {
                                    URL.revokeObjectURL(imagePreview);
                                    setImagePreview(null);
                                  }
                                }}
                              >
                                Retake
                              </Button>
                              <Button
                                variant="contained"
                                onClick={handleCaptureDialogOpen}
                                startIcon={<CameraAlt />}
                              >
                                Capture New
                              </Button>
                            </Stack>
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', p: 4 }}>
                            <CameraAlt sx={{ fontSize: 100, color: 'grey.600', mb: 3 }} />
                            <Typography variant="h5" fontWeight="medium" color="text.secondary">
                              Face Enrollment - Click 'Capture Face' to open camera
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
                              {faceDetectionEnabled
                                ? 'System auto-detects and guides you. Position your face in the center.'
                                : 'Make sure your face is centered and well-lit.'}
                            </Typography>
                            <Button
                              variant="contained"
                              sx={{ px: 6, py: 1.5 }}
                              onClick={handleCaptureDialogOpen}
                              disabled={loadingProfile}
                              startIcon={<CameraAlt />}
                            >
                              Capture Face
                            </Button>
                            {faceDetectionEnabled && (
                              <Typography variant="caption" color="success.main" sx={{ mt: 2, display: 'block' }}>
                                Auto-detection active. Alignment triggers auto-capture
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>

                      {/* Detection Status Summary */}
                      {capturedImage && lastFaceData && (
                        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                            Detection Results
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <CheckCircle color="success" />
                                <Typography variant="body2">
                                  Confidence: {lastFaceData.confidence}%
                                </Typography>
                              </Stack>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                {lastFaceData.isCentered ? (
                                  <CheckCircle color="success" />
                                ) : (
                                  <ErrorIcon color="warning" />
                                )}
                                <Typography variant="body2">
                                  Centered: {lastFaceData.isCentered ? 'Yes' : 'No'}
                                </Typography>
                              </Stack>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                {lastFaceData.isSizeOptimal ? (
                                  <CheckCircle color="success" />
                                ) : (
                                  <ErrorIcon color="warning" />
                                )}
                                <Typography variant="body2">
                                  Size: {lastFaceData.isSizeOptimal ? 'Optimal' : 'Not optimal'}
                                </Typography>
                              </Stack>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AutoAwesome color="primary" />
                                <Typography variant="body2">
                                  Mode: {autoCaptureEnabled ? 'Auto' : 'Manual'}
                                </Typography>
                              </Stack>
                            </Grid>
                            {lastFaceData.hasEyes && (
                              <Grid item xs={6} md={3}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Face color="info" />
                                  <Typography variant="body2">
                                    Eyes: Detected
                                  </Typography>
                                </Stack>
                              </Grid>
                            )}
                            {eyeBlinkDetected && (
                              <Grid item xs={6} md={3}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Visibility color="warning" />
                                  <Typography variant="body2">
                                    Blink: Detected! (real detection)
                                  </Typography>
                                </Stack>
                              </Grid>
                            )}
                          </Grid>
                        </Paper>
                      )}

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        {loadingProfile ? (
                          <CircularProgress size={28} />
                        ) : hasEmployeeProfile ? (
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Employee ID: {employeeId} |
                              Auto-detection: {faceDetectionEnabled ? 'ON' : 'OFF'} |
                              Auto-send: {autoSendEnabled ? 'ON' : 'OFF'} |
                              Blink detection: {blinkDetectionEnabled ? 'ON (real)' : 'OFF'}
                            </Typography>
                            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                              <Button
                                variant="contained"
                                size="large"
                                startIcon={<Fingerprint />}
                                sx={{ px: 6, py: 1.8, borderRadius: 3 }}
                                onClick={handleManualEnroll}
                                disabled={submitting || !capturedImage}
                              >
                                {submitting ? 'Submitting…' : 'Enroll Face'}
                              </Button>

                              <Button
                                variant="outlined"
                                size="large"
                                startIcon={<AutoAwesome />}
                                sx={{ px: 6, py: 1.8, borderRadius: 3 }}
                                onClick={handleCaptureDialogOpen}
                              >
                                {capturedImage ? 'Capture Again' : 'Start Auto-Detection'}
                              </Button>

                              {autoSendEnabled && capturedImage && (
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="large"
                                  startIcon={<CloudUpload />}
                                  sx={{ px: 6, py: 1.8, borderRadius: 3 }}
                                  onClick={() => autoSendImage(capturedImage)}
                                  disabled={autoSending}
                                >
                                  {autoSending ? 'Auto-Sending…' : 'Auto-Send Now'}
                                </Button>
                              )}
                            </Stack>
                          </>
                        ) : (
                          <Alert
                            severity="info"
                            icon={<Info />}
                            sx={{ borderRadius: 3, maxWidth: 700, mx: 'auto', p: 3 }}
                          >
                            <Typography variant="h6" sx={{ mb: 1 }}>
                              Employee Profile Required
                            </Typography>
                            <Typography variant="body1">
                              Your account needs to be linked to an Employee profile for face enrollment.
                              Please contact HR or your system administrator.
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={5}>
                <Card sx={{ borderRadius: 4, boxShadow: 6, height: '100%' }}>
                  <CardHeader title={<Typography variant="h5" fontWeight="bold">How It Works</Typography>} />
                  <Divider />
                  <CardContent sx={{ pt: 4 }}>
                    <Stack spacing={4}>
                      {[
                        { text: 'Click "Capture Face" to open camera', icon: <CameraAlt /> },
                        { text: 'Position your face in the center', icon: <FaceRetouchingNatural /> },
                        { text: 'System auto-detects and guides you', icon: <AutoAwesome /> },
                        { text: 'Perfect alignment triggers auto-capture', icon: <CheckCircle /> },
                        { text: 'Image is automatically sent to backend', icon: <CloudUpload />, note: 'When auto-send is enabled' },
                        { text: 'Face template created for recognition', icon: <Fingerprint /> },
                      ].map((step, i) => (
                        <Stack direction="row" spacing={3} key={i} alignItems="flex-start">
                          <Avatar sx={{ bgcolor: i < 3 ? 'primary.main' : 'success.main', width: 48, height: 48, fontWeight: 'bold' }}>
                            {i + 1}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight={i < 3 ? 'bold' : 'normal'}>
                              {step.text}
                            </Typography>
                            {step.note && (
                              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                                {step.note}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ color: 'primary.main' }}>{step.icon}</Box>
                        </Stack>
                      ))}
                    </Stack>

                    <Alert severity="info" sx={{ mt: 4, borderRadius: 2 }}>
                      <Typography variant="body2">
                        <strong>Tips for Best Detection:</strong><br />
                        1. Ensure face is clearly visible<br />
                        2. Center face in the circle<br />
                        3. Maintain good lighting<br />
                        4. Look directly at camera<br />
                        5. Keep eyes open and visible
                      </Typography>
                    </Alert>

                    {eyeBlinkDetected && (
                      <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                        <Typography variant="body2">
                          <strong>Blink Detected!</strong> Real eye blink detected successfully.
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* DETECTION SETTINGS TAB */}
          {tabValue === (isEmployee ? 1 : 2) && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 4, p: 4 }}>
                  <CardHeader
                    title={
                      <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Sensors /> Detection Settings
                      </Typography>
                    }
                  />
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={4}>
                    <FormControlLabel
                      control={<Switch checked={faceDetectionEnabled} onChange={(e) => setFaceDetectionEnabled(e.target.checked)} color="primary" />}
                      label={
                        <Box>
                          <Typography>Face Detection</Typography>
                          <Typography variant="caption" color="text.secondary">Enable real-time face detection and tracking</Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={autoCaptureEnabled} onChange={(e) => setAutoCaptureEnabled(e.target.checked)} color="primary" />}
                      label={
                        <Box>
                          <Typography>Auto-Capture</Typography>
                          <Typography variant="caption" color="text.secondary">Automatically capture when face is perfectly aligned</Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={autoSendEnabled} onChange={(e) => setAutoSendEnabled(e.target.checked)} color="primary" />}
                      label={
                        <Box>
                          <Typography>Auto-Send to Backend</Typography>
                          <Typography variant="caption" color="text.secondary">Automatically send captured image to server</Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={blinkDetectionEnabled} onChange={(e) => setBlinkDetectionEnabled(e.target.checked)} color="primary" />}
                      label={
                        <Box>
                          <Typography>Blink Detection (Real)</Typography>
                          <Typography variant="caption" color="text.secondary">Detects real eye blinks using Eye Aspect Ratio</Typography>
                        </Box>
                      }
                    />

                    <Box>
                      <Typography gutterBottom>Detection Quality Threshold</Typography>
                      <Slider
                        value={qualityThreshold}
                        onChange={(_, value) => setQualityThreshold(value)}
                        step={0.1}
                        marks
                        min={0.1}
                        max={1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                      />
                      <Typography variant="caption" color="text.secondary">Minimum confidence required for face detection</Typography>
                    </Box>

                    <Box>
                      <Typography gutterBottom>Auto-Capture Delay</Typography>
                      <Slider
                        value={captureDelay}
                        onChange={(_, value) => setCaptureDelay(value)}
                        step={1}
                        marks={[{ value: 1, label: '1s' }, { value: 2, label: '2s' }, { value: 3, label: '3s' }, { value: 4, label: '4s' }, { value: 5, label: '5s' }]}
                        min={1}
                        max={5}
                        valueLabelDisplay="auto"
                      />
                      <Typography variant="caption" color="text.secondary">Delay before auto-capture after perfect alignment</Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 4, p: 4 }}>
                  <CardHeader
                    title={
                      <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Settings /> System Status
                      </Typography>
                    }
                  />
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={3}>
                    <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Current Configuration</Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2"><strong>Face Detection:</strong> {faceDetectionEnabled ? '✅ Active' : '❌ Inactive'}</Typography>
                        <Typography variant="body2"><strong>Auto-Capture:</strong> {autoCaptureEnabled ? '✅ Active' : '❌ Inactive'}</Typography>
                        <Typography variant="body2"><strong>Auto-Send:</strong> {autoSendEnabled ? '✅ Active' : '❌ Inactive'}</Typography>
                        <Typography variant="body2"><strong>Blink Detection:</strong> {blinkDetectionEnabled ? '✅ Real EAR' : '❌ Off'}</Typography>
                        <Typography variant="body2"><strong>Quality Threshold:</strong> {Math.round(qualityThreshold * 100)}%</Typography>
                        <Typography variant="body2"><strong>Capture Delay:</strong> {captureDelay}s</Typography>
                        <Typography variant="body2"><strong>Employee Profile:</strong> {hasEmployeeProfile ? '✅ Linked' : '❌ Not linked'}</Typography>
                        <Typography variant="body2"><strong>Camera Access:</strong> {captureDialogOpen ? '✅ Active' : '❌ Not active'}</Typography>
                        <Typography variant="body2"><strong>Face API Status:</strong> {faceDetector.initialized ? '✅ Ready' : '❌ Not initialized'}</Typography>
                      </Stack>
                    </Paper>

                    <Alert severity="success">
                      <Typography variant="body2">
                        <strong>Auto-System Status:</strong> When enabled, the system will automatically: 1. Detect face • 2. Verify alignment • 3. Capture image • 4. Send to backend
                      </Typography>
                    </Alert>

                    <Button variant="contained" fullWidth onClick={handleCaptureDialogOpen} startIcon={<CameraAlt />}>
                      Test Camera & Detection
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        setFaceDetectionEnabled(true);
                        setAutoCaptureEnabled(true);
                        setAutoSendEnabled(true);
                        setBlinkDetectionEnabled(true);
                        setQualityThreshold(0.7);
                        setCaptureDelay(3);
                        onNotify?.('Settings reset to default values', 'info');
                      }}
                    >
                      Reset to Default Settings
                    </Button>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* SECURITY & PRIVACY TAB */}
          {!isEmployee && tabValue === 3 && (
            <Grid container spacing={6}>
              <Grid item xs={12}>
                <Paper
                  elevation={8}
                  sx={{
                    borderRadius: 6,
                    p: { xs: 4, md: 6 },
                    bgcolor: '#e8f5e9',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
                    <Shield sx={{ fontSize: 60, color: 'success.main' }} />
                    <Typography variant="h4" fontWeight="bold" color="success.dark">
                      Security & Privacy
                    </Typography>
                  </Stack>
                  <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem' }}>
                    Our auto-detection system ensures security and privacy:
                  </Typography>
                  <Stack spacing={3}>
                    {[
                      'Face detection runs locally in your browser',
                      'Images are encrypted during transmission',
                      'Only face templates are stored - no raw images',
                      'Auto-processed images are immediately deleted',
                      'GDPR and biometric data protection compliant',
                      'Secure HTTPS transmission to backend',
                      'Real eye blink detection prevents spoofing',
                      'All data processing is transparent and auditable',
                    ].map((point, i) => (
                      <Stack direction="row" alignItems="flex-start" spacing={2} key={i}>
                        <CheckCircleOutline sx={{ fontSize: 28, color: 'success.main', mt: 0.3 }} />
                        <Typography variant="h6" sx={{ color: 'text.primary' }}>{point}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Face Capture Dialog */}
      <FaceCaptureDialog
        open={captureDialogOpen}
        onClose={handleCaptureDialogClose}
        onCaptured={handleCaptured}
        enableAutoDetection={faceDetectionEnabled}
        faceDetectionEnabled={faceDetectionEnabled}
        detectionStatus={detectionStatus}
        detectionProgress={detectionProgress}
        autoCaptureCountdown={autoCaptureCountdown}
        videoRef={videoRef}
      />

      {/* Auto-Capture Success Dialog */}
      <Dialog open={showAutoCaptureDialog} onClose={() => setShowAutoCaptureDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AutoAwesome color="primary" />
            <Typography variant="h6">Auto-Capture Successful!</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="success" icon={<TaskAlt />}>
              <Typography variant="body1">
                Perfect face detected and captured automatically!
              </Typography>
            </Alert>

            {capturedImageData?.url && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img
                  src={capturedImageData.url}
                  alt="Auto-captured"
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '2px solid #4caf50' }}
                />
              </Box>
            )}

            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary"><strong>Detection Details:</strong></Typography>
              {lastFaceData && (
                <Typography variant="body2">
                  Confidence: {lastFaceData.confidence}% | Centered: {lastFaceData.isCentered ? 'Yes' : 'No'} |
                  Size: {lastFaceData.isSizeOptimal ? 'Optimal' : 'Not optimal'} |
                  Eyes: {lastFaceData.hasEyes ? 'Detected' : 'Not detected'} |
                  Blink: {lastFaceData.isBlinking ? 'Yes' : 'No'}
                </Typography>
              )}
            </Paper>

            {autoSendEnabled ? (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={30} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">Auto-sending to backend for enrollment...</Typography>
              </Box>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  Auto-send is disabled. Enable it in settings or manually enroll the captured image.
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAutoCaptureDialog(false)} color="inherit">
            Cancel
          </Button>
          {!autoSendEnabled && capturedImageData && (
            <Button variant="contained" onClick={() => { autoSendToBackend(capturedImageData); setShowAutoCaptureDialog(false); }} startIcon={<CloudUpload />}>
              Send Manually
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Profile Details Modal */}
      <MUIModal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 450 },
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: 24,
            p: 4,
          }}
        >
          {selectedProfile && (
            <>
              <Stack alignItems="center" spacing={3} sx={{ mb: 3 }}>
                <Avatar sx={{ width: 100, height: 100, bgcolor: 'primary.main' }}>
                  <Fingerprint sx={{ fontSize: 60 }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold">
                  {selectedProfile.employee_name || selectedProfile.employee || 'Unknown'}
                </Typography>
                <Chip
                  label={selectedProfile.is_active ? 'ACTIVE' : 'INACTIVE'}
                  color={selectedProfile.is_active ? 'success' : 'default'}
                  size="large"
                />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography><strong>Type:</strong> {selectedProfile.biometric_type}</Typography>
              <Typography><strong>Enrolled:</strong> {new Date(selectedProfile.created_at).toLocaleString()}</Typography>
              <Typography>
                <strong>Last Used:</strong>{' '}
                {selectedProfile.last_used ? new Date(selectedProfile.last_used).toLocaleString() : 'Never'}
              </Typography>
              <Button variant="contained" fullWidth onClick={() => setDetailsOpen(false)} sx={{ mt: 4 }}>
                Close
              </Button>
            </>
          )}
        </Box>
      </MUIModal>
    </Box>
  );
};

export default Biometrics;