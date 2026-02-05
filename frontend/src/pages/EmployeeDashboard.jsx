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
  Divider,
} from '@mui/material';
import {
  useState,
  useEffect,
  useContext,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import { ThemeContext } from '../index.jsx';
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
  const [currentTime, setCurrentTime] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const navigate = useNavigate();
  const { mode } = useContext(ThemeContext);

  // Apply theme class to body
  useEffect(() => {
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [mode]);

  useEffect(() => {
    // Initialize time on client-side only to avoid hydration mismatch
    setCurrentTime(new Date());
    loadDashboardData();
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  /* ----------------------------- helpers ----------------------------- */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const user = await api.getCurrentUser();
      setUserData(user || {});

      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all attendance and filter locally (backend doesn't support date range or mine filter)
      let todayAttendance = null;
      try {
        const fallback = await api.get('/attendance/attendance/');
        const list = api.extractArray(fallback);
        todayAttendance = list.find(
          (a) => (a?.date || a?.attendance_date) === today
        ) || null;
      } catch (e) {
        console.error('Failed to fetch attendance:', e);
        todayAttendance = null;
      }

      setAttendanceToday(todayAttendance);

      // Fetch sessions (both active and recent)
      setSessionsLoading(true);
      try {
        const sessionsData = await api.listAttendanceSessions().catch(() => []);
        const sessionsList = api.extractArray(sessionsData);
        
        // Find active session first
        const active = sessionsList.find((s) => s.is_active) || null;
        
        // If no active session, show the most recent one
        const recent = sessionsList.length > 0 ? sessionsList[0] : null;
        
        setActiveSession(active || recent);
        console.log('Active session:', active);
        console.log('Recent session:', recent);
        console.log('Total sessions:', sessionsList.length);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
        setActiveSession(null);
      } finally {
        setSessionsLoading(false);
      }
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

  // Calculate derived values safely
  const todayFormatted = currentTime ? format(currentTime, 'EEEE, MMMM d, yyyy') : 'Loading...';
  const timeString = currentTime ? currentTime.toLocaleTimeString() : 'Loading...';
  const attendance = attendanceToday || {};
  const user = userData || {};
  
  // Get greeting based on time
  const hour = currentTime?.getHours() ?? 12;
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  
  // Get user display name
  const userName = user.full_name || user.email?.split('@')[0] || 'User';

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
      {/* Header with Greeting */}
      <Box className="dashboard-header">
        <Typography variant="h5" className="dashboard-title">
          {greeting}, {userName}! 👋
        </Typography>
        <Typography className="dashboard-date">
          {todayFormatted} | {timeString}
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert 
          severity="error" 
          className="dashboard-alert dashboard-alert-error"
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert 
          severity="success" 
          className="dashboard-alert dashboard-alert-success"
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* Refresh Button */}
      <Box className="action-buttons-row" sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          disabled={loading}
          className="btn-refresh"
        >
          Refresh
        </Button>
      </Box>

      {/* Cards Container */}
      <Box className="dashboard-grid dashboard-grid-3">
        {/* ---------------- Active Session Card ---------------- */}
        <Card className="dashboard-card card-hover" sx={{ borderColor: activeSession ? 'success.main' : 'grey.300', borderWidth: activeSession ? 2 : 1 }}>
          <CardContent className="dashboard-card-content">
            <Box className="card-header">
              <Box className="card-icon" sx={{ bgcolor: activeSession ? 'success.light' : 'grey.200' }}>
                <EventNote sx={{ color: activeSession ? 'success.dark' : 'grey.500' }} />
              </Box>
              <Typography className="card-title">
                Active Session
              </Typography>
            </Box>

            {sessionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : activeSession ? (
              <>
                <Chip
                  icon={<CheckCircle />}
                  label={activeSession.is_active ? 'Session Active' : 'Recent Session'}
                  color={activeSession.is_active ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                />
                <Typography className="card-date">
                  Shift: {activeSession.shift?.name || 'Unknown'}
                </Typography>
                <Typography className="card-date">
                  Started: {activeSession.started_at ? new Date(activeSession.started_at).toLocaleString() : '-'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                  Started by: {activeSession.started_by?.full_name || activeSession.started_by?.email || 'Unknown'}
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/attendance')}
                  className="action-button"
                  sx={{ mt: 2 }}
                >
                  View Attendance
                </Button>
              </>
            ) : (
              <>
                <Chip
                  label="No Sessions"
                  color="default"
                  size="small"
                  sx={{ mt: 2, mb: 1 }}
                />
                <Typography className="card-date">
                  No attendance sessions found
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                  Sessions will appear here when created
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        {/* ---------------- Attendance Card ---------------- */}
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
                  className="status-badge status-badge-present"
                  sx={{ mb: 2 }}
                />

                {/* Times */}
                <Box className="attendance-times">
                  {attendance.check_in_time && (
                    <Box className="attendance-time">
                      <Typography className="time-value">
                        {new Date(attendance.check_in_time).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  )}
                  {attendance.check_out_time && (
                    <Box className="attendance-time">
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
            <Box className="action-buttons-row">
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => navigate('/attendance')}
                className="action-button"
              >
                History
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => navigate('/reports')}
                className="action-button"
              >
                Reports
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* ---------------- Today Info Card ---------------- */}
        <Card className="dashboard-card card-hover">
          <CardContent className="dashboard-card-content">
            {/* Card Header */}
            <Box className="card-header">
              <Box className="card-icon">
                <Schedule />
              </Box>
              <Typography className="card-title">
                Today Overview
              </Typography>
            </Box>

            {/* Real-time Clock */}
            <Typography className="time-display">
              <strong>🕐 {timeString}</strong>
            </Typography>

            {/* Status Badge */}
            {attendance?.status && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Chip
                  label={attendance.status}
                  size="small"
                  className={getStatusBadgeClass(attendance.status)}
                  sx={{ fontSize: '0.9rem', padding: '8px 16px' }}
                />
              </Box>
            )}

            {/* Quick Stats */}
            <Box className="card-stats" sx={{ mt: 3 }}>
              <Box className="card-stat">
                <Typography className="stat-label">Clock In</Typography>
                <Typography className="stat-value clock-time">
                  {attendance?.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString() : '--:--'}
                </Typography>
              </Box>
              <Box className="card-stat">
                <Typography className="stat-label">Clock Out</Typography>
                <Typography className="stat-value clock-time">
                  {attendance?.check_out_time ? new Date(attendance.check_out_time).toLocaleTimeString() : '--:--'}
                </Typography>
              </Box>
              <Box className="card-stat">
                <Typography className="stat-label">Hours Worked</Typography>
                <Typography className="stat-value hours-worked">
                  {attendance?.check_in_time && attendance?.check_out_time
                    ? (() => {
                        const diff = new Date(attendance.check_out_time) - new Date(attendance.check_in_time);
                        const hours = Math.floor(diff / 3600000);
                        const mins = Math.floor((diff % 3600000) / 60000);
                        return `${hours}h ${mins}m`;
                      })()
                    : attendance?.check_in_time ? 'In Progress' : '--:--'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* ---------------- Quick Actions Card ---------------- */}
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
                className="action-button"
              >
                Attendance
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/reports')}
                className="action-button"
              >
                Reports
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/settings')}
                className="action-button"
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
  );
};

export default EmployeeDashboard;

