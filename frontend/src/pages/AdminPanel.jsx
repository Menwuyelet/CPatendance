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
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Badge,
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
  TrendingDown,
  CalendarToday,
  Group,
  Work,
  Notifications,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';

/* ----------------------------- helpers ----------------------------- */
const extractArray = (res) =>
  Array.isArray(res) ? res : res?.results || res?.data || [];

const cardBaseStyle = {
  height: '100%',
  borderRadius: 2,
  boxShadow: 2,
  cursor: 'pointer',
  transition: '0.2s',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
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
    lateToday: 0,
    absentToday: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

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
          (a) => a.status === 'PRESENT'
        );
        const late = todayRecords.filter(
          (a) => a.status === 'LATE'
        );
        const absent = todayRecords.filter(
          (a) => a.status === 'ABSENT'
        );
        const leave = todayRecords.filter(
          (a) => a.status === 'ON_LEAVE'
        );

        // Generate recent activity
        const activity = [
          { text: `${present.length} employees checked in`, time: 'Just now', icon: <EventAvailable color="success" /> },
          { text: `${late.length} employees late`, time: 'Today', icon: <AccessTime color="warning" /> },
          { text: `${leave.length} leave requests`, time: 'Pending', icon: <WarningAmber color="error" /> },
        ];

        setStats({
          totalEmployees: employees.length,
          totalDepartments: departments.length,
          presentToday: present.length,
          lateToday: late.length,
          absentToday: absent.length,
          pendingApprovals: leave.length,
          attendanceRate: todayRecords.length
            ? Math.round((present.length / todayRecords.length) * 100)
            : 0,
          monthlyPayroll: null,
        });

        setRecentActivity(activity);
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
    { label: 'Departments', icon: <Business />, color: 'primary', path: '/departments', description: 'Manage company units' },
    { label: 'Add Employee', icon: <PersonAdd />, color: 'secondary', path: '/users', description: 'Register new staff' },
    { label: 'Attendance', icon: <Schedule />, color: 'info', path: '/attendance', description: 'View attendance records' },
    { label: 'Reports', icon: <Download />, color: 'success', path: '/reports', description: 'Generate reports' },
    { label: 'Shifts', icon: <CalendarToday />, color: 'warning', path: '/attendance/shifts', description: 'Manage work schedules' },
    { label: 'Biometrics', icon: <Group />, color: 'error', path: '/biometrics', description: 'Face recognition setup' },
  ];

  if (loading && !stats.totalEmployees) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  /* ------------------------- UI -------------------------- */
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
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

        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh data">
            <IconButton
              onClick={() => fetchDashboardData(true)}
              disabled={loading}
              sx={{ 
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate('/users')}
            startIcon={<PersonAdd />}
          >
            Add Employee
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Main Stats Grid */}
      <Grid container spacing={2} mb={3}>
        {/* Employees Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardBaseStyle}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Employees
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.totalEmployees}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Active workforce
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                  <People />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Present Today Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardBaseStyle}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Present Today
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {stats.presentToday}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label={`${stats.lateToday} Late`} size="small" color="warning" />
                    <Chip label={`${stats.absentToday} Absent`} size="small" color="error" />
                  </Stack>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                  <EventAvailable />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Rate Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardBaseStyle}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="column" spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Attendance Rate
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.attendanceRate}%
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                    <TrendingUp />
                  </Avatar>
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.attendanceRate} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Departments Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardBaseStyle}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Departments
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.totalDepartments}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Company units
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                  <Business />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Secondary Stats Grid */}
      <Grid container spacing={2} mb={3}>
        {/* Pending Approvals */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={cardBaseStyle}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Pending Approvals
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {stats.pendingApprovals}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Leave requests
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.light', width: 48, height: 48 }}>
                  <WarningAmber />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Payroll */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={cardBaseStyle}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Monthly Payroll
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.monthlyPayroll ? `$${stats.monthlyPayroll.toLocaleString()}` : 'N/A'}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip label="+8.5%" size="small" color="success" icon={<TrendingUp fontSize="small" />} />
                    <Typography variant="caption" color="text.secondary">
                      vs last month
                    </Typography>
                  </Stack>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                  <AccessTime />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ ...cardBaseStyle, height: 'auto' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Recent Activity
                </Typography>
                <IconButton size="small">
                  <Notifications fontSize="small" />
                </IconButton>
              </Stack>
              <List dense>
                {recentActivity.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {item.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.text}
                        secondary={item.time}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, mt: 2 }}>
        Quick Actions
      </Typography>

      <Grid container spacing={2} mb={3}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={action.label}>
            <Card
              sx={cardBaseStyle}
              onClick={() => navigate(action.path)}
            >
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Avatar
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    bgcolor: `${action.color}.light`,
                    mx: 'auto',
                    mb: 1
                  }}
                >
                  {React.cloneElement(action.icon, {
                    sx: { fontSize: 24, color: `${action.color}.main` },
                  })}
                </Avatar>
                <Typography variant="body2" fontWeight="medium">
                  {action.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer Status */}
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Stack direction="row" justifyContent="center" spacing={3} alignItems="center">
          <Typography color="success.main" fontWeight="medium" variant="body2">
            ✓ All systems operational
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Next refresh: Auto
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default AdminPanel;
