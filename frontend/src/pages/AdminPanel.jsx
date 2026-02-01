import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardHeader, CardContent, Typography, Button, CircularProgress,
  Alert, Stack, IconButton, Avatar, Divider, useTheme, alpha, Container,
  List, ListItem, ListItemAvatar, ListItemText, Paper
} from '@mui/material';
import {
  People, EventAvailable, Refresh, PersonAdd, Business, TrendingUp,
  SettingsSuggest, ChevronRight, Security
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.service.js';

/* ----------------------------- Professional Card Design ----------------------------- */
const StyledCard = ({ children, theme }) => (
  <Card sx={{
    height: '100%',
    borderRadius: '20px',
    background: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.6) 
      : theme.palette.background.paper,
    backdropFilter: 'blur(15px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.3)'
      : '0 8px 32px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
    }
  }}>
    {children}
  </Card>
);

const AdminPanel = ({ onNotify }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    attendanceRate: 0,
    depts: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, attRes, depRes] = await Promise.all([
        api.get('/employees/employees/'),
        api.get('/attendance/attendance/'),
        api.getAllDepartments(),
      ]);

      const employees = empRes?.data || empRes || [];
      const attendance = attRes?.data || attRes || [];
      const departments = depRes?.data || depRes || [];

      // Logic for actual data
      const today = new Date().toISOString().slice(0, 10);
      const activeNow = attendance.filter(a => a.date === today && (a.status === 'PRESENT' || a.status === 'LATE'));

      setStats({
        totalEmployees: employees.length,
        presentToday: activeNow.length,
        attendanceRate: employees.length ? Math.round((activeNow.length / employees.length) * 100) : 0,
        depts: departments.length
      });
    } catch (err) {
      setError("Synchronisation failed. Reconnecting...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100%',
      maxWidth: '100vw', 
      overflowX: 'hidden', // Essential fix for the right-side gap
      bgcolor: 'background.default',
      transition: 'background 0.3s ease',
      // Dynamic background based on light/dark mode
      backgroundImage: theme.palette.mode === 'dark' 
        ? `radial-gradient(at 0% 0%, ${alpha(theme.palette.primary.main, 0.1)} 0px, transparent 50%)`
        : `radial-gradient(at 0% 0%, ${alpha(theme.palette.primary.main, 0.05)} 0px, transparent 50%)`,
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        
        {/* Header Section */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={3} mb={6}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-1px' }}>
              Management Console
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time synchronization active • {new Date().toLocaleDateString()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              startIcon={<PersonAdd />} 
              onClick={() => navigate('/users')}
              sx={{ borderRadius: '12px', px: 3, textTransform: 'none', fontWeight: 700 }}
            >
              Add Staff
            </Button>
            <IconButton onClick={fetchData} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>

        {error && <Alert severity="warning" sx={{ mb: 4, borderRadius: '12px' }}>{error}</Alert>}

        {/* KPI Grid: Self-adjusting width */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: 3, 
          mb: 6 
        }}>
          {[
            { label: 'Employees', val: stats.totalEmployees, icon: <People />, color: 'primary', sub: 'Total Records' },
            { label: 'Attendance', val: `${stats.attendanceRate}%`, icon: <EventAvailable />, color: 'success', sub: `${stats.presentToday} Present` },
            { label: 'Payroll', val: `$${(stats.payroll/1000).toFixed(1)}k`, icon: <AccountBalanceWallet />, color: 'info', sub: 'Monthly Total' },
            { label: 'Units', val: stats.depts, icon: <Business />, color: 'warning', sub: 'Departments' },
          ].map((stat, i) => (
            <StyledCard key={i} theme={theme}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">{stat.label}</Typography>
                    <Typography variant="h4" fontWeight="900" sx={{ my: 1 }}>{stat.val}</Typography>
                    <Typography variant="caption" sx={{ color: `${stat.color}.main`, fontWeight: 700 }}>{stat.sub}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(theme.palette[stat.color].main, 0.1), color: `${stat.color}.main`, width: 56, height: 56, borderRadius: '15px' }}>
                    {stat.icon}
                  </Avatar>
                </Stack>
              </CardContent>
            </StyledCard>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
          {/* Main Action Hub */}
          <Box>
            <Typography variant="h6" fontWeight="800" mb={3}>Quick Directories</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {[
                { label: 'Attendance', path: '/attendance', icon: <TrendingUp />, color: '#10b981' },
                { label: 'Departments', path: '/companies', icon: <Business />, color: '#6366f1' },
                { label: 'Work Shifts', path: '/attendance/shifts', icon: <SettingsSuggest />, color: '#f59e0b' },
                { label: 'Biometrics', path: '/biometrics', icon: <Security />, color: '#ec4899' },
              ].map((item, i) => (
                <Paper
                  key={i}
                  onClick={() => navigate(item.path)}
                  sx={{
                    p: 3, borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: alpha(item.color, 0.05), border: '1px solid transparent', transition: '0.2s',
                    '&:hover': { borderColor: item.color, bgcolor: alpha(item.color, 0.1) }
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: item.color, color: '#fff', borderRadius: '10px' }}>{item.icon}</Avatar>
                    <Typography variant="subtitle2" fontWeight="800">{item.label}</Typography>
                  </Stack>
                  <ChevronRight sx={{ color: 'text.disabled', fontSize: 18 }} />
                </Paper>
              ))}
            </Box>
          </Box>

          {/* Activity Logs */}
          <StyledCard theme={theme}>
            <CardHeader title={<Typography variant="h6" fontWeight="800">Recent Status</Typography>} />
            <Divider sx={{ opacity: 0.1 }} />
            <List sx={{ p: 0 }}>
              {[
                { t: 'Attendance Sync', s: `${stats.presentToday} checked in`, time: 'Live', c: 'success' },
                { t: 'Payroll Summary', s: 'Verified for current month', time: 'Static', c: 'info' },
              ].map((act, i) => (
                <ListItem key={i} sx={{ px: 3, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette[act.c].main, 0.1), color: `${act.c}.main` }}>
                      <Security fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={<Typography variant="body2" fontWeight="700">{act.t}</Typography>}
                    secondary={<Typography variant="caption">{act.s} • {act.time}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </StyledCard>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminPanel;