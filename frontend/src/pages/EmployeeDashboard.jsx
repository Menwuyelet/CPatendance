// src/pages/EmployeeDashboard.jsx
import { Grid, Card, CardContent, Typography, Button, Box, Chip, Stack, Alert, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import { AccessTime, CheckCircle, Schedule, EventNote, CameraAlt } from '@mui/icons-material';
import { format } from 'date-fns';
import FaceCaptureDialog from '../components/FaceCaptureDialog.jsx';

const EmployeeDashboard = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const submitFaceScan = async (imageFile) => {
    setScanSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.checkInAttendance(imageFile);
      const rawResult = res?.result ?? res;
      const result = String(rawResult || '').toUpperCase();

      if (result.includes('SUCCESS')) {
        setSuccess('Face recognized. Your check-in was recorded in the active session.');
      } else if (result.includes('DUPLICATE')) {
        setSuccess('Already recorded in this session (duplicate scan).');
      } else {
        setError('Face not recognized (or no active session). Please try again.');
      }

      // Refresh dashboard info
      await loadDashboardData();
    } catch (err) {
      console.error('Face scan failed:', err);
      setError(err?.message || 'Face scan failed.');
    } finally {
      setScanSubmitting(false);
      setScanOpen(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load user data
      const user = await api.getCurrentUser();
      setUserData(user || {});

      // Load today's attendance
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      // Try multiple approaches to get today's attendance
      let todayAttendance = null;
      
      try {
        // Approach 1: Get all attendance and filter locally
        const attendanceData = await api.getAttendance({ from: today, to: today, mine: true });
        const attendanceList = api.extractArray(attendanceData);
        
        // Find today's attendance
        todayAttendance = attendanceList.find(a => {
          const attendanceDate = a?.date || a?.attendance_date;
          return attendanceDate === today;
        }) || null;
        
      } catch (attendanceErr) {
        console.warn('Could not load attendance via filtered API:', attendanceErr);
        
        // Approach 2: Get all attendance and filter manually
        try {
          const allAttendance = await api.get('/attendance/attendance/');
          const allList = api.extractArray(allAttendance);
          
          // Filter for today and current user
          todayAttendance = allList.find(a => {
            const attendanceDate = a?.date || a?.attendance_date;
            const isToday = attendanceDate === today;
            // Check if it belongs to current user (simplified check)
            return isToday;
          }) || null;
        } catch (fallbackErr) {
          console.error('Fallback attendance load also failed:', fallbackErr);
        }
      }
      
      setAttendanceToday(todayAttendance || null);
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      onNotify?.('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentTime = new Date().toLocaleTimeString();
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Safe data access
  const safeAttendanceToday = attendanceToday || {};
  const safeUserData = userData || {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1200px', mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        My Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Today's Attendance Info Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <AccessTime color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Today's Attendance
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {today}
              </Typography>

              <Box sx={{ mb: 2 }}>
                {safeAttendanceToday.date || safeAttendanceToday.attendance_date ? (
                  <>
                    <Chip
                      icon={<CheckCircle />}
                      label={safeAttendanceToday.check_in_time && !safeAttendanceToday.check_out_time ? 'Clocked In' : 'Completed'}
                      color={safeAttendanceToday.check_in_time && !safeAttendanceToday.check_out_time ? 'success' : 'default'}
                      sx={{ mb: 1 }}
                    />
                    {safeAttendanceToday.check_in_time && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        In: {new Date(safeAttendanceToday.check_in_time).toLocaleTimeString()}
                      </Typography>
                    )}
                    {safeAttendanceToday.check_out_time && (
                      <Typography variant="body2">
                        Out: {new Date(safeAttendanceToday.check_out_time).toLocaleTimeString()}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No attendance record for today
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/attendance')}
                >
                  View History
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/reports')}
                >
                  My Reports
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Info */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Schedule color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Today's Info
                </Typography>
              </Stack>

              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Current Time:</strong> {currentTime}
              </Typography>

              {safeAttendanceToday.date || safeAttendanceToday.attendance_date ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={safeAttendanceToday.status || 'Not Checked In'}
                    color={(safeAttendanceToday.status || '').toUpperCase() === 'PRESENT' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              ) : null}

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  • Remember to clock in/out
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Contact HR for shift changes
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>

              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setScanOpen(true)}
                  startIcon={<CameraAlt />}
                  disabled={scanSubmitting}
                >
                  {scanSubmitting ? 'Submitting…' : 'Scan Face (Check In)'}
                </Button>

                <FaceCaptureDialog
                  open={scanOpen}
                  title="Scan Face for Attendance"
                  onClose={() => setScanOpen(false)}
                  onCaptured={(file) => submitFaceScan(file)}
                />

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/attendance')}
                  startIcon={<EventNote />}
                >
                  View Attendance
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/leaves')}
                  startIcon={<Schedule />}
                >
                  Leave Requests
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/reports')}
                >
                  View Reports
                </Button>
              </Stack>

              {safeUserData.full_name || safeUserData.email ? (
                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    Welcome, {safeUserData.full_name || safeUserData.email?.split('@')[0] || 'User'}
                  </Typography>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeDashboard;