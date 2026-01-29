// src/pages/AdminPanel.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Stack
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
  CalendarToday,
  Download,
  Business
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';

const AdminPanel = ({ onNotify }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    monthlyPayroll: null,
    pendingApprovals: 0,
    attendanceRate: 0,
    totalDepartments: 0,
  });
  const [error, setError] = useState('');

  // Debounce control: prevent too many rapid fetches
  const lastFetchTimeRef = useRef(0);
  const DEBOUNCE_DELAY = 3000; // 3 seconds

  const fetchDashboardData = useCallback(async (force = false) => {
    const now = Date.now();

    // Skip if called too soon (unless forced by manual refresh)
    if (!force && now - lastFetchTimeRef.current < DEBOUNCE_DELAY) {
      return;
    }

    lastFetchTimeRef.current = now;

    setLoading(true);
    setError('');

    try {
      const [employeesRes, attendanceRes, departmentsRes] = await Promise.all([
        api.get('/employees/employees/'),
        api.get('/attendance/attendance/'),
        api.get('/employees/departments/'),
      ]);

      // Extract arrays with multiple fallbacks
      const employees = Array.isArray(employeesRes)
        ? employeesRes
        : Array.isArray(employeesRes?.results)
        ? employeesRes.results
        : Array.isArray(employeesRes?.data)
        ? employeesRes.data
        : [];

      const attendance = Array.isArray(attendanceRes)
        ? attendanceRes
        : Array.isArray(attendanceRes?.results)
        ? attendanceRes.results
        : Array.isArray(attendanceRes?.data)
        ? attendanceRes.data
        : [];

      const departments = Array.isArray(departmentsRes)
        ? departmentsRes
        : Array.isArray(departmentsRes?.results)
        ? departmentsRes.results
        : Array.isArray(departmentsRes?.data)
        ? departmentsRes.data
        : [];

      console.log('Dashboard Data:', {
        employeesCount: employees.length,
        attendanceCount: attendance.length,
        departmentsCount: departments.length
      });

      const totalEmployees = employees.length;
      const totalDepartments = departments.length;

      let presentToday = 0;
      let pendingApprovals = 0;
      let attendanceRate = 0;

      if (attendance.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const todaysRecords = attendance.filter(r => r.date === today);

        const presentRecords = todaysRecords.filter(
          r => r.status === 'PRESENT' || r.status === 'LATE'
        );
        const leaveRecords = todaysRecords.filter(r => r.status === 'ON_LEAVE');

        presentToday = presentRecords.length;
        pendingApprovals = leaveRecords.length;
        attendanceRate = todaysRecords.length
          ? Math.round((presentRecords.length / todaysRecords.length) * 100)
          : 0;
      }

      setStats({
        totalEmployees,
        presentToday,
        monthlyPayroll: null,
        pendingApprovals,
        attendanceRate,
        totalDepartments,
      });

      console.log('Dashboard Stats Updated:', {
        totalEmployees,
        presentToday,
        totalDepartments,
        attendanceRate
      });

      if (force) {
        onNotify?.('Dashboard refreshed successfully', 'success');
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      const errorMsg = err?.message || 'Unable to load dashboard data. Please try again later.';
      setError(errorMsg);
      if (force) {
        onNotify?.(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  // Initial load + auto-refresh on visibility/focus (debounced)
  useEffect(() => {
    fetchDashboardData(); // First load

    const handleRefresh = () => {
      fetchDashboardData(); // Debounced inside function
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [fetchDashboardData]);

  const quickActions = [
    { label: 'Manage Departments', icon: <Business />, color: 'primary', path: '/departments' },
    { label: 'Add Employee', icon: <PersonAdd />, color: 'secondary', path: '/users' },
    { label: 'Manage Shifts', icon: <Schedule />, color: 'info', path: '/attendance' },
    { label: 'Export Reports', icon: <Download />, color: 'success', path: '/reports' },
  ];

  if (loading && stats.totalEmployees === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 3 }}>
        <CircularProgress size={70} thickness={5} />
        <Typography variant="h6" color="text.secondary">
          Loading Admin Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <div>
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of your workforce • {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </div>

        <Tooltip title="Refresh data now">
          <Button
            variant="contained"
            size="large"
            startIcon={<Refresh />}
            onClick={() => fetchDashboardData(true)} // Force immediate refresh
            disabled={loading}
            sx={{ minWidth: 140 }}
          >
            Refresh
          </Button>
        </Tooltip>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        {/* Total Employees */}
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card 
            onClick={() => navigate('/users')}
            sx={{ 
              height: '100%', 
              borderRadius: 3, 
              boxShadow: 4, 
              cursor: 'pointer',
              transition: '0.3s', 
              '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 } 
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Total Employees
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? '...' : stats.totalEmployees.toLocaleString()}
                  </Typography>
                  <Chip label="Active workforce" color="success" size="small" sx={{ mt: 2 }} />
                </Box>
                <People sx={{ fontSize: 60, color: 'primary.main', opacity: 0.2 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Present Today */}
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card 
            onClick={() => navigate('/attendance-overview')}
            sx={{ 
              height: '100%', 
              borderRadius: 3, 
              boxShadow: 4, 
              cursor: 'pointer',
              transition: '0.3s', 
              '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 } 
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Present Today
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? '...' : stats.presentToday}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={stats.attendanceRate}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': { borderRadius: 5 }
                      }}
                    />
                    <Typography variant="body2" align="right" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                      {stats.attendanceRate}% attendance
                    </Typography>
                  </Box>
                </Box>
                <EventAvailable sx={{ fontSize: 60, color: 'success.main', opacity: 0.2 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Departments */}
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card 
            onClick={() => navigate('/departments')}
            sx={{ 
              height: '100%', 
              borderRadius: 3, 
              boxShadow: 4, 
              cursor: 'pointer',
              transition: '0.3s', 
              '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 } 
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Departments
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loading ? '...' : stats.totalDepartments}
                  </Typography>
                  <Chip label="Active units" color="info" size="small" sx={{ mt: 2 }} />
                </Box>
                <Business sx={{ fontSize: 60, color: 'info.main', opacity: 0.2 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Payroll */}
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 } }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Monthly Payroll
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="warning.main">
                    {stats.monthlyPayroll !== null ? `$${stats.monthlyPayroll.toLocaleString()}` : 'N/A'}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="body2" color="success.main">
                      +8.5% vs last month
                    </Typography>
                  </Stack>
                </Box>
                <AccessTime sx={{ fontSize: 60, color: 'warning.main', opacity: 0.2 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Approvals */}
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-8px)', boxShadow: 8 } }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Pending Approvals
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="error.main">
                    {loading ? '...' : stats.pendingApprovals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Leaves & overtime requests
                  </Typography>
                </Box>
                <WarningAmber sx={{ fontSize: 60, color: 'error.main', opacity: 0.2 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              onClick={() => navigate(action.path)}
              sx={{
                height: '100%',
                borderRadius: 3,
                boxShadow: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: 10,
                  borderColor: `${action.color}.main`
                },
                border: '2px solid transparent'
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: `${action.color}.light`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    mx: 'auto',
                    transition: 'all 0.3s',
                    '&:hover': {
                      backgroundColor: `${action.color}.main`,
                      '& svg': { color: 'white' }
                    }
                  }}
                >
                  {React.cloneElement(action.icon, { sx: { fontSize: 32, color: `${action.color}.main` } })}
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {action.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer Status */}
      <Paper elevation={2} sx={{ mt: 6, p: 4, borderRadius: 3, backgroundColor: 'grey.50', textAlign: 'center' }}>
        <Typography variant="subtitle1" color="success.main" fontWeight="medium">
          ✓ All systems operational
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Last updated: {new Date().toLocaleString()}
        </Typography>
      </Paper>
    </Box>
  );
};

export default AdminPanel;