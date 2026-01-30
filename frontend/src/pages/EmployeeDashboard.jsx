import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import {
  AccessTime,
  CheckCircle,
  Schedule,
  EventNote,
  CameraAlt,
} from '@mui/icons-material';
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

  /* ----------------------------- helpers ----------------------------- */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const user = await api.getCurrentUser();
      setUserData(user || {});

      const today = new Date().toISOString().split('T')[0];
      let todayAttendance = null;

      try {
        const res = await api.getAttendance({ from: today, to: today, mine: true });
        const list = api.extractArray(res);
        todayAttendance =
          list.find(
            (a) =>
              (a?.date || a?.attendance_date) === today
          ) || null;
      } catch {
        const fallback = await api.get('/attendance/attendance/');
        const list = api.extractArray(fallback);
        todayAttendance =
          list.find(
            (a) =>
              (a?.date || a?.attendance_date) === today
          ) || null;
      }

      setAttendanceToday(todayAttendance);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
      onNotify?.('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitFaceScan = async (imageFile) => {
    setScanSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.checkInAttendance(imageFile);
      const result = String(res?.result ?? res ?? '').toUpperCase();

      if (result.includes('SUCCESS')) {
        setSuccess('Face recognized. Check-in recorded.');
      } else if (result.includes('DUPLICATE')) {
        setSuccess('Already checked in for this session.');
      } else {
        setError('Face not recognized. Try again.');
      }

      await loadDashboardData();
    } catch (err) {
      setError(err?.message || 'Face scan failed.');
    } finally {
      setScanSubmitting(false);
      setScanOpen(false);
    }
  };

  /* ----------------------------- loading ----------------------------- */
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');
  const currentTime = new Date().toLocaleTimeString();
  const attendance = attendanceToday || {};
  const user = userData || {};

  /* ------------------------------ UI ------------------------------ */
  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 1.5, sm: 2, md: 3 },
        py: 2,
        overflowX: 'hidden', // 🔥 prevents right-side scroll
      }}
    >
      <Typography variant="h5" fontWeight="bold" mb={2}>
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

      <Grid
        container
        spacing={2}
        sx={{
          width: '100%',
          m: 0,
        }}
      >
        {/* ---------------- Attendance Card ---------------- */}
        <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%', width: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <AccessTime color="primary" />
                <Typography fontWeight="bold">Today's Attendance</Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" mb={2}>
                {todayFormatted}
              </Typography>

              {attendance?.date || attendance?.attendance_date ? (
                <>
                  <Chip
                    icon={<CheckCircle />}
                    label={
                      attendance.check_in_time && !attendance.check_out_time
                        ? 'Clocked In'
                        : 'Completed'
                    }
                    color="success"
                    size="small"
                    sx={{ mb: 1 }}
                  />

                  {attendance.check_in_time && (
                    <Typography variant="body2">
                      In:{' '}
                      {new Date(attendance.check_in_time).toLocaleTimeString()}
                    </Typography>
                  )}
                  {attendance.check_out_time && (
                    <Typography variant="body2">
                      Out:{' '}
                      {new Date(attendance.check_out_time).toLocaleTimeString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No attendance record for today
                </Typography>
              )}

              <Stack direction="row" spacing={1} mt={2}>
                <Button fullWidth size="small" onClick={() => navigate('/attendance')}>
                  History
                </Button>
                <Button fullWidth size="small" onClick={() => navigate('/reports')}>
                  Reports
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ---------------- Today Info ---------------- */}
        <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%', width: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Schedule color="primary" />
                <Typography fontWeight="bold">Today's Info</Typography>
              </Stack>

              <Typography variant="body2">
                <strong>Current Time:</strong> {currentTime}
              </Typography>

              {attendance?.status && (
                <Chip
                  label={attendance.status}
                  size="small"
                  sx={{ mt: 2 }}
                  color={
                    attendance.status === 'PRESENT' ? 'success' : 'default'
                  }
                />
              )}

              <Box mt={3}>
                <Typography variant="body2" color="text.secondary">
                  • Remember to clock in/out
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Contact HR for changes
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ---------------- Quick Actions ---------------- */}
        <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%', width: '100%' }}>
            <CardContent>
              <Typography fontWeight="bold" mb={2}>
                Quick Actions
              </Typography>

              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CameraAlt />}
                  disabled={scanSubmitting}
                  onClick={() => setScanOpen(true)}
                >
                  {scanSubmitting ? 'Submitting…' : 'Scan Face (Check In)'}
                </Button>

                <FaceCaptureDialog
                  open={scanOpen}
                  title="Scan Face for Attendance"
                  onClose={() => setScanOpen(false)}
                  onCaptured={submitFaceScan}
                />

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EventNote />}
                  onClick={() => navigate('/attendance')}
                >
                  Attendance
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Schedule />}
                  onClick={() => navigate('/leaves')}
                >
                  Leave Requests
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/reports')}
                >
                  Reports
                </Button>
              </Stack>

              {(user.full_name || user.email) && (
                <Box mt={3} pt={2} borderTop={1} borderColor="divider">
                  <Typography variant="body2" color="text.secondary">
                    Welcome,{' '}
                    {user.full_name ||
                      user.email?.split('@')[0] ||
                      'User'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeDashboard;
