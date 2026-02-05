import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Button, 
  Paper, Avatar, Tab, Tabs, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Alert, AlertTitle,
  TextField, InputAdornment, IconButton, Switch, CircularProgress
} from '@mui/material';
import {
  Fingerprint, CameraAlt, Timer, PersonAdd, ListAlt, 
  Search, DeleteForever, Shield, Refresh, InfoOutlined 
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
    // Exact mapping of your backend requirements
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

    // Auto-reset for attendance kiosk mode
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
    if (activeTab === 0) handleSubmit(file); // Auto-submit for attendance
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employee_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);


  // console.log('Current Session:', currentSession);
  // console.log('Enrolled Profiles:', profiles);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="900">BIOMETRIC PORTAL</Typography>
          <Typography variant="body2">Current User Role: <strong>{role}</strong></Typography>
        </Box>
        {activeTab === 0 && currentSession && (
          <Chip label={`Active Session: ${currentSession.id}`} color="success" icon={<Timer />} variant="outlined" />
        )}
      </Stack>

      <Tabs value={activeTab} onChange={(_, v) => {
          setActiveTab(v);
          setApiResponse({ show: false });
          setImagePreview(null);
      }} sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}>
        {showAttendanceCapture && <Tab label="ATTENDANCE" icon={<Fingerprint />} value={0} />}
        {showEnrollment && <Tab label="ENROLL FACE" icon={<PersonAdd />} value={1} />}
        {showProfileList && <Tab label="MANAGE PROFILES" icon={<ListAlt />} value={2} />}
      </Tabs>

      {(activeTab === 0 || activeTab === 1) && (
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3,}}>
                  <Shield fontSize="small" />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                    {activeTab === 1 ? "ENROLLMENT MODE: LIVENESS CHECKS ACTIVE" : "ATTENDANCE MODE: RAPID MATCHING"}
                  </Typography>
                </Stack>
                
                {!imagePreview ? (
                  <Box sx={{ py: 6 }}>
                    <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3,}}>
                      <CameraAlt sx={{ fontSize: 40, color: 'red' }} />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">Ready to Scan</Typography>
                    <Button variant="contained" size="large" sx={{ mt: 3 }} onClick={() => setCaptureDialogOpen(true)} startIcon={<CameraAlt />}>
                      Open Secure Camera
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={3} alignItems="center">
                    <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, borderRadius: 3, overflow: 'hidden', border: '4px solid', borderColor: apiResponse.show ? (apiResponse.severity === 'success' ? 'success.main' : 'error.main') : 'divider' }}>
                      <Box component="img" src={imagePreview} sx={{ width: '100%', display: 'block' }} />
                      {apiResponse.show && (
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'rgba(255,255,255,0.95)' }}>
                          <Alert severity={apiResponse.severity} variant="filled">
                            <AlertTitle><strong>{apiResponse.title}</strong></AlertTitle>
                            {apiResponse.message}
                          </Alert>
                        </Box>
                      )}
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ width: '100%', maxWidth: 480 }}>
                      <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={() => { setImagePreview(null); setApiResponse({show: false}); }} disabled={submitting}>Re-scan</Button>
                      {activeTab === 1 && !apiResponse.show && (
                        <Button fullWidth variant="contained" onClick={() => handleSubmit()} disabled={submitting}>
                          {submitting ? <CircularProgress size={24} color="inherit" /> : "Submit Enrollment"}
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
            {activeTab === 2 && showProfileList && (
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Enrolled Biometric Profiles
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell><strong>Employee ID</strong></TableCell>
                        <TableCell><strong>Full Name</strong></TableCell>
                        <TableCell><strong>Biometric</strong></TableCell>
                        <TableCell><strong>Enrolled Date</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>{p.employee_id || p.id}</TableCell>
                          <TableCell>{p.full_name || 'lidetu'}</TableCell>
                          <TableCell>{p.biometric_type}</TableCell>
                          <TableCell>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell align="center">
                            <Chip label="Active" size="small" color="success" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                      {profiles.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">No profiles found.</Typography>
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
        // IMPORTANT: Pass mode to dialog
        mode={activeTab === 1 ? 'ENROLL' : 'ATTENDANCE'} 
      />
    </Box>
  );
};

export default Biometrics;