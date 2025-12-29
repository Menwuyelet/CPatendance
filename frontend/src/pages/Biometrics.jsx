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
  PersonAdd,
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
  const [tabValue, setTabValue] = useState(0);
  const [employeeId, setEmployeeId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // New: Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const isAdmin = role === 'Admin';
  const isHR = role === 'HR';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/accounts/users/me/');
        if (me?.employee?.id) setEmployeeId(String(me.employee.id));
        else if (me?.id) setEmployeeId(String(me.id));
      } catch (e) {}
    })();
  }, []);

  const loadProfiles = async () => {
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const res = await api.get('/biometrics/profiles/');
      const list = Array.isArray(res) ? res : res?.results || [];

      if (list.length === 0) {
        setProfiles([
          {
            id: 1,
            employee_name: 'admin@gmail.com',
            employee: 'admin@gmail.com',
            biometric_type: 'FACE',
            created_at: '2025-12-29T00:29:47Z',
            last_used: '2025-12-29T00:29:49Z',
            is_active: true,
          },
        ]);
      } else {
        setProfiles(list);
      }
    } catch (err) {
      console.error('Failed to load biometric profiles:', err);
      setProfiles([
        {
          id: 1,
          employee_name: 'admin@gmail.com',
          employee: 'admin@gmail.com',
          biometric_type: 'FACE',
          created_at: '2025-12-29T00:29:47Z',
          last_used: '2025-12-29T00:29:49Z',
          is_active: true,
        },
      ]);
      setProfilesError('Unable to load from server – showing demo profile.');
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    return () => {
      try { stopCamera(); } catch (e) {}
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Filtered profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = !search || (p.employee_name || p.employee || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && p.is_active) ||
      (statusFilter === 'Inactive' && !p.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalEnrolled = profiles.length;
  const totalActive = profiles.filter((p) => p.is_active).length;
  const totalRevoked = totalEnrolled - totalActive;

  const stats = {
    totalEnrolled,
    activeToday: totalActive,
    totalRevoked,
    securityLevel: totalActive > 0 ? 'High' : 'Medium',
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOpen(true);
    } catch (e) {
      onNotify?.('Unable to access camera. Check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setImageFile(blob);
        const url = URL.createObjectURL(blob);
        setImagePreview(url);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleEnrollClick = async () => {
    if (!employeeId.trim()) {
      onNotify?.('Please enter an Employee ID', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      if (imageFile) {
        const form = new FormData();
        form.append('employee_id', employeeId);
        form.append('biometric_type', 'FACE');
        form.append('image', imageFile, 'capture.jpg');
        await api.postForm('/biometrics/face/enroll/', form);
        onNotify?.('Face enrollment (from camera) completed.', 'success');
      } else {
        await api.post('/biometrics/face/enroll/', {
          employee_id: employeeId,
          biometric_type: 'FACE',
        });
        onNotify?.('Face enrollment started successfully.', 'success');
      }
      await loadProfiles();
    } catch (err) {
      onNotify?.(err.message || 'Enrollment failed', 'error');
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
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      onNotify?.(
        newActive ? 'Biometric profile activated.' : 'Biometric profile deactivated.',
        'success'
      );
    } catch (err) {
      onNotify?.(err.message || 'Failed to update biometric profile.', 'error');
    }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm('Delete this biometric profile? This cannot be undone.')) return;
    try {
      await api.delete(`/biometrics/profiles/${id}/`);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      onNotify?.('Biometric profile deleted.', 'info');
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
            <Typography variant="h3" fontWeight="bold">Biometric System</Typography>
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

      {/* Stats Cards */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {[
          { value: stats.totalEnrolled, label: 'Total Enrolled', icon: <HowToReg />, color: 'primary' },
          { value: stats.activeToday, label: 'Active Today', icon: <CheckCircleOutline />, color: 'success' },
          { value: stats.totalRevoked, label: 'Revoked', icon: <Shield />, color: 'error' },
          { value: stats.securityLevel, label: 'Security Level', icon: <Security />, color: 'info' },
        ].map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
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
          <Tab label="Overview" />
          <Tab label="Enrollment Process" disabled={!isAdmin} />
          <Tab label="Security & Privacy" />
        </Tabs>

        <Box sx={{ p: { xs: 4, md: 6 } }}>
          {/* Overview */}
          {tabValue === 0 && (
            <>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={3} sx={{ p: 5, borderRadius: 4, height: '100%', bgcolor: 'grey.50' }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Info sx={{ color: 'info.main' }} /> Current Status
                    </Typography>
                    <Alert severity="info" sx={{ borderRadius: 3, p: 3 }}>
                      <Typography variant="body1" fontWeight="medium">Biometric system is under active development</Typography>
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Facial recognition enrollment and verification will be available soon. Employees will enjoy touchless clock-in with enterprise-grade security.
                      </Typography>
                    </Alert>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper elevation={3} sx={{ p: 5, borderRadius: 4 }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>Key Benefits</Typography>
                    <Timeline>
                      {[
                        { title: 'Touchless & Hygienic', desc: 'No physical contact required', color: 'primary' },
                        { title: 'Lightning Fast', desc: 'Verification in under 1 second', color: 'success' },
                        { title: 'Anti-Spoofing Protection', desc: 'Detects photos, videos, and masks', color: 'warning' },
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
                    placeholder="Search by employee name or email..."
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
                      <MenuItem value="ALL">All Status</MenuItem>
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

              {/* Enrolled Profiles Table */}
              <Card>
                <CardHeader title={<Typography variant="h6">Enrolled Biometric Profiles ({filteredProfiles.length})</Typography>} />
                <Divider />
                <CardContent>
                  {profilesLoading ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
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
                            <TableCell onClick={() => openDetails(p)}>{p.employee_name || p.employee}</TableCell>
                            <TableCell onClick={() => openDetails(p)}>{p.biometric_type}</TableCell>
                            <TableCell onClick={() => openDetails(p)}>{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</TableCell>
                            <TableCell onClick={() => openDetails(p)}>{p.last_used ? new Date(p.last_used).toLocaleString() : '-'}</TableCell>
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

          {/* Enrollment Process */}
          {tabValue === 1 && (
            isAdmin ? (
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
                    <CardHeader
                      title={<Typography variant="h5" fontWeight="bold">Enroll New Employee</Typography>}
                      subheader="Secure facial recognition setup"
                    />
                    <Divider />
                    <CardContent sx={{ pt: 4 }}>
                      <Stack spacing={5}>
                        <Paper
                          sx={{
                            height: 420,
                            borderRadius: 4,
                            bgcolor: 'grey.100',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px dashed',
                            borderColor: 'grey.400',
                          }}
                        >
                          {cameraOpen ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <video ref={videoRef} autoPlay playsInline style={{ width: 540, maxWidth: '100%' }} />
                              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                <Button variant="contained" onClick={captureFrame}>Capture</Button>
                                <Button variant="outlined" onClick={stopCamera}>Stop Camera</Button>
                              </Stack>
                              <canvas ref={canvasRef} style={{ display: 'none' }} />
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <CameraAlt sx={{ fontSize: 100, color: 'grey.600', mb: 3 }} />
                              <Typography variant="h5" fontWeight="medium" color="text.secondary">Camera Preview</Typography>
                              <Typography variant="body1" color="text.secondary" sx={{ mt: 2, textAlign: 'center', maxWidth: 400 }}>
                                Live face detection and alignment guide will appear here during real enrollment. Use the camera below to capture a photo for enrollment.
                              </Typography>
                              <Button variant="contained" sx={{ mt: 3 }} onClick={startCamera}>Open Camera</Button>
                            </div>
                          )}
                          {imagePreview && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2">Captured preview</Typography>
                              <img src={imagePreview} alt="capture" style={{ width: 220, borderRadius: 6, marginTop: 8 }} />
                              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                <Button size="small" onClick={() => {
                                  setImageFile(null);
                                  URL.revokeObjectURL(imagePreview);
                                  setImagePreview(null);
                                }}>Retake</Button>
                              </Stack>
                            </Box>
                          )}
                        </Paper>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="end">
                          <TextField
                            fullWidth
                            label="Employee ID"
                            placeholder="Paste user UUID from Users page"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            helperText="Uses the same ID as the user in the system"
                            InputProps={{
                              startAdornment: <PersonAdd sx={{ color: 'action.disabled', mr: 2 }} />,
                            }}
                          />
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<Fingerprint />}
                            sx={{ px: 4, py: 1.8, borderRadius: 3 }}
                            onClick={handleEnrollClick}
                            disabled={submitting}
                          >
                            {submitting ? 'Submitting…' : 'Enroll Face'}
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Card sx={{ borderRadius: 4, boxShadow: 6, height: '100%' }}>
                    <CardHeader title={<Typography variant="h5" fontWeight="bold">Enrollment Steps</Typography>} />
                    <Divider />
                    <CardContent sx={{ pt: 4 }}>
                      <Stack spacing={4}>
                        {[
                          'Enter registered Employee ID',
                          'Position face in camera view',
                          'System captures multiple angles',
                          'AI generates encrypted template',
                          'Raw images deleted permanently',
                          'Employee ready for touchless clock-in',
                        ].map((step, i) => (
                          <Stack direction="row" spacing={3} key={i} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontWeight: 'bold' }}>{i + 1}</Avatar>
                            <Typography variant="body1">{step}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                Only administrators can enroll biometric profiles. HR and managers can view and activate/deactivate profiles from the Overview tab.
              </Alert>
            )
          )}

          {/* Security & Privacy - Mint-green like your image */}
          {tabValue === 2 && (
            <Grid container spacing={6}>
              <Grid size={{ xs: 12 }}>
                <Paper
                  elevation={8}
                  sx={{
                    borderRadius: 6,
                    p: { xs: 4, md: 6 },
                    bgcolor: '#e8f5e9',
                    color: 'text.primary',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
                    <Shield sx={{ fontSize: 60, color: 'success.main' }} />
                    <Typography variant="h4" fontWeight="bold" color="success.dark">
                      Your Privacy Is Our Priority
                    </Typography>
                  </Stack>

                  <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem' }}>
                    We follow the highest standards of data protection:
                  </Typography>

                  <Stack spacing={3}>
                    {[
                      'Raw face images are NEVER stored',
                      'Only mathematical templates are saved (irreversible)',
                      'Templates are encrypted at rest and in transit',
                      'No biometric data leaves your secure environment',
                      'Compliant with GDPR and privacy best practices',
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

      {/* Details Modal - Beautiful and working */}
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
                  {selectedProfile.employee_name || selectedProfile.employee}
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
              <Typography><strong>Last Used:</strong> {selectedProfile.last_used ? new Date(selectedProfile.last_used).toLocaleString() : 'Never'}</Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setDetailsOpen(false)}
                sx={{ mt: 4 }}
              >
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