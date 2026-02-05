import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Button,
  Paper, Avatar, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, AlertTitle,
  TextField, InputAdornment, IconButton, Switch, CircularProgress
} from '@mui/material';
import {
  Fingerprint, CameraAlt, Timer, PersonAdd, ListAlt,
  Search, DeleteForever, Shield, Refresh, InfoOutlined,
  Menu as MenuIcon
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import FaceCaptureDialog from '../components/FaceCaptureDialog';

const Biometrics = ({ role }) => {
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  const isHR = role === 'HR';

  const showAttendanceCapture = isHR || isManager;
  const showProfileList = isHR || isAdmin;
  const showEnrollment = true;

  const [activeTab, setActiveTab] = useState(showAttendanceCapture ? 0 : 1);
  const [currentSession, setCurrentSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [apiResponse, setApiResponse] = useState({
    show: false, severity: 'info', title: '', message: ''
  });

  const loadData = useCallback(async () => {
    try {
      if (showAttendanceCapture) {
        const res = await api.get('/attendance/attendance-manage-sessions/');
        const active = (res?.results || res || []).find(s => s.is_active);
        if (active) setCurrentSession(active);
      }
      if (showProfileList) {
        const res = await api.get('/biometrics/profiles/');
        setProfiles(res?.results || res || []);
      }
    } catch (err) { console.error(err); }
  }, [showAttendanceCapture, showProfileList]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBackendResponse = (key, rawMessage) => {
    const statusConfig = {
      'STOP_SUCCESS': { sev: 'success', title: 'STOP_SUCCESS', msg: 'Verification successful! Entry recorded.' },
      'STOP_DUPLICATE': { sev: 'warning', title: 'STOP_DUPLICATE', msg: 'You have already checked in for this session.' },
      'SESSION_DUPLICATE_ENTRY': { sev: 'warning', title: 'STOP_DUPLICATE', msg: 'A record already exists for this ID.' },
      'TRY_AGAIN': { sev: 'error', title: 'TRY_AGAIN', msg: 'No matching employee found. Please ensure you are enrolled.' },
      'NO_ACTIVE_SESSION': { sev: 'error', title: 'NO_ACTIVE_SESSION', msg: rawMessage || 'There is no active session currently.' },
      'NO_FACE_DETECTED': { sev: 'error', title: 'NO_FACE_DETECTED', msg: 'We could not detect a clear face. Please try again.' },
    };

    const config = statusConfig[key] || {
      sev: key?.toLowerCase().includes('success') ? 'success' : 'error',
      title: key || 'SERVER RESPONSE',
      msg: rawMessage || 'An unexpected status was returned from the server.'
    };

    setApiResponse({ show: true, severity: config.sev, title: config.title, message: config.msg });

    if (activeTab === 0 && (key === 'STOP_SUCCESS' || key.includes('DUPLICATE'))) {
      setTimeout(() => {
        setImagePreview(null);
        setApiResponse({ show: false });
        loadData();
      }, 4000);
    }
  };

  const handleSubmit = useCallback(async (fileToSubmit = null) => {
    const finalFile = fileToSubmit || imageFile;
    if (!finalFile) return;

    setSubmitting(true);
    setApiResponse({ show: false });

    const formData = new FormData();
    formData.append('image', finalFile);

    const endpoint = activeTab === 0
      ? '/attendance/attendance-check-in/'
      : '/biometrics/face/enroll/';

    if (activeTab === 0 && currentSession?.id) {
      formData.append('session_id', currentSession.id);
    }

    try {
      const res = await api.postForm(endpoint, formData);
      handleBackendResponse(res?.status || res?.result || 'STOP_SUCCESS', res?.message);
    } catch (err) {
      const errorData = err?.response?.data;
      handleBackendResponse(errorData?.status || errorData?.result || errorData?.detail, errorData?.detail);
    } finally { setSubmitting(false); }
  }, [imageFile, activeTab, currentSession, loadData]);

  const onCaptured = (file) => {
    setImagePreview(URL.createObjectURL(file));
    setImageFile(file);
    setCaptureDialogOpen(false);
    if (activeTab === 0) handleSubmit(file);
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p =>
      p.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.employee && String(p.employee).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [profiles, searchTerm]);

  return (
    <Box sx={{
      p: { xs: 2, sm: 3, md: 4 },
      maxWidth: '1400px',
      mx: 'auto',
      width: '100%'
    }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        mb: 3
      }}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' } }}>
            BIOMETRIC PORTAL
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Current User Role: <strong>{role}</strong>
          </Typography>
        </Box>
        {activeTab === 0 && currentSession && (
          <Chip
            label={`Active Session: ${currentSession.id}`}
            color="success"
            icon={<Timer />}
            variant="outlined"
            sx={{ mt: { xs: 1, sm: 0 } }}
          />
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setApiResponse({ show: false });
          setImagePreview(null);
        }}
        sx={{
          mb: 4,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            minWidth: { xs: 'auto', sm: 120 },
            px: { xs: 1, sm: 2 },
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
      >
        {showAttendanceCapture && <Tab label="ATTENDANCE" icon={<Fingerprint />} iconPosition="start" value={0} />}
        {showEnrollment && <Tab label="ENROLL FACE" icon={<PersonAdd />} iconPosition="start" value={1} />}
        {showProfileList && <Tab label="MANAGE PROFILES" icon={<ListAlt />} iconPosition="start" value={2} />}
      </Tabs>

      {/* Attendance & Enrollment Cards */}
      {(activeTab === 0 || activeTab === 1) && (
        <Grid container justifyContent="center">
          <Grid item xs={12} sm={10} md={8} lg={6}>
            <Card sx={{
              borderRadius: { xs: 2, sm: 3, md: 4 },
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              overflow: 'hidden'
            }}>
              <CardContent sx={{
                p: { xs: 2, sm: 3, md: 4 },
                textAlign: 'center'
              }}>
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  alignItems="center"
                  sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
                >
                  <Shield fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                    {activeTab === 1 ? "ENROLLMENT MODE: LIVENESS CHECKS ACTIVE" : "ATTENDANCE MODE: RAPID MATCHING"}
                  </Typography>
                </Stack>

                {!imagePreview ? (
                  <Box sx={{ py: { xs: 3, sm: 5, md: 6 } }}>
                    <Avatar sx={{
                      width: { xs: 60, sm: 80, md: 100 },
                      height: { xs: 60, sm: 80, md: 100 },
                      mx: 'auto',
                      mb: 2,
                      bgcolor: 'primary.light'
                    }}>
                      <CameraAlt sx={{ fontSize: { xs: 30, sm: 40, md: 50 }, color: 'primary.main' }} />
                    </Avatar>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2 }}
                    >
                      Ready to Scan
                    </Typography>
                    <Button
                      variant="contained"
                      size={activeTab === 1 ? "large" : "medium"}
                      onClick={() => setCaptureDialogOpen(true)}
                      startIcon={<CameraAlt />}
                      sx={{
                        px: { xs: 3, sm: 4 },
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Open Secure Camera
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={2} alignItems="center">
                    <Box sx={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: { xs: 320, sm: 400, md: 480 },
                      borderRadius: { xs: 2, sm: 3 },
                      overflow: 'hidden',
                      border: '4px solid',
                      borderColor: apiResponse.show ? (apiResponse.severity === 'success' ? 'success.main' : 'error.main') : 'divider'
                    }}>
                      <Box
                        component="img"
                        src={imagePreview}
                        sx={{ width: '100%', display: 'block', aspectRatio: '4/3' }}
                      />
                      {apiResponse.show && (
                        <Box sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: { xs: 1.5, sm: 2 },
                          bgcolor: 'rgba(255,255,255,0.95)'
                        }}>
                          <Alert severity={apiResponse.severity} variant="filled">
                            <AlertTitle sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                              <strong>{apiResponse.title}</strong>
                            </AlertTitle>
                            <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {/* {apiResponse.message} */}
                            </Typography>
                          </Alert>
                        </Box>
                      )}
                    </Box>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      sx={{ width: '100%', maxWidth: { xs: 320, sm: 400, md: 480 } }}
                    >
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => { setImagePreview(null); setApiResponse({ show: false }); }}
                        disabled={submitting}
                        sx={{ py: { xs: 1, sm: 1.5 } }}
                      >
                        Re-scan
                      </Button>
                      {activeTab === 1 && !apiResponse.show && (
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleSubmit()}
                          disabled={submitting}
                          sx={{ py: { xs: 1, sm: 1.5 } }}
                        >
                          {submitting ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            "Submit Enrollment"
                          )}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Profile List */}
      {activeTab === 2 && showProfileList && (
        <Card sx={{ overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Enrolled Biometric Profiles
            </Typography>

            {/* Search Bar */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3, maxWidth: 400 }}
            />

            {/* Responsive Table */}
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: { xs: 400, sm: 500 } }}
            >
              <Table stickyHeader size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>ID</strong></TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>Full Name</strong></TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>Biometric</strong></TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>Enrolled</strong></TableCell>
                    <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProfiles.map((p) => (
                    <TableRow key={p.id} hover sx={{ height: { xs: 48, sm: 56 } }}>
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {p.employee_id || p.id}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {p.employee_name || 'System User'}
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        <Chip
                          label={p.biometric_type}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="Active"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary" variant="body2">
                          No profiles found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <FaceCaptureDialog
        open={captureDialogOpen}
        onClose={() => setCaptureDialogOpen(false)}
        onCaptured={onCaptured}
        mode={activeTab === 1 ? 'ENROLL' : 'ATTENDANCE'}
      />
    </Box>
  );
};

export default Biometrics;
