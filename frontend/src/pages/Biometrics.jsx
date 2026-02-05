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

  return (
    <Box sx={{ p: { xs: 1, sm: 4 }, maxWidth: '1200px', mx: 'auto' }}>
      
      {/* Header with Responsive Logic */}
      <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="900">BIOMETRIC PORTAL</Typography>
          <Typography variant="caption" color="text.secondary">FIRMWARE V2.0 - SECURE ACCESS</Typography>
        </Box>
        {activeTab === 0 && currentSession && (
          <Chip label={`ACTIVE: ${currentSession.id}`} color="success" icon={<Timer />} variant="outlined" />
        )}
      </Stack>

      <Tabs 
        value={activeTab} 
        onChange={(_, v) => { setActiveTab(v); setApiResponse({ show: false }); setImagePreview(null); }} 
        variant={isMobile ? "scrollable" : "standard"}
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="ATTENDANCE" icon={<Fingerprint />} iconPosition="start" value={0} />
        <Tab label="ENROLLMENT" icon={<PersonAdd />} iconPosition="start" value={1} />
        <Tab label="PROFILES" icon={<ListAlt />} iconPosition="start" value={2} />
      </Tabs>

      {(activeTab === 0 || activeTab === 1) && (
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8} lg={6}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 12px 40px rgba(0,0,0,0.1)" }}>
              <CardContent sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center' }}>
                {!imagePreview ? (
                  <Box sx={{ py: 6 }}>
                    <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.light' }}>
                      <CameraAlt sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold">Ready for Scan</Typography>
                    <Button variant="contained" fullWidth={isMobile} size="large" onClick={() => setCaptureDialogOpen(true)} sx={{ mt: 3, borderRadius: 2 }}>Open Camera</Button>
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    <Box sx={{ 
                      position: 'relative', borderRadius: 3, overflow: 'hidden', border: '6px solid', 
                      borderColor: apiResponse.show 
                        ? (apiResponse.severity === 'success' ? '#4caf50' : apiResponse.severity === 'warning' ? '#ff9800' : '#f44336') 
                        : '#eee' 
                    }}>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block' }} />
                      {apiResponse.show && (
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'rgba(255,255,255,0.98)' }}>
                          <Alert severity={apiResponse.severity} variant="filled">
                            <AlertTitle sx={{ textAlign: 'left' }}><strong>{apiResponse.title}</strong></AlertTitle>
                            <Typography variant="body2" sx={{ textAlign: 'left' }}>{apiResponse.message}</Typography>
                          </Alert>
                        </Box>
                      )}
                    </Box>
                    <Stack direction={isMobile ? "column" : "row"} spacing={2}>
                      <Button fullWidth variant="outlined" size="large" onClick={() => { setImagePreview(null); setApiResponse({ show: false }); }}>Back</Button>
                      {activeTab === 1 && !apiResponse.show && (
                        <Button fullWidth variant="contained" size="large" onClick={() => handleSubmit()}>{submitting ? <CircularProgress size={24} color="inherit" /> : "Complete Enrollment"}</Button>
                      )}
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Profiles Tab remains the same but with responsive table sizing */}
      {activeTab === 2 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <TextField fullWidth size="small" placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 3, maxWidth: 300 }} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }} />
            <TableContainer component={Paper} variant="outlined">
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Biometric</TableCell>
                    <TableCell>Status</TableCell>

                  </TableRow>
                </TableHead>
                <TableBody>
                  {profiles.filter(p => p.employee?.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.employee_name}</TableCell>
                      <TableCell><Chip label={p.biometric_type} size="small" /></TableCell>
                      <TableCell><Chip label="Active" size="small" color="success" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <FaceCaptureDialog open={captureDialogOpen} onClose={() => setCaptureDialogOpen(false)} onCaptured={onCaptured} mode={activeTab === 1 ? 'ENROLL' : 'ATTENDANCE'} />
    </Box>
  );
};

export default Biometrics;