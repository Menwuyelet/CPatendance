import { Grid, Card, CardContent, Typography, Button, Box, Chip, Stack, Alert, CircularProgress, LinearProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import { AccessTime, CheckCircle, Schedule, EventNote } from '@mui/icons-material';
import { format } from 'date-fns';

const EmployeeDashboard = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load user data
      const user = await api.get('/accounts/users/me/');
      setUserData(user);

      // Load today's attendance
      const today = new Date().toISOString().slice(0, 10);
      const attendance = await api.get(`/attendance/attendance/?date=${today}`);
      const todayAttendance = Array.isArray(attendance) ? attendance.find(a => a.date === today) : null;
      
      if (todayAttendance) {
        setAttendanceToday(todayAttendance);
        // Check if clocked in (has check_in_time but no check_out_time)
        setClockedIn(!!todayAttendance.check_in_time && !todayAttendance.check_out_time);
      } else {
        setClockedIn(false);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
      onNotify?.('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockToggle = async () => {
    try {
      setError('');
      setSuccess('');

      if (clockedIn) {
        // Clock Out - Update the attendance record using its ID
        if (!attendanceToday?.id) {
          // Get today's attendance record first
          const today = new Date().toISOString().slice(0, 10);
          const attendance = await api.get(`/attendance/attendance/?date=${today}`);
          const todayRecord = Array.isArray(attendance) ? attendance.find(a => a.date === today) : null;
          
          if (!todayRecord?.id) {
            throw new Error('No attendance record found to check out');
          }
          
          await api.put(`/attendance/attendance/${todayRecord.id}/`, {});
        } else {
          await api.put(`/attendance/attendance/${attendanceToday.id}/`, {});
        }
        setClockedIn(false);
        setSuccess('Clocked out successfully!');
        onNotify?.('Clocked out successfully!', 'success');
      } else {
        // Clock In - Create new attendance record
        const newAttendance = await api.post('/attendance/attendance/', {});
        setAttendanceToday(newAttendance);
        setClockedIn(true);
        setSuccess('Clocked in successfully!');
        onNotify?.('Clocked in successfully!', 'success');
      }
      
      // Reload data to get updated times
      await loadDashboardData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Clock action failed:', error);
      const message = error.message || 'Failed to clock in/out. Please try again.';
      setError(message);
      onNotify?.(message, 'error');
      setTimeout(() => setError(''), 5000);
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
        {/* Clock In/Out Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <AccessTime color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Attendance
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {today}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={clockedIn ? <CheckCircle /> : <EventNote />}
                  label={clockedIn ? 'Clocked In' : 'Not Clocked In'}
                  color={clockedIn ? 'success' : 'default'}
                  sx={{ mb: 1 }}
                />
                {attendanceToday?.check_in_time && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    In: {new Date(attendanceToday.check_in_time).toLocaleTimeString()}
                  </Typography>
                )}
                {attendanceToday?.check_out_time && (
                  <Typography variant="body2">
                    Out: {new Date(attendanceToday.check_out_time).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                color={clockedIn ? 'error' : 'success'}
                fullWidth
                onClick={handleClockToggle}
                size="large"
                sx={{ mb: 2 }}
              >
                {clockedIn ? 'Clock Out' : 'Clock In'}
              </Button>

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

              {attendanceToday && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={attendanceToday.status || 'Present'}
                    color={attendanceToday.status === 'PRESENT' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              )}

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

              {userData?.full_name && (
                <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    Welcome, {userData.full_name}
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
