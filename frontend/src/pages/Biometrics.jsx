// src/pages/Biometrics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Button, 
  Paper, Avatar, Tab, Tabs, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Alert, AlertTitle,
  CircularProgress,
} from '@mui/material';
import {
  Fingerprint, CameraAlt, Timer, Warning, TaskAlt, PersonAdd, ListAlt,
  Refresh,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import FaceCaptureDialog from '../components/FaceCaptureDialog';

// Dashboard Layout
const DashboardLayout = ({ children, title, breadcrumbs = [], actions }) => (
  <Box sx={{ width: '100%' }}>
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {breadcrumbs.length > 0 && (
          <>
            <Typography color="text.secondary">/</Typography>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <Typography color={idx === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}>
                  {crumb.label}
                </Typography>
                {idx < breadcrumbs.length - 1 && <Typography color="text.secondary">/</Typography>}
              </React.Fragment>
            ))}
          </>
        )}
      </Box>
      {actions && <Box sx={{ mt: 2 }}>{actions}</Box>}
    </Box>
    {children}
  </Box>
);

const Biometrics = ({ role, onNotify }) => {
  // Role-Based Visibility Logic
  const isEmployee = role === 'Employee';
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  const isHR = role === 'HR';

  const showAttendanceCapture = isHR || isManager;
  const showProfileList = isHR || isManager || isAdmin;
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
  const [loading, setLoading] = useState(false);
  
  const [apiResponse, setApiResponse] = useState({ 
    show: false, 
    severity: 'info', 
    title: '', 
    message: '' 
  });

  // Data Loading
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (showAttendanceCapture) {
        const res = await api.get('/attendance/attendance-manage-sessions/').catch(() => ({ results: [] }));
        const active = (res?.results || res || []).find(s => s.is_active);
        if (active) setCurrentSession(active);
      }
      if (showProfileList) {
        const res = await api.get('/biometrics/profiles/').catch(() => ({ results: [] }));
        setProfiles(res?.results || res || []);
      }
    } catch (err) {
      console.error("Initial load error:", err);
    } finally {
      setLoading(false);
    }
  }, [showAttendanceCapture, showProfileList]);

  useEffect(() => { loadData(); }, [loadData]);

  // Submission Handler
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

      setTimeout(() => {
        setImagePreview(null);
        setImageFile(null);
        setApiResponse({ show: false, severity: 'info', title: '', message: '' });
        loadData();
      }, 4000);

    } catch (err) {
      const errorData = err?.response?.data;
      const status = err?.response?.status;
      let customMessage = errorData?.detail || "Face not recognized.";

      if (customMessage.toLowerCase().includes("no_stored_embeddings") || status === 400) {
        customMessage = "No face data found. Please ensure you have Enrolled your face first!";
      }

      setApiResponse({
        show: true,
        severity: 'warning',
        title: 'Match Failed',
        message: customMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout 
      title="Biometrics Portal"
      breadcrumbs={[{ label: 'Biometrics' }]}
      actions={
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadData}>
          Refresh
        </Button>
      }
    >
      {/* Header Section */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Logged in as: <strong>{role}</strong>
          </Typography>
        </Box>
        {activeTab === 0 && currentSession && (
          <Chip 
            label={`Active Session: ${currentSession.id}`} 
            color="success" 
            icon={<Timer />} 
            variant="outlined" 
          />
        )}
      </Stack>

      {/* Role-Based Tabs */}
      <Card sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => {
            setActiveTab(v);
            setApiResponse({ show: false });
            setImagePreview(null);
          }} 
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {showAttendanceCapture && <Tab label="Attendance" icon={<Fingerprint />} iconPosition="start" value={0} />}
          {showEnrollment && <Tab label="Enroll Face" icon={<PersonAdd />} iconPosition="start" value={1} />}
          {showProfileList && <Tab label="Enrolled Profiles" icon={<ListAlt />} iconPosition="start" value={2} />}
        </Tabs>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      )}

      {!loading && (
        <>
          {/* Capture View (Attendance / Enrollment) */}
          {(activeTab === 0 || activeTab === 1) && (
            <Grid container justifyContent="center">
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    {!imagePreview ? (
                      <Box sx={{ py: 6 }}>
                        <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: 'primary.light' }}>
                          <CameraAlt sx={{ fontSize: 40, color: 'primary.main' }} />
                        </Avatar>
                        <Typography variant="h6" gutterBottom>
                          {activeTab === 0 ? 'Check In with Face Recognition' : 'Enroll Your Face'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {activeTab === 0 
                            ? 'Scan your face to check in to the active session'
                            : 'Register your face for future attendance check-ins'}
                        </Typography>
                        <Button 
                          variant="contained" 
                          size="large" 
                          onClick={() => setCaptureDialogOpen(true)} 
                          startIcon={<CameraAlt />}
                          sx={{ px: 4 }}
                        >
                          Open Camera
                        </Button>
                      </Box>
                    ) : (
                      <Stack spacing={3} alignItems="center">
                        <Box sx={{ position: 'relative', width: '100%', maxWidth: 450, borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
                          <Box component="img" src={imagePreview} sx={{ width: '100%', display: 'block' }} />
                          
                          {apiResponse.show && (
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1, bgcolor: 'rgba(255,255,255,0.95)' }}>
                              <Alert severity={apiResponse.severity} variant="standard">
                                <AlertTitle sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{apiResponse.title}</AlertTitle>
                                <Typography variant="caption">{apiResponse.message}</Typography>
                              </Alert>
                            </Box>
                          )}
                        </Box>

                        <Stack direction="row" spacing={2} sx={{ width: '100%', maxWidth: 450 }}>
                          <Button 
                            fullWidth 
                            variant="outlined" 
                            onClick={() => { setImagePreview(null); setApiResponse({show: false}); }} 
                            disabled={submitting}
                          >
                            Re-take
                          </Button>
                          {!apiResponse.show && (
                            <Button 
                              fullWidth 
                              variant="contained" 
                              onClick={handleSubmit} 
                              disabled={submitting}
                              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <TaskAlt />}
                            >
                              {submitting ? 'Processing...' : `Submit ${activeTab === 0 ? 'Check-in' : 'Enrollment'}`}
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
                        <TableCell><strong>Enrolled Date</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>{p.employee_id || p.id}</TableCell>
                          <TableCell>{p.full_name || 'System User'}</TableCell>
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
        </>
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
    </DashboardLayout>
  );
};

export default Biometrics;
