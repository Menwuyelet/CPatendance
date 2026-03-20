import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Button,
  Paper, Avatar, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, AlertTitle,
  TextField, InputAdornment, CircularProgress, useTheme, useMediaQuery
} from '@mui/material';
import {
  Fingerprint, CameraAlt, Timer, PersonAdd, ListAlt,
  Search, ErrorOutline, CheckCircleOutline, Block
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import FaceCaptureDialog from '../components/FaceCaptureDialog';

const Biometrics = ({ role }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const useCompactListLayout = useMediaQuery(theme.breakpoints.down('md'));

  const [activeTab, setActiveTab] = useState(role === 'HR' || role === 'Manager' ? 0 : 1);
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
      const sessRes = await api.get('/attendance/attendance-manage-sessions/');
      const active = (sessRes?.results || sessRes || []).find(s => s.is_active);
      if (active) setCurrentSession(active);
      
      const profRes = await api.get('/biometrics/profiles/');
      setProfiles(profRes?.results || profRes || []);
    } catch (err) { console.error("Data load error:", err); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tabDetails = useMemo(() => ([
    {
      value: 0,
      label: 'ATTENDANCE',
      icon: <Fingerprint />,
      badge: currentSession ? `Session ${currentSession.id} live` : 'No active session',
      badgeColor: currentSession ? 'success' : 'warning',
      title: 'Fast biometric attendance check-in',
      description: currentSession
        ? 'Open the camera, keep your face centered, and the system will submit attendance automatically after capture.'
        : 'There is no active attendance session right now. Ask HR or a manager to open a session before employees scan in.',
      helper: currentSession
        ? 'Best for employees who only need to verify presence and complete check-in quickly.'
        : 'Attendance mode stays visible so users understand why capture cannot complete.'
    },
    {
      value: 1,
      label: 'ENROLLMENT',
      icon: <PersonAdd />,
      badge: 'Capture and review required',
      badgeColor: 'info',
      title: 'Register a face profile for future scans',
      description: 'Use this tab to capture a face image, review the preview, and then save the biometric enrollment manually.',
      helper: 'Best for HR and managers when onboarding a new employee or refreshing an outdated biometric profile.'
    },
    {
      value: 2,
      label: 'PROFILES',
      icon: <ListAlt />,
      badge: `${profiles.length} profile${profiles.length === 1 ? '' : 's'} available`,
      badgeColor: 'default',
      title: 'Review registered biometric profiles',
      description: 'Search the list of enrolled employees, confirm biometric type, and quickly review registration status.',
      helper: 'On smaller devices the directory switches to card view so details stay readable without horizontal scrolling.'
    }
  ]), [currentSession, profiles.length]);

  const activeTabDetail = tabDetails.find((item) => item.value === activeTab) || tabDetails[0];

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return profiles.filter((profile) => {
      const employeeName = String(profile.employee_name || profile.employee || '').toLowerCase();
      const biometricType = String(profile.biometric_type || '').toLowerCase();
      if (!normalizedSearch) return true;
      return employeeName.includes(normalizedSearch) || biometricType.includes(normalizedSearch);
    });
  }, [profiles, searchTerm]);

  /**
   * HTTP STATUS BASED HANDLER
   * This is the brain of the response system.
   */
  const handleResponseByStatus = (status, data) => {
    const msg = data?.message || data?.detail || "";
    const key = data?.status || data?.result || "";

    let config = { sev: 'info', title: 'Response', msg: 'Processing...' };

    // --- 1. SUCCESS CODES ---
    if (status === 201 || (status === 200 && key.includes('SUCCESS'))) {
      config = {
        sev: 'success',
        title: activeTab === 1 ? 'Registration Successful' : 'Attendance Marked',
        msg: 'The operation was completed successfully.'
      };
    }

    // --- 2. LOGIC ERRORS (400 Bad Request) ---
    else if (status === 400) {
      // Analyze the backend message or key to be specific
      if (key.includes('DUPLICATE') || msg.toLowerCase().includes('already')) {
        config = { sev: 'warning', title: 'Already Processed', msg: 'Your attendance for this session is already recorded.' };
      } 
      else if (key.includes('ABORTED') || msg.toLowerCase().includes('embedding')) {
        config = { sev: 'error', title: 'Shift Error', msg: 'This shift is not configured for biometrics. Please contact HR.' };
      } 
      else if (key.includes('NO_FACE') || key.includes('BIOMETRIC_MATCH_ABORTED') || msg.toLowerCase().includes('SESSION_EMBEDDING_PROCESS_STARTED') || msg.toLowerCase().includes('face')) {
        config = { sev: 'error', title: 'Scan Failed', msg: 'No face was found. You may be not registered. Please check your credentials and try again.' };
      } 
      else if (key.includes('SESSION') || msg.toLowerCase().includes('active')) {
        config = { sev: 'error', title: 'Session Closed', msg: 'There is no active attendance session available for this shift.' };
      }
      else {
        // Default 400: Likely a mismatch or unauthorized person for this shift
        config = { sev: 'error', title: 'Access Denied', msg: 'Verification failed. You may not be assigned to this specific session.' };
      }
    }

    // --- 3. AUTH ERRORS ---
    else if (status === 401 || status === 403) {
      config = { sev: 'error', title: 'Not Authorized', msg: 'You do not have the required permissions. Please log in again.' };
    }

    // --- 4. SERVER ERRORS ---
    else {
      config = { sev: 'error', title: 'System Error', msg: 'The biometric server is temporarily unavailable. Please try again later.' };
    }

    setApiResponse({ show: true, severity: config.sev, title: config.title, message: config.msg });

    // Auto-reset UI for success/duplicates
    if (config.sev === 'success' || config.sev === 'warning') {
      setTimeout(() => {
        setImagePreview(null);
        setApiResponse({ show: false });
        loadData();
      }, 5000);
    }
  };

  const handleSubmit = useCallback(async (fileToSubmit = null) => {
    const finalFile = fileToSubmit || imageFile;
    if (!finalFile) return;

    setSubmitting(true);
    setApiResponse({ show: false });

    const formData = new FormData();
    formData.append('image', finalFile);
    if (activeTab === 0 && currentSession?.id) {
      formData.append('session_id', currentSession.id);
    }

    const endpoint = activeTab === 0 ? '/attendance/attendance-check-in/' : '/biometrics/face/enroll/';

    try {
      const res = await api.postForm(endpoint, formData);
      // api.service should return the full response including status
      handleResponseByStatus(201, res); 
    } catch (err) {
      const statusCode = err?.response?.status || 500;
      const errorData = err?.response?.data || {};
      handleResponseByStatus(statusCode, errorData);
    } finally { setSubmitting(false); }
  }, [imageFile, activeTab, currentSession, loadData]);

  const onCaptured = (file) => {
    setImagePreview(URL.createObjectURL(file));
    setImageFile(file);
    setCaptureDialogOpen(false);
    if (activeTab === 0) handleSubmit(file);
  };

  const handleTabChange = (_, value) => {
    setActiveTab(value);
    setApiResponse({ show: false });
    setImagePreview(null);
    setImageFile(null);
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 2.5, md: 4 }, py: { xs: 1.5, sm: 3, md: 4 }, maxWidth: '1280px', mx: 'auto' }}>


      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: '0 18px 46px rgba(15, 23, 42, 0.08)' }}>
        <CardContent sx={{ p: { xs: 0.75, sm: 1.5 } }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : isTablet ? 'fullWidth' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile={isMobile}
            sx={{
              '& .MuiTabs-flexContainer': {
                gap: { xs: 0.5, sm: 1 }
              },
              '& .MuiTab-root': {
                minHeight: { xs: 72, sm: 76 },
                minWidth: { xs: 152, sm: 170, md: 180 },
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                alignItems: 'stretch',
                justifyContent: 'center',
                px: { xs: 1, sm: 2 }
              }
            }}
          >
            {tabDetails.map((tab) => (
              <Tab
                key={tab.value}
                icon={tab.icon}
                iconPosition="start"
                value={tab.value}
                label={
                  <Box sx={{ textAlign: 'left', width: '100%', overflow: 'hidden' }}>
                    <Typography component="span" sx={{ display: 'block', fontWeight: 800, fontSize: { xs: '0.82rem', sm: '0.9rem' } }}>
                      {tab.label}
                    </Typography>
                    {activeTab === tab.value && (
                      <Typography
                        component="span"
                        sx={{
                          display: '-webkit-box',
                          mt: 0.25,
                          fontSize: { xs: '0.7rem', sm: '0.78rem' },
                          color: 'text.secondary',
                          fontWeight: 600,
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {tab.title}
                      </Typography>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Alert
        severity={activeTab === 0 && !currentSession ? 'warning' : 'info'}
        icon={activeTab === 0 && !currentSession ? <ErrorOutline /> : <CheckCircleOutline />}
        sx={{
          mb: 3,
          borderRadius: 3,
          alignItems: 'flex-start',
          py: 0.8,
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <AlertTitle sx={{ mb: 0.6, fontSize: { xs: '1rem', sm: '1.1rem' }, fontWeight: 800 }}>{activeTabDetail.title}</AlertTitle>
        <Typography variant="body1" sx={{ lineHeight: 1.7 }}>{activeTabDetail.description}</Typography>
      </Alert>

      {(activeTab === 0 || activeTab === 1) && (
        <Grid container spacing={3} alignItems="stretch" justifyContent="center">
          {activeTab === 1 && (
            <Grid item xs={12} md={10} lg={4}>
              <Stack spacing={3} sx={{ height: '100%' }}>
                <Card sx={{ borderRadius: 4, height: '100%' }}>
                  <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Stack spacing={2.5}>
                      <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.main' }}>
                        <PersonAdd sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          Enrollment capture flow
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                          Capture a clear face image, review the preview, and confirm enrollment to save the biometric profile.
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label="Manual confirmation" color="info" />
                        <Chip label={currentSession ? 'Camera ready' : 'Session check required'} variant="outlined" />
                      </Stack>

                      <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          What users should expect
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                          Enrollment does not save automatically. Users can retake the image or complete enrollment after reviewing the preview.
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          )}

          <Grid item xs={12} md={10} lg={activeTab === 0 ? 9 : 8}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 18px 46px rgba(15, 23, 42, 0.1)' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3.5 }, textAlign: 'center' }}>
                {!imagePreview ? (
                  <Box sx={{ py: { xs: 3, sm: 6 } }}>
                    <Avatar sx={{ width: 88, height: 88, mx: 'auto', mb: 2.5, bgcolor: 'primary.light' }}>
                      <CameraAlt sx={{ fontSize: 42, color: 'primary.main' }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight={800}>
                      {activeTab === 0 ? 'Ready for attendance scan' : 'Ready to enroll a new face profile'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 700, mx: 'auto', lineHeight: 1.7 }}>
                      {activeTab === 0
                        ? 'Use the camera when the employee is in frame. The page will submit attendance as soon as capture finishes.'
                        : 'Open the camera, capture a clean face image, and verify the preview before submitting the biometric record.'}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth={isMobile}
                        onClick={() => setCaptureDialogOpen(true)}
                        sx={{ borderRadius: 2.5, px: 3 }}
                        disabled={activeTab === 0 && !currentSession}
                      >
                        Open Camera
                      </Button>
                      {(activeTab === 0 && !currentSession) && (
                        <Button variant="outlined" size="large" fullWidth={isMobile} disabled sx={{ borderRadius: 2.5 }}>
                          Waiting for session
                        </Button>
                      )}
                    </Stack>
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    <Box sx={{
                      position: 'relative',
                      borderRadius: 4,
                      overflow: 'hidden',
                      border: '6px solid',
                      borderColor: apiResponse.show
                        ? (apiResponse.severity === 'success' ? '#4caf50' : apiResponse.severity === 'warning' ? '#ff9800' : '#f44336')
                        : '#e5e7eb',
                      bgcolor: '#f8fafc'
                    }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block', maxHeight: isMobile ? '60vh' : '70vh', objectFit: 'cover' }} />
                      {apiResponse.show && (
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(255,255,255,0.98)' }}>
                          <Alert severity={apiResponse.severity} variant="filled">
                            <AlertTitle sx={{ textAlign: 'left' }}><strong>{apiResponse.title}</strong></AlertTitle>
                            <Typography variant="body2" sx={{ textAlign: 'left' }}>{apiResponse.message}</Typography>
                          </Alert>
                        </Box>
                      )}
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        onClick={() => { setImagePreview(null); setImageFile(null); setApiResponse({ show: false }); }}
                        sx={{ borderRadius: 2.5 }}
                      >
                        Capture Again
                      </Button>
                      {activeTab === 1 && !apiResponse.show && (
                        <Button fullWidth variant="contained" size="large" onClick={() => handleSubmit()} sx={{ borderRadius: 2.5 }}>
                          {submitting ? <CircularProgress size={24} color="inherit" /> : 'Complete Enrollment'}
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

      {activeTab === 2 && (
        <Card sx={{ borderRadius: 4, boxShadow: '0 18px 46px rgba(15, 23, 42, 0.08)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Biometric profile directory
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Search by employee name or biometric type. The list adapts to cards on smaller screens for easier reading.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search employees or biometric type"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ maxWidth: { xs: '100%', md: 340 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${filteredProfiles.length} shown`} color="primary" variant="outlined" />
                <Chip label={`${profiles.length} total`} variant="outlined" />
              </Stack>

              {filteredProfiles.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
                  <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'warning.light', color: 'warning.dark' }}>
                    <Block />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700}>
                    No profiles match this search
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Adjust the search term or clear it to see all registered biometric profiles.
                  </Typography>
                </Paper>
              ) : useCompactListLayout ? (
                <Stack spacing={2}>
                  {filteredProfiles.map((profile) => (
                    <Paper key={profile.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                          spacing={{ xs: 1, sm: 2 }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800}>
                              {profile.employee_name || 'Unknown employee'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Profile ID: {profile.id}
                            </Typography>
                          </Box>
                          <Chip
                            label="Active"
                            color="success"
                            size="small"
                            sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={profile.biometric_type || 'Unknown type'} size="small" />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell><strong>ID</strong></TableCell>
                        <TableCell><strong>Full Name</strong></TableCell>
                        <TableCell><strong>Biometric</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProfiles.map((profile) => (
                        <TableRow key={profile.id} hover>
                          <TableCell>{profile.id}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{profile.employee_name}</TableCell>
                          <TableCell>
                            <Chip label={profile.biometric_type || 'Unknown type'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label="Active" size="small" color="success" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <FaceCaptureDialog open={captureDialogOpen} onClose={() => setCaptureDialogOpen(false)} onCaptured={onCaptured} mode={activeTab === 1 ? 'ENROLL' : 'ATTENDANCE'} />
    </Box>
  );
};

export default Biometrics;