// src/pages/HRDashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  Divider,
  Avatar,
  Chip,
  LinearProgress,
  Skeleton,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Dashboard,
  People,
  EventNote,
  CalendarToday,
  Assessment,
  Cake,
  Work,
  NotificationImportant,
  HowToReg,
  AccessTime,
  CheckCircle,
  PersonAdd,
  Warning,
  TrendingDown,
  TrendingUp,
  Download,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import { format, startOfMonth, endOfMonth, addDays, subDays, isWithinInterval } from 'date-fns';

const HRDashboard = ({ onNotify }) => {
  const navigate = useNavigate();

  // Real data states
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    activeToday: 0,
    pendingLeaves: 0,
    newThisMonth: 0,
    absenteeismRate: 0,
    lateArrivals: 0,
    overtimeWarnings: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [complianceAlerts, setComplianceAlerts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Clock-in state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [userEmployeeId, setUserEmployeeId] = useState(null);

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        setLoading(true);
        setError('');

        // Use real Django endpoints only:
        // - /api/employees/employees/
        // - /api/attendance/attendance/
        // - /api/employees/departments/
        const [employeesRes, attendanceRes, departmentsRes] = await Promise.all([
          api.get('/employees/employees/').catch(() => []),
          api.get('/attendance/attendance/').catch(() => []),
          api.get('/employees/departments/').catch(() => []),
        ]);

        const employees = Array.isArray(employeesRes) ? employeesRes : employeesRes?.data || [];
        const attendance = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.data || [];
        const departmentsList = Array.isArray(departmentsRes) ? departmentsRes : departmentsRes?.data || [];

        setDepartments(departmentsList);

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter((emp) => emp.is_active !== false).length;

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRecords = attendance.filter((r) => r.date === todayStr);
        const activeToday = todayRecords.filter((r) => {
          const status = (r.status || '').toUpperCase();
          return status === 'PRESENT' || status === 'LATE';
        }).length;

        const lateArrivals = todayRecords.filter((r) => {
          return (r.status || '').toUpperCase() === 'LATE';
        }).length;

        const pendingLeavesCount = todayRecords.filter(
          (r) => (r.status || '').toUpperCase() === 'ON_LEAVE',
        ).length;

        // Calculate absenteeism rate (employees not present today / total employees)
        const absentToday = totalEmployees - activeToday;
        const absenteeismRate = totalEmployees > 0 
          ? Math.round((absentToday / totalEmployees) * 100) 
          : 0;

        // Calculate overtime warnings (check if any employees have excessive hours)
        const overtimeWarnings = 0; // Can be enhanced with actual overtime calculation

        const thisMonthStart = startOfMonth(new Date());
        const thisMonthEnd = endOfMonth(new Date());
        const newThisMonth = employees.filter((emp) => {
          const createdAt = emp.created_at ? new Date(emp.created_at) : null;
          return createdAt && createdAt >= thisMonthStart && createdAt <= thisMonthEnd;
        }).length;

        setStats({
          totalEmployees,
          activeEmployees,
          activeToday,
          pendingLeaves: pendingLeavesCount,
          newThisMonth,
          absenteeismRate,
          lateArrivals,
          overtimeWarnings,
        });

        // Generate recent activity from actual data
        const activity = [];
        if (newThisMonth > 0) {
          activity.push({
            type: 'new_employee',
            message: `${newThisMonth} new employee(s) joined this month`,
            timestamp: format(new Date(), 'MMM dd, yyyy'),
          });
        }
        if (lateArrivals > 0) {
          activity.push({
            type: 'late_clockin',
            message: `${lateArrivals} late arrival(s) today`,
            timestamp: format(new Date(), 'MMM dd, yyyy'),
          });
        }
        if (pendingLeavesCount > 0) {
          activity.push({
            type: 'leave_approved',
            message: `${pendingLeavesCount} pending leave request(s)`,
            timestamp: format(new Date(), 'MMM dd, yyyy'),
          });
        }
        setRecentActivity(activity.slice(0, 8));

        // Generate compliance alerts
        const alerts = [];
        if (absenteeismRate > 20) {
          alerts.push({
            severity: 'warning',
            message: `High absenteeism rate: ${absenteeismRate}% of employees absent today`,
            icon: <Warning />,
          });
        }
        if (lateArrivals > 5) {
          alerts.push({
            severity: 'warning',
            message: `${lateArrivals} late arrivals detected today - Review attendance patterns`,
            icon: <AccessTime />,
          });
        }
        if (pendingLeavesCount > 10) {
          alerts.push({
            severity: 'info',
            message: `${pendingLeavesCount} leave requests pending approval`,
            icon: <CalendarToday />,
          });
        }
        setComplianceAlerts(alerts);
        setUpcomingEvents([]);
      } catch (err) {
        console.error('Failed to load HR dashboard data:', err);
        setError('Unable to load dashboard data. Please try again later.');
        onNotify?.('Failed to load HR dashboard data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
    
    // Load clock-in state and active session
    loadClockInState();
  }, []);
  
  const loadClockInState = async () => {
    try {
      // Get current user and employee ID
      const user = await api.getCurrentUser();
      if (user?.employee?.id) {
        setUserEmployeeId(user.employee.id);
      }
      
      // Check active sessions
      const sessions = await api.listAttendanceSessions({ active: 'true' });
      const activeSessions = Array.isArray(sessions) ? sessions.filter(s => s.is_active) : [];
      
      if (activeSessions.length > 0) {
        // Check if user's employee has a shift assigned to any active session's shift
        const userShifts = await api.listEmployeeShifts(user?.employee?.id);
        const userShiftsList = Array.isArray(userShifts) ? userShifts : [];
        const userShiftIds = userShiftsList.map(us => us.shift?.id);
        
        const belongsToSession = activeSessions.some(session => 
          userShiftIds.includes(session.shift?.id)
        );
        
        if (belongsToSession) {
          setActiveSession(activeSessions[0]);
        }
      }
      
      // Check if already clocked in today
      const today = new Date().toISOString().slice(0, 10);
      const attendance = await api.get(`/attendance/attendance/?date=${today}`);
      const todayRecords = Array.isArray(attendance) ? attendance : [];
      const userRecord = todayRecords.find(r => r.employee?.id === user?.employee?.id);
      if (userRecord && userRecord.check_in_time && !userRecord.check_out_time) {
        setIsClockedIn(true);
        if (userRecord.check_in_time) {
          setLastActionTime(new Date(userRecord.check_in_time).toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error('Failed to load clock-in state:', err);
    }
  };
  
  const handleClockToggle = async () => {
    const action = isClockedIn ? 'out' : 'in';
    const now = new Date().toLocaleTimeString();
    
    try {
      if (!isClockedIn) {
        // Check if there's an active session and user belongs to it
        if (!activeSession) {
          onNotify?.('No active attendance session available or you are not assigned to any active session.', 'error');
          return;
        }
        
        // Use attendance-check-in endpoint
        await api.checkInAttendance();
        setIsClockedIn(true);
        setLastActionTime(now);
        onNotify?.(`Successfully clocked ${action}.`, 'success');
      } else {
        // Clock out - update the attendance record
        const today = new Date().toISOString().slice(0, 10);
        const records = await api.get(`/attendance/attendance/?date=${today}`);
        const todayRecords = Array.isArray(records) ? records : [];
        const user = await api.getCurrentUser();
        const activeRecord = todayRecords.find(
          (r) => r.employee?.id === user?.employee?.id && r.check_in_time && !r.check_out_time
        );

        if (activeRecord && activeRecord.id) {
          await api.put(`/attendance/attendance/${activeRecord.id}/`, {
            check_out_time: new Date().toISOString(),
          });
          setIsClockedIn(false);
          setLastActionTime(now);
          onNotify?.(`Successfully clocked ${action}.`, 'success');
        } else {
          throw new Error('No active attendance record found');
        }
      }
      
      // Reload state
      await loadClockInState();
    } catch (err) {
      console.error('Clock action failed:', err);
      onNotify?.(`Failed to clock ${action}. ${err.message || 'Please try again.'}`, 'error');
    }
  };

  const features = [
    {
      title: 'Employees',
      description: 'Onboarding, profiles, roles, departments & access control',
      icon: <People />,
      action: () => navigate('/employees'),
      buttonText: 'Manage Employees',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      badge: stats.newThisMonth > 0 ? stats.newThisMonth : null,
      badgeColor: 'primary',
    },
    {
      title: 'Attendance',
      description: 'Real-time tracking, shifts, overtime, and compliance',
      icon: <EventNote />,
      action: () => navigate('/attendance'),
      buttonText: 'View Attendance',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      progress: stats.totalEmployees > 0 
        ? Math.round((stats.activeToday / stats.totalEmployees) * 100) 
        : 0,
    },
    {
      title: 'Reports & Analytics',
      description: 'Turnover, diversity, performance, and compliance insights',
      icon: <Assessment />,
      action: () => navigate('/reports'),
      buttonText: 'Generate Reports',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'new_employee': return <PersonAdd color="primary" />;
      case 'leave_approved': return <CheckCircle color="success" />;
      case 'late_clockin': return <AccessTime color="warning" />;
      case 'birthday': return <Cake color="secondary" />;
      case 'anniversary': return <Work color="info" />;
      default: return <NotificationImportant />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
          HR Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Workforce management and insights
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Clock In/Out Card for HR */}
      <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                Daily Clock-In
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {activeSession 
                  ? `Active session: ${activeSession.shift?.name || 'Unknown'}`
                  : 'No active session available'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              color={isClockedIn ? 'error' : 'success'}
              onClick={handleClockToggle}
              disabled={!activeSession && !isClockedIn}
              sx={{ ml: 'auto', px: 4 }}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
            <Box>
              <Typography variant="body2">
                Status: <strong>{isClockedIn ? 'Clocked In' : 'Clocked Out'}</strong>
              </Typography>
              {lastActionTime && <Typography variant="caption">Last: {lastActionTime}</Typography>}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Key Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.totalEmployees}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
                    Total Employees
                  </Typography>
                </Box>
                <People sx={{ fontSize: 36, opacity: 0.8 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.activeToday}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
                    Present Today
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 36, opacity: 0.8 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', borderRadius: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.absenteeismRate}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
                    Absenteeism Rate
                  </Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 36, opacity: 0.8 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats.pendingLeaves}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
                    Pending Leaves
                  </Typography>
                </Box>
                <CalendarToday sx={{ fontSize: 36, opacity: 0.8 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack spacing={1}>
            {complianceAlerts.map((alert, index) => (
              <Alert 
                key={index}
                severity={alert.severity}
                icon={alert.icon}
                sx={{ borderRadius: 1 }}
              >
                {alert.message}
              </Alert>
            ))}
          </Stack>
        </Box>
      )}

      {/* Feature Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 2,
                boxShadow: 2,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box
                sx={{
                  height: 60,
                  background: feature.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {React.cloneElement(feature.icon, {
                    sx: { fontSize: 28, color: 'white' },
                  })}
                </Box>

                {/* Badges */}
                {feature.badge && (
                  <Badge
                    badgeContent={feature.badge}
                    color={feature.badgeColor || 'primary'}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                    }}
                  />
                )}
              </Box>

              <CardContent sx={{ pt: 2, pb: 2, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {feature.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 50, px: 1, fontSize: '0.875rem' }}>
                  {feature.description}
                </Typography>

                {/* Progress bar for Attendance */}
                {feature.progress !== undefined && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Today's Attendance
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={feature.progress}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'background.paper',
                      }}
                    />
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {stats.activeToday} / {stats.totalEmployees} present
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  size="medium"
                  fullWidth
                  onClick={feature.action}
                  sx={{
                    borderRadius: 1,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: '600',
                  }}
                >
                  {feature.buttonText}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bottom Section: Activity + Department Overview */}
      <Grid container spacing={2}>
        {/* Recent Activity */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <List>
                  {[...Array(5)].map((_, i) => (
                    <ListItem key={i}>
                      <ListItemAvatar>
                        <Skeleton variant="circular" width={40} height={40} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Skeleton width="60%" />}
                        secondary={<Skeleton width="40%" />}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : recentActivity.length === 0 ? (
                <Alert severity="info">No recent activity</Alert>
              ) : (
                <List>
                  {recentActivity.map((item, i) => (
                    <ListItem key={i} sx={{ py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'background.paper' }}>
                          {getActivityIcon(item.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.message || item.title}
                        secondary={item.timestamp || item.time}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Department Overview */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Departments
                </Typography>
                <Button size="small" onClick={() => navigate('/companies')}>
                  View All
                </Button>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <Stack spacing={2}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={60} />
                  ))}
                </Stack>
              ) : departments.length === 0 ? (
                <Alert severity="info">No departments found</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Department</strong></TableCell>
                        <TableCell align="right"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {departments.slice(0, 5).map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {dept.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dept.code}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={dept.is_active ? 'Active' : 'Inactive'}
                              size="small"
                              color={dept.is_active ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional HR Metrics */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Attendance Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={3}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Present Today
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.activeToday} / {stats.totalEmployees}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={stats.totalEmployees > 0 ? (stats.activeToday / stats.totalEmployees) * 100 : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Late Arrivals
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="warning.main">
                      {stats.lateArrivals}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={stats.totalEmployees > 0 ? (stats.lateArrivals / stats.totalEmployees) * 100 : 0}
                    color="warning"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Absenteeism Rate
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color={stats.absenteeismRate > 20 ? 'error.main' : 'text.primary'}>
                      {stats.absenteeismRate}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={stats.absenteeismRate}
                    color={stats.absenteeismRate > 20 ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  startIcon={<People />}
                  onClick={() => navigate('/employees')}
                >
                  Manage Employees
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<Assessment />}
                  onClick={() => navigate('/reports')}
                >
                  Generate Report
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<Download />}
                  onClick={() => navigate('/reports')}
                >
                  Export Data
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HRDashboard;