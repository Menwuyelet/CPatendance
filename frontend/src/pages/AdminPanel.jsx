// src/pages/AdminPanel.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  CircularProgress,
  Alert,
  Paper,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import {
  People,
  EventAvailable,
  AccessTime,
  WarningAmber,
  TrendingUp,
  Refresh,
  PersonAdd,
  Schedule,
  Download,
  Business,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';

/* ----------------------------- helpers ----------------------------- */
const extractArray = (res) =>
  Array.isArray(res) ? res : res?.results || res?.data || [];

const cardBaseStyle = {
  height: '100%',
  borderRadius: 3,
  boxShadow: 4,
  cursor: 'pointer',
  transition: '0.3s',
  '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
};

/* --------------------------- component ----------------------------- */
const AdminPanel = ({ onNotify }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastFetchRef = useRef(0);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    attendanceRate: 0,
    pendingApprovals: 0,
    totalDepartments: 0,
    monthlyPayroll: null,
  });

  const fetchDashboardData = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchRef.current < 3000) return;

      lastFetchRef.current = now;
      setLoading(true);
      setError('');

      try {
        const [employeesRes, attendanceRes, departmentsRes] =
          await Promise.all([
            api.get('/employees/employees/'),
            api.get('/attendance/attendance/'),
            api.getAllDepartments(),
          ]);

        const employees = extractArray(employeesRes);
        const attendance = extractArray(attendanceRes);
        const departments = extractArray(departmentsRes);

        const today = new Date().toISOString().slice(0, 10);
        const todayRecords = attendance.filter((a) => a.date === today);

        const present = todayRecords.filter(
          (a) => a.status === 'PRESENT' || a.status === 'LATE'
        );
        const leave = todayRecords.filter(
          (a) => a.status === 'ON_LEAVE'
        );

        setStats({
          totalEmployees: employees.length,
          totalDepartments: departments.length,
          presentToday: present.length,
          pendingApprovals: leave.length,
          attendanceRate: todayRecords.length
            ? Math.round((present.length / todayRecords.length) * 100)
            : 0,
          monthlyPayroll: null,
        });

        force && onNotify?.('Dashboard refreshed', 'success');
      } catch (err) {
        const msg =
          err?.message ||
          'Failed to load dashboard data. Please try again.';
        setError(msg);
        force && onNotify?.(msg, 'error');
      } finally {
        setLoading(false);
      }
    },
    [onNotify]
  );

  /* ------------------------- lifecycle -------------------------- */
  useEffect(() => {
    fetchDashboardData();

    const handleFocus = () => fetchDashboardData();
    const handleVisibility = () =>
      !document.hidden && fetchDashboardData();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [fetchDashboardData]);

  /* ------------------------- config -------------------------- */
  const quickActions = [
    { label: 'Departments', icon: <Business />, color: 'primary', path: '/departments' },
    { label: 'Add Employee', icon: <PersonAdd />, color: 'secondary', path: '/users' },
    { label: 'Attendance', icon: <Schedule />, color: 'info', path: '/attendance' },
    { label: 'Reports', icon: <Download />, color: 'success', path: '/reports' },
  ];

  if (loading && !stats.totalEmployees) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={64} />
        <Typography color="text.secondary">
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  /* ------------------------- UI -------------------------- */
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
        </Box>

        <Tooltip title="Refresh">
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
          >
            Refresh
          </Button>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Employees"
            value={stats.totalEmployees}
            icon={<People />}
            chip="Active"
            color="primary"
            onClick={() => navigate('/users')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={<EventAvailable />}
            progress={stats.attendanceRate}
            color="success"
            onClick={() => navigate('/attendance')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Departments"
            value={stats.totalDepartments}
            icon={<Business />}
            chip="Units"
            color="info"
            onClick={() => navigate('/departments')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Payroll"
            value={
              stats.monthlyPayroll
                ? `$${stats.monthlyPayroll.toLocaleString()}`
                : 'N/A'
            }
            icon={<AccessTime />}
            footer="+8.5% vs last month"
            color="warning"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <StatCard
            title="Pending"
            value={stats.pendingApprovals}
            icon={<WarningAmber />}
            footer="Leave requests"
            color="error"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Quick Actions
      </Typography>

      <Grid container spacing={3}>
        {quickActions.map((a) => (
          <Grid item xs={12} sm={6} md={3} key={a.label}>
            <Card
              sx={cardBaseStyle}
              onClick={() => navigate(a.path)}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    mx: 'auto',
                    mb: 2,
                    borderRadius: '50%',
                    bgcolor: `${a.color}.light`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {React.cloneElement(a.icon, {
                    sx: { fontSize: 30, color: `${a.color}.main` },
                  })}
                </Box>
                <Typography fontWeight="medium">{a.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      <Paper sx={{ mt: 5, p: 3, textAlign: 'center' }}>
        <Typography color="success.main" fontWeight="medium">
          ✓ All systems operational
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Last updated: {new Date().toLocaleString()}
        </Typography>
      </Paper>
    </Box>
  );
};

/* --------------------------- reusable card --------------------------- */
const StatCard = ({
  title,
  value,
  icon,
  color,
  chip,
  progress,
  footer,
  onClick,
}) => (
  <Card sx={cardBaseStyle} onClick={onClick}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>

          {chip && (
            <Chip
              label={chip}
              size="small"
              color={color}
              sx={{ mt: 1 }}
            />
          )}

          {progress !== undefined && (
            <Box mt={2}>
              <LinearProgress
                value={progress}
                variant="determinate"
              />
              <Typography variant="caption">
                {progress}% attendance
              </Typography>
            </Box>
          )}

          {footer && (
            <Typography
              variant="caption"
              color="success.main"
              mt={1}
              display="block"
            >
              {footer}
            </Typography>
          )}
        </Box>

        {React.cloneElement(icon, {
          sx: { fontSize: 56, color: `${color}.main`, opacity: 0.2 },
        })}
      </Stack>
    </CardContent>
  </Card>
);

export default AdminPanel;
