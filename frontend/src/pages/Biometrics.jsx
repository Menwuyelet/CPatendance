import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Button, 
  Paper, Avatar, Tab, Tabs, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Alert, AlertTitle
} from '@mui/material';
import {
  Fingerprint, CameraAlt, Timer, Warning, TaskAlt, PersonAdd, ListAlt
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import FaceCaptureDialog from '../components/FaceCaptureDialog';

const Biometrics = ({ role }) => {
  // --- 1. Role-Based Visibility Logic ---
  const isEmployee = role === 'Employee';
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  const isHR = role === 'HR';

  const showAttendanceCapture = isHR || isManager;
  const showProfileList = isHR || isAdmin;
  const showEnrollment = true; 

  // Initialize tab based on role priority
  const [activeTab, setActiveTab] = useState(() => {
    if (showAttendanceCapture) return 0;
    return 1;
  });

  // States
  const [currentSession, setCurrentSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [apiResponse, setApiResponse] = useState({ 
    show: false, 
    severity: 'info', 
    title: '', 
    message: '' 
  });

  // --- 2. Data Loading ---
  const loadData = useCallback(async () => {
    try {
      if (showAttendanceCapture) {
        const res = await api.get('/attendance/attendance-manage-sessions/');
        const active = (res?.results || res || []).find(s => s.is_active);
        if (active) setCurrentSession(active);
      }
      if (showProfileList) {
        const res = await api.get('/biometrics/profiles/');
        console.log("Loaded profiles:", res);
        setProfiles(res?.results || res || []);
      }
    } catch (err) {
      console.error("Initial load error:", err);
    }
  }, [showAttendanceCapture, showProfileList]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- 3. Submission Handler (With Detail Error Fix) ---
  const handleSubmit = async () => {
    if (!imageFile) return;
    setSubmitting(true);
    setApiResponse({ show: false, severity: 'info', title: '', message: '' });

    const formData = new FormData();
    formData.append('image', imageFile); 

    const endpoint = activeTab === 0 
      ? '/attendance/attendance-check-in/' 
      : '/biometrics/face/enroll/';
    
    if (activeTab === 0 && currentSession?.id) {
      formData.append('session_id', currentSession.id);
    }

    try {
      const res = await api.postForm(endpoint, formData);
      
      setApiResponse({
        show: true,
        severity: 'success',
        title: 'SUCCESS',
        message: res?.result || "Action processed successfully."
      });

      // Reset after success delay
      setTimeout(() => {
        setImagePreview(null);
        setImageFile(null);
        setApiResponse({ show: false, severity: 'info', title: '', message: '' });
        loadData();
      }, 4000);

} catch (err) {
  const errorData = err?.response?.data;
  const status = err?.response?.status;

  // Check for the specific "Match Aborted" or "No Embeddings" scenario
  let customMessage = errorData?.detail || "Face not recognized.";

  if (customMessage.toLowerCase().includes("no_stored_embeddings") || status === 400) {
    customMessage = "No face data found for this shift. Please ensure you have Enrolled your face first!";
  }

  setApiResponse({
    show: true,
    severity: 'warning', // Warning is better here since it's a configuration issue
    title: 'Match Failed',
    message: customMessage
  });
}      finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header Section */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="primary">Biometric Portal</Typography>
          <Typography variant="body2" color="text.secondary">Role: <strong>{role}</strong></Typography>
        </Box>
        {activeTab === 0 && currentSession && (
          <Chip label={`Active Session: ${currentSession.id}`} color="success" icon={<Timer />} variant="outlined" />
        )}
      </Stack>

      {/* Role-Based Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => {
            setActiveTab(v);
            setApiResponse({ show: false });
            setImagePreview(null);
        }} 
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        {showAttendanceCapture && <Tab label="Attendance" icon={<Fingerprint />} iconPosition="start" value={0} />}
        {showEnrollment && <Tab label="Enroll Face" icon={<PersonAdd />} iconPosition="start" value={1} />}
        {showProfileList && <Tab label="Enrolled Profiles" icon={<ListAlt />} iconPosition="start" value={2} />}
      </Tabs>

      {/* Capture View (Attendance / Enrollment) */}
      {(activeTab === 0 || activeTab === 1) && (
        <Grid container justifyContent="center">
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                {!imagePreview ? (
                  <Box sx={{ py: 6 }}>
                    <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: 'primary.light' }}>
                      <CameraAlt sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Avatar>
                    <Typography variant="h6" gutterBottom>Ready for Scan</Typography>
                    <Button variant="contained" size="large" onClick={() => setCaptureDialogOpen(true)} startIcon={<CameraAlt />}>
                      Open Camera
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={3} alignItems="center">
                    <Box sx={{ position: 'relative', width: '100%', maxWidth: 450, borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
                      <Box component="img" src={imagePreview} sx={{ width: '100%', display: 'block' }} />
                      
                      {/* RESPONSE OVERLAY (Shows Detail Message Here) */}
                      {apiResponse.show && (
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1, bgcolor: 'rgba(255,255,255,0.9)' }}>
                          <Alert severity={apiResponse.severity} variant="standard">
                            <AlertTitle sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{apiResponse.title}</AlertTitle>
                            <Typography variant="caption">{apiResponse.message}</Typography>
                          </Alert>
                        </Box>
                      )}
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ width: '100%', maxWidth: 450 }}>
                      <Button fullWidth variant="outlined" onClick={() => { setImagePreview(null); setApiResponse({show: false}); }} disabled={submitting}>
                        Re-take
                      </Button>
                      {!apiResponse.show && (
                        <Button fullWidth variant="contained" onClick={handleSubmit} loading={submitting}>
                          Submit {activeTab === 0 ? 'Check-in' : 'Enrollment'}
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

      {/* Profile List View (HR / Admin) */}
      {activeTab === 2 && showProfileList && (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell><strong>Employee ID</strong></TableCell>
                <TableCell><strong>Full Name</strong></TableCell>
                <TableCell><strong>Enrolled Date</strong></TableCell>
                <TableCell align="right"><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.employee_id || p.id}</TableCell>
                  <TableCell>{p.full_name || 'System User'}</TableCell>
                  <TableCell>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Chip label="Active" size="small" color="success" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>No profiles found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FaceCaptureDialog 
        open={captureDialogOpen} 
        onClose={() => setCaptureDialogOpen(false)} 
        onCaptured={(file) => {
            setImagePreview(URL.createObjectURL(file));
            setImageFile(file);
            setCaptureDialogOpen(false);
        }} 
      />
    </Box>
  );
};

export default Biometrics;