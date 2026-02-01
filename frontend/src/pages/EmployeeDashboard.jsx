import {
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
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import '../styles/employee-dashboard.css';

const EmployeeDashboard = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  /* ----------------------------- loading ----------------------------- */
  if (loading) {
    return (
      <Box className="employee-dashboard-container">
        <Box className="dashboard-loading">
          <CircularProgress size={48} />
        </Box>
      </Box>
    );
  }

  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');
  const currentTime = new Date().toLocaleTimeString();
  const attendance = attendanceToday || {};
  const user = userData || {};

  const getStatusBadgeClass = (status) => {
    if (!status) return '';
    const s = status.toUpperCase();
    if (s === 'PRESENT') return 'status-badge-present';
    if (s === 'ABSENT') return 'status-badge-absent';
    if (s === 'LATE') return 'status-badge-late';
    return '';
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <Box className="employee-dashboard-container">
      {/* Header */}
      <Box className="dashboard-header">
        <Typography variant="h5" className="dashboard-title">
          My Dashboard
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* Refresh Button */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Cards Container */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 2,
        mb: 3
      }}>
        {/* ---------------- Attendance Card ---------------- */}
        <Box sx={{ flex: '1 1 300px', minWidth: 280 }}>
          <Card className="dashboard-card card-hover">
            <CardContent className="dashboard-card-content">
              {/* Card Header */}
              <Box className="card-header">
                <Box className="card-icon">
                  <AccessTime />
                </Box>
                <Typography className="card-title">
                  Today's Attendance
                </Typography>
              </Box>

              {/* Date */}
              <Typography className="card-date">
                {todayFormatted}
              </Typography>

              {/* Status */}
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
                    sx={{ mb: 2 }}
                  />

                  {/* Times */}
                  <Box className="attendance-times">
                    {attendance.check_in_time && (
                      <Box className="attendance-time">
                        <Typography className="time-label">Check In</Typography>
                        <Typography className="time-value">
                          {new Date(attendance.check_in_time).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    )}
                    {attendance.check_out_time && (
                      <Box className="attendance-time">
                        <Typography className="time-label">Check Out</Typography>
                        <Typography className="time-value">
                          {new Date(attendance.check_out_time).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </>
              ) : (
                <Typography className="card-date">
                  No attendance record for today
                </Typography>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => navigate('/attendance')}
                  sx={{ flex: 1 }}
                >
                  History
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => navigate('/reports')}
                  sx={{ flex: 1 }}
                >
                  Reports
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ---------------- Today Info Card ---------------- */}
        <Box sx={{ flex: '1 1 300px', minWidth: 280 }}>
          <Card className="dashboard-card card-hover">
            <CardContent className="dashboard-card-content">
              {/* Card Header */}
              <Box className="card-header">
                <Box className="card-icon">
                  <Schedule />
                </Box>
                <Typography className="card-title">
                  Today's Info
                </Typography>
              </Box>

              {/* Current Time */}
              <Typography className="time-display">
                <strong>Current Time:</strong> {currentTime}
              </Typography>

              {/* Status Badge */}
              {attendance?.status && (
                <Chip
                  label={attendance.status}
                  size="small"
                  className={getStatusBadgeClass(attendance.status)}
                  sx={{ mt: 2 }}
                />
              )}

              {/* Tips */}
              <Box className="tips-section">
                <Typography className="tip-item">
                  Remember to clock in/out
                </Typography>
                <Typography className="tip-item">
                  Contact HR for changes
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ---------------- Quick Actions Card ---------------- */}
        <Box sx={{ flex: '1 1 300px', minWidth: 280 }}>
          <Card className="dashboard-card card-hover">
            <CardContent className="dashboard-card-content">
              {/* Card Header */}
              <Box className="card-header">
                <Box className="card-icon">
                  <EventNote />
                </Box>
                <Typography className="card-title">
                  Quick Actions
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Box className="quick-actions">
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

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/settings')}
                >
                  Settings
                </Button>
              </Box>

              {/* Welcome Message */}
              {(user.full_name || user.email) && (
                <Box className="welcome-section">
                  <Typography className="welcome-text">
                    Welcome,{' '}
                    <span className="welcome-name">
                      {user.full_name ||
                        user.email?.split('@')[0] ||
                        'User'}
                    </span>
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default EmployeeDashboard;
