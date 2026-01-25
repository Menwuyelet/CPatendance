// src/pages/Biometrics.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Face,
  FaceRetouchingNatural,
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api } from '../services/api.service.js';
import WebcamCapture from '../components/WebcamCapture.jsx';
import CheckIn from '../components/CheckIn.jsx';

const Biometrics = ({ onNotify, role }) => {
  const isEmployee = role === 'Employee';
  const isAdmin = role === 'Admin';
  const isHR = role === 'HR';

  const [tabValue, setTabValue] = useState(isEmployee ? 0 : 0);
  const [submitting, setSubmitting] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState('enroll'); // 'enroll' | 'attendance'

  // Admin/HR states
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const camModalRef = useRef(null);

  // ────────────────────────────────────────────────
  // Load profiles (Admin/HR only)
  // ────────────────────────────────────────────────
  const loadProfiles = async () => {
    if (isEmployee) return;
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const res = await api.getAllProfiles();
      const list = Array.isArray(res) ? res : res?.results || [];
      setProfiles(list);
    } catch (err) {
      console.error('Failed to load profiles:', err);
      setProfiles([]);
      setProfilesError('Unable to load biometric profiles.');
      onNotify?.('Failed to load profiles.', 'error');
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployee) loadProfiles();
  }, [isEmployee]);

  // ────────────────────────────────────────────────
  // Filter & Stats
  // ────────────────────────────────────────────────
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = !search || (p.employee_name || p.employee || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && p.is_active) ||
      (statusFilter === 'Inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalEnrolled: profiles.length,
    activeToday: profiles.filter((p) => p.is_active).length,
    totalRevoked: profiles.length - profiles.filter((p) => p.is_active).length,
    securityLevel: profiles.filter((p) => p.is_active).length > 0 ? 'High' : 'Medium',
  };

  // ────────────────────────────────────────────────
  // Camera Modal Controls
  // ────────────────────────────────────────────────
  const openCameraModal = (action = 'enroll') => {
    setCameraAction(action);
    setCameraModalOpen(true);
  };

  const closeCameraModal = () => setCameraModalOpen(false);

  const handleModalCapture = async (blob) => {
    if (!blob) return;
    closeCameraModal();
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append('image', blob, 'capture.jpg');

      if (cameraAction === 'enroll') {
        form.append('biometric_type', 'FACE');
        await api.postForm('/biometrics/face/enroll/', form);
        onNotify?.('Face enrolled successfully!', 'success');

        // Auto check-in after enrollment (optional)
        try {
          const checkinForm = new FormData();
          checkinForm.append('image', blob, 'checkin.jpg');
          const res = await api.postForm('/attendance/attendance-check-in/', checkinForm);
          onNotify?.(res?.detail || 'Auto check-in successful!', 'success');
        } catch (err) {
          onNotify?.('Enrollment OK, but auto check-in failed.', 'warning');
        }

        if (!isEmployee) await loadProfiles();
      } else if (cameraAction === 'attendance') {
        const res = await api.postForm('/attendance/attendance-check-in/', form);
        onNotify?.(res?.detail || 'Checked in successfully!', 'success');
      }
    } catch (err) {
      onNotify?.(err.message || 'Operation failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-start camera + 5-second countdown
  useEffect(() => {
    if (cameraModalOpen) {
      setTimeout(() => {
        try {
          camModalRef.current?.startCamera?.();
          // Start 5-second countdown for BOTH enroll and check-in
          camModalRef.current?.startCountdown?.(5, cameraAction);
        } catch (e) {
          console.warn('Failed to start camera/countdown', e);
        }
      }, 400);
    } else {
      try {
        camModalRef.current?.stopCamera?.();
      } catch (e) {}
    }
  }, [cameraModalOpen, cameraAction]);

  // ────────────────────────────────────────────────
  // Admin/HR Profile Actions
  // ────────────────────────────────────────────────
  const handleToggleProfile = async (profile) => {
    if (!(isAdmin || isHR)) return;
    const newActive = !profile.is_active;
    try {
      const updated = await api.patch(`/biometrics/profiles/${profile.id}/`, {
        is_active: newActive,
      });
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      onNotify?.(newActive ? 'Profile activated.' : 'Profile deactivated.', 'success');
    } catch (err) {
      onNotify?.('Failed to update profile status.', 'error');
    }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm('Delete this biometric profile? This cannot be undone.')) return;
    try {
      await api.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      onNotify?.('Profile deleted.', 'info');
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
      <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 6, flexWrap: 'wrap' }}>
        <Fingerprint sx={{ fontSize: 60, color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" fontWeight="bold">
            Biometric Attendance
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Secure, contactless facial recognition system
          </Typography>
        </Box>
        <Chip label="Face Recognition" color="primary" icon={<CameraAlt />} size="medium" sx={{ fontWeight: 'bold' }} />
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {[
          { value: stats.totalEnrolled, label: 'Total Enrolled', icon: <HowToReg />, color: 'primary' },
          { value: stats.activeToday, label: 'Active Profiles', icon: <CheckCircleOutline />, color: 'success' },
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
                <Box sx={{ mb: 2 }}>{React.cloneElement(stat.icon, { sx: { fontSize: 60, opacity: 0.9 } })}</Box>
                <Typography variant="h3" fontWeight="bold">{stat.value}</Typography>
                <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Tabs */}
      <Paper elevation={6} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'primary.main',
            '& .MuiTab-root': { color: 'white', py: 2.5, fontWeight: 'medium' },
            '& .Mui-selected': { color: 'white', fontWeight: 'bold' },
          }}
        >
          {!isEmployee && <Tab label="Overview" />}
          <Tab label="Enroll & Check-In" />
          {!isEmployee && <Tab label="Profiles" />}
          {!isEmployee && <Tab label="Security & Privacy" />}
        </Tabs>

        <Box sx={{ p: { xs: 4, md: 6 } }}>
          {/* TAB: Overview (Admin/HR) */}
          {!isEmployee && tabValue === 0 && (
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={3} sx={{ p: 5, borderRadius: 4, height: '100%', bgcolor: 'grey.50' }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Info sx={{ color: 'info.main' }} /> System Status
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
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>Key Benefits</Typography>
                  <Timeline>
                    {[
                      { title: 'Touchless & Hygienic', desc: 'No contact needed', color: 'primary' },
                      { title: 'Very Fast', desc: 'Verification < 1 second', color: 'success' },
                      { title: 'Anti-Spoofing', desc: 'Protects against photos/videos', color: 'warning' },
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
          )}

          {/* TAB: Enroll & Check-In (Main tab for employees) */}
          {(isEmployee ? tabValue === 0 : tabValue === 1) && (
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
                  <CardHeader
                    title={<Typography variant="h5" fontWeight="bold">Enroll or Check-In</Typography>}
                    subheader="Use your face for secure, touchless attendance"
                    avatar={<Face color="primary" />}
                  />
                  <Divider />
                  <CardContent sx={{ p: { xs: 4, md: 6 } }}>
                    <Stack spacing={5} alignItems="center">
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={4}
                        sx={{ width: '100%', justifyContent: 'center' }}
                      >
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          startIcon={<FaceRetouchingNatural />}
                          sx={{ py: 2, px: 6, fontSize: '1.2rem', borderRadius: 3 }}
                          onClick={() => openCameraModal('enroll')}
                          disabled={submitting}
                        >
                          {submitting ? 'Processing...' : 'Enroll My Face'}
                        </Button>

                        <Button
                          variant="outlined"
                          color="success"
                          size="large"
                          startIcon={<CheckCircleOutline />}
                          sx={{ py: 2, px: 6, fontSize: '1.2rem', borderRadius: 3 }}
                          onClick={() => openCameraModal('attendance')}
                          disabled={submitting}
                        >
                          {submitting ? 'Processing...' : 'Quick Check-In'}
                        </Button>
                      </Stack>

                      <Paper elevation={2} sx={{ p: 4, borderRadius: 3, bgcolor: 'grey.50', width: '100%', textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary">
                          A 5-second countdown will start → make sure your face is clearly visible!
                        </Typography>
                      </Paper>

                      <CheckIn onNotify={onNotify} onOpenCamera={openCameraModal} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Steps & Info */}
              <Grid size={{ xs: 12, lg: 5 }}>
                <Stack spacing={4}>
                  <Card sx={{ borderRadius: 4, boxShadow: 4 }}>
                    <CardHeader title="How It Works" titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }} />
                    <Divider />
                    <CardContent>
                      <Stack spacing={2.5}>
                        {[
                          'Position your face clearly in the frame',
                          'Wait for the 5-second countdown',
                          'System detects your face automatically',
                          'Encrypted template is created (no photo saved)',
                          'Ready for fast touchless check-in!',
                        ].map((step, i) => (
                          <Stack key={i} direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>
                              {i + 1}
                            </Avatar>
                            <Typography variant="body1">{step}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>

                  <Alert severity="info" icon={<Face />} sx={{ borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Face Detection
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      The system will automatically detect your face during the 5-second countdown. 
                      Make sure your face is well-lit and centered.
                    </Typography>
                  </Alert>
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* TAB: Profiles (Admin/HR) */}
          {!isEmployee && tabValue === 2 && (
            <>
              <Box sx={{ mb: 5 }}>
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

              <Card>
                <CardHeader title={<Typography variant="h6">Enrolled Profiles ({filteredProfiles.length})</Typography>} />
                <Divider />
                <CardContent>
                  {profilesLoading ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
                  ) : profilesError ? (
                    <Alert severity="error">{profilesError}</Alert>
                  ) : filteredProfiles.length === 0 ? (
                    <Alert severity="info">
                      {search || statusFilter !== 'ALL' ? 'No profiles match your search/filter.' : 'No biometric profiles enrolled yet.'}
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
                            <TableCell onClick={() => openDetails(p)}>{p.employee_name || p.employee || 'Unknown'}</TableCell>
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
                                  onChange={(e) => { e.stopPropagation(); handleToggleProfile(p); }}
                                  color="success"
                                />
                              ) : (
                                <Chip label={p.is_active ? 'Active' : 'Inactive'} size="small" color={p.is_active ? 'success' : 'default'} />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); openDetails(p); }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                              {(isAdmin || isHR) && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}>
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

          {/* TAB: Security & Privacy */}
          {!isEmployee && tabValue === 3 && (
            <Paper
              elevation={8}
              sx={{
                borderRadius: 6,
                p: { xs: 5, md: 7 },
                bgcolor: '#e8f5e9',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 5 }}>
                <Shield sx={{ fontSize: 70, color: 'success.main' }} />
                <Typography variant="h4" fontWeight="bold" color="success.dark">
                  Your Privacy Is Our Priority
                </Typography>
              </Stack>
              <Typography variant="body1" sx={{ mb: 5, fontSize: '1.15rem', color: 'text.secondary' }}>
                We follow strict data protection standards:
              </Typography>
              <Stack spacing={3}>
                {[
                  'Raw face images are NEVER stored',
                  'Only irreversible mathematical templates are saved',
                  'All data is encrypted at rest and in transit',
                  'No biometric data ever leaves your secure environment',
                  'Fully compliant with GDPR and global privacy best practices',
                ].map((point, i) => (
                  <Stack key={i} direction="row" alignItems="flex-start" spacing={2}>
                    <CheckCircleOutline sx={{ fontSize: 32, color: 'success.main', mt: 0.3 }} />
                    <Typography variant="h6" color="text.primary">{point}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
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
            width: { xs: '90%', sm: 480 },
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: 24,
            p: 5,
          }}
        >
          {selectedProfile && (
            <>
              <Stack alignItems="center" spacing={3} sx={{ mb: 4 }}>
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
              <Divider sx={{ my: 3 }} />
              <Stack spacing={2}>
                <Typography><strong>Type:</strong> {selectedProfile.biometric_type}</Typography>
                <Typography><strong>Enrolled:</strong> {new Date(selectedProfile.created_at).toLocaleString()}</Typography>
                <Typography><strong>Last Used:</strong> {selectedProfile.last_used ? new Date(selectedProfile.last_used).toLocaleString() : 'Never'}</Typography>
              </Stack>
              <Button variant="contained" fullWidth onClick={() => setDetailsOpen(false)} sx={{ mt: 5, py: 1.5 }}>
                Close
              </Button>
            </>
          )}
        </Box>
      </MUIModal>

      {/* SHARED CAMERA MODAL with 5-second countdown + face detection feedback */}
      <MUIModal
        open={cameraModalOpen}
        onClose={closeCameraModal}
        closeAfterTransition
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95%', sm: 820 },
            maxHeight: '95vh',
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
            overflow: 'auto',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              {cameraAction === 'enroll' ? 'Enroll Your Face' : 'Check-In Now'}
            </Typography>
            <Chip
              label={cameraAction === 'enroll' ? 'ENROLLMENT' : 'CHECK-IN'}
              color={cameraAction === 'enroll' ? 'primary' : 'success'}
              size="small"
            />
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Face Detection Status */}
          <Alert
            severity="info"
            icon={<Face />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="body1" fontWeight="medium">
              5-second countdown will start automatically
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Make sure your face is well-lit and centered in the frame
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <WebcamCapture
              ref={camModalRef}
              autoSend={false}
              onCapture={handleModalCapture}
              countdownSeconds={5} // <-- 5 seconds countdown
              showFaceDetectionFeedback // <-- Enable face detection messages
              disabled={submitting}
            />
          </Box>

          {submitting && (
            <Box sx={{ textAlign: 'center', my: 3 }}>
              <CircularProgress size={36} />
              <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
                Processing your face...
              </Typography>
            </Box>
          )}

          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button variant="outlined" onClick={closeCameraModal} disabled={submitting}>
              Cancel
            </Button>
          </Stack>
        </Box>
      </MUIModal>
    </Box>
  );
};

export default Biometrics;