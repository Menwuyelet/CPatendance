// src/pages/Biometrics.jsx
import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/icons-material';
import { api } from '../services/api.service.js';

const Biometrics = ({ onNotify, role }) => {
  const isEmployee = role === 'Employee';
  const isAdmin = role === 'Admin';
  const isHR = role === 'HR';

  const [tabValue, setTabValue] = useState(0);
  const [employeeId, setEmployeeId] = useState('');
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load current user's employee profile
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const loadProfiles = async () => {
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
  };

  useEffect(() => {
    if (!isEmployee) {
      loadProfiles();
    }
  }, [isEmployee]);

  // Cleanup camera and preview URL
  useEffect(() => {
    return () => {
      stopCamera();
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Auto-play video when stream is set
  useEffect(() => {
    if (!cameraOpen || !cameraStream || !videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch(() => {});
  }, [cameraOpen, cameraStream]);

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

  const startCamera = async () => {
    try {
      stopCamera();
      setCameraReady(false);
      setCameraOpen(true);
      await new Promise((r) => setTimeout(r, 120));

      if (!videoRef.current) throw new Error('Video element not found');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setCameraStream(stream);
      videoRef.current.srcObject = stream;
      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          resolve();
        };
        setTimeout(resolve, 2500);
      });

      setCameraReady(true);
    } catch (err) {
      console.error('Camera start failed:', err);
      stopCamera();
      let msg = 'Cannot access camera.';
      if (err.name === 'NotAllowedError') {
        msg = 'Camera permission denied. Please allow access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Camera constraints not satisfied. Try another device.';
      }
      onNotify?.(msg, 'error');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setCameraOpen(false);
    setCameraReady(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      onNotify?.('Camera not fully ready yet. Wait 1–2 seconds after video starts.', 'warning');
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size < 2000) {
          onNotify?.('Captured image appears empty. Try again in better lighting.', 'warning');
          return;
        }
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        const url = URL.createObjectURL(blob);
        setImagePreview(url);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleEnrollClick = async () => {
    if (!hasEmployeeProfile) {
      onNotify?.(
        "Face enrollment is currently not available for your account.\n\n" +
        "This feature requires a linked Employee profile in the system.\n\n" +
        "Please contact your HR department or system administrator and ask them to:\n" +
        "• Create an Employee record for you, or\n" +
        "• Link your user account to an existing Employee record.\n\n" +
        "Once that's done, refresh this page and try again.",
        'info'
      );
      return;
    }

    if (!imageFile) {
      onNotify?.('Please capture a photo first.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('biometric_type', 'FACE');
      form.append('image', imageFile);

      await api.postForm('/biometrics/face/enroll/', form);
      onNotify?.('Face enrolled successfully!', 'success');

      if (!isEmployee) await loadProfiles();

      setImageFile(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    } catch (err) {
      let msg = err?.message || 'Enrollment failed. Please try again.';
      const lower = msg.toLowerCase();
      if (lower.includes('no face detected')) {
        msg = 'No face detected. Center your face, ensure good lighting, and try again.';
      } else if (lower.includes('image required')) {
        msg = 'Image upload failed. Please capture again.';
      }
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
      onNotify?.(
        newActive ? 'Profile activated.' : 'Profile deactivated.',
        'success'
      );
    } catch (err) {
      onNotify?.('Failed to update status.', 'error');
    }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm('Delete this profile permanently?')) return;
    try {
      await api.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      onNotify?.('Profile deleted.', 'info');
    } catch (err) {
      onNotify?.('Delete failed.', 'error');
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
              Biometric System
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Advanced facial recognition for secure, contactless attendance
            </Typography>
          </Box>
          <Chip
            label="Coming Soon"
            color="warning"
            icon={<Schedule />}
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
          { value: stats.securityLevel, label: 'Security Level', icon: <Security />, color: 'info' },
        ].map((stat, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
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
          <Tab label="Enrollment Process" />
          {!isEmployee && <Tab label="Security & Privacy" />}
        </Tabs>

        <Box sx={{ p: { xs: 4, md: 6 } }}>
          {/* OVERVIEW TAB */}
          {!isEmployee && tabValue === 0 && (
            <>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={3} sx={{ p: 5, borderRadius: 4, height: '100%', bgcolor: 'grey.50' }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Info sx={{ color: 'info.main' }} /> Current Status
                    </Typography>
                    <Alert severity="info" sx={{ borderRadius: 3, p: 3 }}>
                      <Typography variant="body1" fontWeight="medium">
                        Biometric system is under active development
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Facial recognition enrollment and verification coming soon.
                      </Typography>
                    </Alert>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={3} sx={{ p: 5, borderRadius: 4 }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>
                      Key Benefits
                    </Typography>
                    <Timeline>
                      {[
                        { title: 'Touchless & Hygienic', desc: 'No physical contact required', color: 'primary' },
                        { title: 'Lightning Fast', desc: 'Verification < 1 second', color: 'success' },
                        { title: 'Anti-Spoofing', desc: 'Resists photos, videos, masks', color: 'warning' },
                        { title: 'Privacy First', desc: 'Raw images deleted instantly', color: 'info' },
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
                              {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell onClick={() => openDetails(p)}>
                              {p.last_used ? new Date(p.last_used).toLocaleString() : '-'}
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
              <Grid size={{ xs: 12, lg: 7 }}>
                <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
                  <CardHeader
                    title={<Typography variant="h5" fontWeight="bold">Enroll Your Face</Typography>}
                    subheader="Set up touchless attendance"
                  />
                  <Divider />
                  <CardContent sx={{ pt: 4 }}>
                    <Stack spacing={5}>
                      <Paper
                        sx={{
                          height: 460,
                          borderRadius: 4,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px dashed',
                          borderColor: cameraReady ? 'success.main' : 'grey.400',
                        }}
                      >
                        {loadingProfile ? (
                          <Box sx={{ textAlign: 'center', p: 8 }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 3 }}>Checking your account status...</Typography>
                          </Box>
                        ) : cameraOpen ? (
                          <Box sx={{ width: '100%', textAlign: 'center', p: 2 }}>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              onLoadedMetadata={() => setCameraReady(true)}
                              onCanPlayThrough={() => setCameraReady(true)}
                              style={{
                                width: '100%',
                                maxWidth: 540,
                                borderRadius: 12,
                                transform: 'scaleX(-1)',
                                background: '#000',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 16,
                                border: cameraReady ? '3px solid #4caf50' : '3px solid #ff9800',
                                borderRadius: 12,
                                pointerEvents: 'none',
                                boxShadow: cameraReady ? '0 0 20px #4caf50aa' : 'none',
                              }}
                            />
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                              <Button
                                variant="contained"
                                color="success"
                                onClick={captureFrame}
                                disabled={!cameraReady || submitting}
                                startIcon={<CameraAlt />}
                              >
                                Capture
                              </Button>
                              <Button variant="outlined" color="error" onClick={stopCamera}>
                                Cancel
                              </Button>
                            </Stack>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', p: 4 }}>
                            <CameraAlt sx={{ fontSize: 100, color: 'grey.600', mb: 3 }} />
                            <Typography variant="h5" fontWeight="medium" color="text.secondary">
                              Camera Preview
                            </Typography>
                            <Button
                              variant="contained"
                              sx={{ mt: 4 }}
                              onClick={startCamera}
                              disabled={loadingProfile}
                            >
                              Open Camera
                            </Button>
                          </Box>
                        )}

                        {imagePreview && (
                          <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Captured Preview
                            </Typography>
                            <img
                              src={imagePreview}
                              alt="capture"
                              style={{ width: 220, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                            />
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setImageFile(null);
                                  URL.revokeObjectURL(imagePreview);
                                  setImagePreview(null);
                                }}
                              >
                                Retake
                              </Button>
                            </Stack>
                          </Box>
                        )}
                      </Paper>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        {loadingProfile ? (
                          <CircularProgress size={28} />
                        ) : hasEmployeeProfile ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Employee profile detected (ID: {employeeId})
                          </Typography>
                        ) : (
                          <Alert
                            severity="info"
                            icon={<Info />}
                            sx={{
                              mb: 4,
                              borderRadius: 3,
                              maxWidth: 700,
                              mx: 'auto',
                              p: 3,
                              '& .MuiAlert-message': { width: '100%' }
                            }}
                          >
                            <Typography variant="h6" sx={{ mb: 1 }}>
                              Face Enrollment Not Available Yet
                            </Typography>
                            <Typography variant="body1">
                              Your account needs to be linked to an Employee profile in the system.<br /><br />
                              Please contact HR or your system administrator and ask them to:<br />
                              • Create an Employee record for you, or<br />
                              • Link your user account to an existing Employee record.<br /><br />
                              Once that's done, refresh this page and try enrolling again.
                            </Typography>
                          </Alert>
                        )}

                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<Fingerprint />}
                          sx={{ px: 6, py: 1.8, borderRadius: 3 }}
                          onClick={handleEnrollClick}
                          disabled={submitting || !imageFile || !hasEmployeeProfile || loadingProfile}
                        >
                          {submitting ? 'Submitting…' : 'Enroll My Face'}
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }}>
                <Card sx={{ borderRadius: 4, boxShadow: 6, height: '100%' }}>
                  <CardHeader title={<Typography variant="h5" fontWeight="bold">Steps</Typography>} />
                  <Divider />
                  <CardContent sx={{ pt: 4 }}>
                    <Stack spacing={4}>
                      {[
                        'Position face clearly in frame',
                        'Ensure good lighting (no strong backlighting)',
                        'Capture photo when ready',
                        'System creates secure template',
                        'Ready for touchless clock-in',
                      ].map((step, i) => (
                        <Stack direction="row" spacing={3} key={i} alignItems="center">
                          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontWeight: 'bold' }}>
                            {i + 1}
                          </Avatar>
                          <Typography variant="body1">{step}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* SECURITY & PRIVACY TAB */}
          {!isEmployee && tabValue === 2 && (
            <Grid container spacing={6}>
              <Grid size={{ xs: 12 }}>
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
                      Privacy First
                    </Typography>
                  </Stack>
                  <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem' }}>
                    We protect your biometric data with strict standards:
                  </Typography>
                  <Stack spacing={3}>
                    {[
                      'Raw images are NEVER stored',
                      'Only irreversible mathematical templates are saved',
                      'Templates encrypted at rest and in transit',
                      'Data never leaves your secure environment',
                      'GDPR-compliant design',
                    ].map((point, i) => (
                      <Stack direction="row" alignItems="flex-start" spacing={2} key={i}>
                        <CheckCircleOutline sx={{ fontSize: 28, color: 'success.main', mt: 0.3 }} />
                        <Typography variant="h6" sx={{ color: 'text.primary' }}>
                          {point}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

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