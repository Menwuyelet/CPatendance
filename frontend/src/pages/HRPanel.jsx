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
} from '@mui/material';
import {
  Dashboard,
  People,
  EventNote,
  CalendarToday,
  Assessment,
  TipsAndUpdates,
  Cake,
  Work,
  NotificationImportant,
  HowToReg,
  AccessTime,
  CheckCircle,
  PersonAdd,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';

const HRDashboard = () => {
  const navigate = useNavigate();

  // Real data states
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeToday: 0,
    pendingLeaves: 0,
    newThisMonth: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        setLoading(true);
        setError('');

        // Parallel API calls - adjust endpoints to match your backend
        const [
          employeesRes,
          todayAttendanceRes,
          pendingLeavesRes,
          recentActivityRes,
          upcomingEventsRes,
        ] = await Promise.allSettled([
          api.get('/hr/employees'),                    // All employees
          api.get('/attendance/today-summary'),        // { present: 128, total: 142 }
          api.get('/leaves/pending'),                  // Pending leave requests
          api.get('/hr/activity/recent?limit=8'),      // Recent actions log
          api.get('/hr/upcoming-events'),              // Birthdays & anniversaries
        ]);

        // Extract data safely
        const employees = employeesRes.status === 'fulfilled' ? employeesRes.value : [];
        const todaySummary = todayAttendanceRes.status === 'fulfilled' ? todayAttendanceRes.value : null;
        const pendingLeaves = pendingLeavesRes.status === 'fulfilled' ? pendingLeavesRes.value : [];
        const activity = recentActivityRes.status === 'fulfilled' ? recentActivityRes.value : [];
        const events = upcomingEventsRes.status === 'fulfilled' ? upcomingEventsRes.value : [];

        // Calculate stats from real data
        const totalEmployees = Array.isArray(employees) ? employees.length : 0;
        const activeToday = todaySummary?.present || 0;
        const pendingLeavesCount = Array.isArray(pendingLeaves) ? pendingLeaves.length : 0;

        // New hires this month (example filter - adjust field name as needed)
        const thisMonthStart = startOfMonth(new Date());
        const thisMonthEnd = endOfMonth(new Date());
        const newThisMonth = Array.isArray(employees)
          ? employees.filter(emp => {
              const joinDate = emp.join_date ? new Date(emp.join_date) : null;
              return joinDate && joinDate >= thisMonthStart && joinDate <= thisMonthEnd;
            }).length
          : 0;

        setStats({
          totalEmployees,
          activeToday,
          pendingLeaves: pendingLeavesCount,
          newThisMonth,
        });

        setRecentActivity(Array.isArray(activity) ? activity : []);
        setUpcomingEvents(Array.isArray(events) ? events : []);

      } catch (err) {
        console.error('Failed to load HR dashboard data:', err);
        setError('Unable to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
  }, []);

  const features = [
    {
      title: 'Overview',
      description: 'Central hub for HR metrics and system status',
      icon: <Dashboard />,
      action: () => navigate('/hr/dashboard'),
      buttonText: 'View Overview',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'Employees',
      description: 'Onboarding, profiles, roles, departments & access control',
      icon: <People />,
      action: () => navigate('/hr/employees'),
      buttonText: 'Manage Employees',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      badge: stats.newThisMonth > 0 ? stats.newThisMonth : null,
      badgeColor: 'primary',
    },
    {
      title: 'Attendance',
      description: 'Real-time tracking, shifts, overtime, and compliance',
      icon: <EventNote />,
      action: () => navigate('/hr/attendance'),
      buttonText: 'View Attendance',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      progress: stats.totalEmployees > 0 
        ? Math.round((stats.activeToday / stats.totalEmployees) * 100) 
        : 0,
    },
    {
      title: 'Leaves',
      description: 'Approve requests, track balances, and manage policies',
      icon: <CalendarToday />,
      action: () => navigate('/hr/leaves'),
      buttonText: 'Review Requests',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      badge: stats.pendingLeaves > 0 ? stats.pendingLeaves : null,
      badgeColor: 'error',
    },
    {
      title: 'Reports & Analytics',
      description: 'Turnover, diversity, performance, and compliance insights',
      icon: <Assessment />,
      action: () => navigate('/hr/reports'),
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
    <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: { xs: 'center', md: 'left' } }}>
        <Typography
          variant="h3"
          fontWeight="bold"
          sx={{
            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
          }}
        >
          HR Command Center
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage your workforce efficiently with real-time insights and tools.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Feature Cards */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                boxShadow: 6,
                overflow: 'hidden',
                transition: 'all 0.4s ease',
                '&:hover': {
                  transform: 'translateY(-12px) scale(1.02)',
                  boxShadow: 12,
                },
              }}
            >
              <Box
                sx={{
                  height: 100,
                  background: feature.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {React.cloneElement(feature.icon, {
                    sx: { fontSize: 48, color: 'white' },
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

              <CardContent sx={{ pt: 4, pb: 4, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {feature.title}
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, minHeight: 80, px: 2 }}>
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
                  size="large"
                  fullWidth
                  onClick={feature.action}
                  sx={{
                    borderRadius: 3,
                    py: 1.5,
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

      {/* Bottom Section: Activity + Upcoming Events */}
      <Grid container spacing={4}>
        {/* Recent Activity */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 4, boxShadow: 6, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 3 }} />

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
                  {recentActivity.slice(0, 8).map((item, i) => (
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

        {/* Upcoming Events */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 4, boxShadow: 6, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Upcoming Celebrations
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {loading ? (
                <Stack spacing={3}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={60} />
                  ))}
                </Stack>
              ) : upcomingEvents.length === 0 ? (
                <Alert severity="info">No upcoming birthdays or anniversaries</Alert>
              ) : (
                <Stack spacing={3}>
                  {upcomingEvents.map((event, i) => (
                    <Paper
                      key={i}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                        textAlign: 'center',
                      }}
                    >
                      <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                        {event.type === 'birthday' ? <Cake /> : <Work />}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {event.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {event.type === 'birthday' ? 'Birthday' : 'Work Anniversary'}<br />
                        {format(new Date(event.date), 'MMM dd')}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pro Tip */}
      <Paper elevation={3} sx={{ mt: 8, p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
          <TipsAndUpdates sx={{ fontSize: 32, color: 'primary.main' }} />
          <div>
            <Typography variant="h6" fontWeight="medium">
              Quick Tip
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Use the sidebar for fast navigation, or bookmark this page for daily HR operations.
            </Typography>
          </div>
        </Stack>
      </Paper>
    </Box>
  );
};

export default HRDashboard;