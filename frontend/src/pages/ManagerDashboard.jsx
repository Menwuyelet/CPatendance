// src/pages/ManagerDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Settings from './Settings.jsx';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  LinearProgress,
  CircularProgress,
  Alert,
  TableContainer,
  TablePagination,
  Divider,
  Breadcrumbs,
  AppBar,
  Toolbar,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { api } from '../services/api.service.js';
import {
  People,
  EventNote,
  CheckCircle,
  Report,
  ArrowBack,
  Search,
  Refresh,
  Visibility,
  TrendingUp,
  Group,
  Person,
  Home,
  ChevronRight,
} from '@mui/icons-material';
import SettingsIcon from '@mui/icons-material/Settings';
import { format, subDays } from 'date-fns';
import Reports from './Reports.jsx';
import Biometrics from './Biometrics.jsx';

const getStatusColor = (status) => {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (['present', 'approved', 'active'].includes(s)) return 'success';
  if (['absent', 'rejected', 'inactive'].includes(s)) return 'error';
  if (['remote', 'on leave', 'pending'].includes(s)) return 'warning';
  return 'default';
};

// Helper to safely extract shift id from either a plain id or nested object
const getShiftId = (shift) => {
  if (!shift) return null;
  if (typeof shift === 'object') return shift.id ?? null;
  return shift; // assume it's already an id
};

// Helper to get a display name for a session's shift
const getSessionShiftName = (session) => {
  if (!session || !session.shift) return 'Unknown';

  if (typeof session.shift === 'object') {
    return session.shift.name || `Shift #${session.shift.id ?? ''}` || 'Unknown';
  }

  // When backend returns only an id we cannot resolve the real name here
  return `Shift #${session.shift}`;
};

// ====================== LAYOUT WRAPPER ======================
const DashboardLayout = ({ children, title, breadcrumbs = [] }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'var(--bg-sidebar)' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Attendance System
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton color="inherit" onClick={() => navigate('/manager/settings')}>
              <SettingsIcon />
            </IconButton>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <Person />
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, maxWidth: '1400px', mx: 'auto', width: '100%' }}>
        <Breadcrumbs separator={<ChevronRight fontSize="small" />} sx={{ mb: 3 }}>
          <Link to="/manager/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Home fontSize="small" />
              <Typography variant="body2">Dashboard</Typography>
            </Stack>
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <Typography key={i} variant="body2" color={i === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}>
              {crumb}
            </Typography>
          ))}
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" fontWeight="bold">
            {title}
          </Typography>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </Box>

        {children}
      </Box>
    </Box>
  );
};

// ====================== DASHBOARD HOME ======================
const ManagerDashboardHome = ({ onNotify }) => {
  const [stats, setStats] = useState({
    teamCount: 0,
    presentToday: 0,
    pendingApprovals: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(null);
  const navigate = useNavigate();
  
  // Clock-in state
  const [lastActionTime, setLastActionTime] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    fetchStats();
    loadClockInState();
  }, []);
  
  const loadClockInState = async () => {
    try {
      const user = await api.getCurrentUser();
      if (user?.employee?.department) {
        setDepartment(user.employee.department);
      }
      
      // Check active sessions
      try {
        const sessions = await api.listAttendanceSessions({ active: true });
        const activeSessions = Array.isArray(sessions) ? sessions.filter(s => s.is_active) : [];
        
        if (activeSessions.length > 0 && user?.employee?.id) {
          const userShifts = await api.listEmployeeShifts(user.employee.id);
          const userShiftsList = Array.isArray(userShifts) ? userShifts : [];
          const userShiftIds = userShiftsList
            .map(us => getShiftId(us.shift))
            .filter(Boolean);
          
          const matchingSession = activeSessions.find(session => {
            const sessionShiftId = getShiftId(session.shift);
            return sessionShiftId && userShiftIds.includes(sessionShiftId);
          });
          
          if (matchingSession) {
            setActiveSession(matchingSession);
          } else {
            // No session for this manager's assigned shifts → disable clock-in
            setActiveSession(null);
          }
        } else {
          setActiveSession(null);
        }
      } catch (sessionErr) {
        console.error('Failed to load sessions:', sessionErr);
        setActiveSession(null);
      }
      
      // Get last check-in time if any
      if (user?.employee?.id) {
        const today = new Date().toISOString().slice(0, 10);
        try {
          const attendance = await api.get(`/attendance/attendance/?date=${today}`);
          const todayRecords = Array.isArray(attendance) ? attendance : [];
          const userRecord = todayRecords.find(r => r.employee?.id === user.employee.id);
          if (userRecord && userRecord.check_in_time) {
            setLastActionTime(new Date(userRecord.check_in_time).toLocaleTimeString());
          }
        } catch (attendanceErr) {
          console.error('Failed to load attendance:', attendanceErr);
        }
      }
    } catch (err) {
      console.error('Failed to load clock-in state:', err);
    }
  };
  
  const handleClockIn = async () => {
    if (!activeSession) {
      onNotify?.('No active attendance session available or you are not assigned to any active session.', 'error');
      return;
    }
    
    try {
      await api.checkInAttendance();
      const now = new Date().toLocaleTimeString();
      setLastActionTime(now);
      onNotify?.('Successfully clocked in.', 'success');
    } catch (err) {
      console.error('Clock in failed:', err);
      onNotify?.(`Failed to clock in. ${err.message || 'Please try again.'}`, 'error');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Get manager's department employees
      const user = await api.getCurrentUser();
      let employees = [];
      
      if (user?.employee?.department?.id) {
        // Get employees from manager's department
        const allEmployees = await api.get('/employees/employees/').catch(() => []);
        const employeesList = Array.isArray(allEmployees) ? allEmployees : allEmployees?.data || [];
        employees = employeesList.filter(emp => emp.department?.id === user.employee.department.id);
        setDepartment(user.employee.department);
      } else {
        // Fallback to all employees if no department
        const employeesRes = await api.get('/employees/employees/').catch(() => ({ data: [] }));
        employees = Array.isArray(employeesRes) ? employeesRes : employeesRes.data || [];
      }
      
      const attendanceRes = await api.get('/attendance/attendance/').catch(() => ({ data: [] }));
      const allAttendance = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes.data || [];
      
      // Filter attendance by department employees only
      const employeeIds = employees.map(emp => emp.id);
      const attendance = allAttendance.filter(a => {
        const empId = a.employee?.id || a.employee;
        return employeeIds.includes(empId);
      });

      const teamCount = employees.length;

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayRecords = attendance.filter(a => a.date === todayStr);

      const presentToday = todayRecords.filter(a => 
        ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())
      ).length;

      const pendingApprovals = todayRecords.filter(a => 
        a.status?.toUpperCase() === 'ON_LEAVE'
      ).length;

      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const weeklyRecords = attendance.filter(a => 
        a.date >= sevenDaysAgo && a.date <= todayStr
      );

      const weeklyPresent = weeklyRecords.filter(a => 
        ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())
      ).length;

      const attendanceRate = weeklyRecords.length > 0
        ? Math.round((weeklyPresent / weeklyRecords.length) * 100)
        : 0;

      setStats({ teamCount, presentToday, pendingApprovals, attendanceRate });
    } catch (err) {
      onNotify?.('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Manager Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manager Dashboard">
      {/* Clock In/Out Card for Manager */}
      <Box sx={{ mb: 3 }}>
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ flexWrap: 'wrap' }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Daily Clock-In
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {activeSession 
                    ? `Active session: ${getSessionShiftName(activeSession)}`
                    : 'No active session available or you are not assigned to it'}
                  {department && `  b7 Department: ${department.name || 'N/A'}`}
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                color="success"
                onClick={handleClockIn}
                disabled={!activeSession}
                sx={{ px: 4, minWidth: 150, flexShrink: 0 }}
              >
                Clock In
              </Button>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, minWidth: 150, flexShrink: 0 }}>
                <Typography variant="body2" fontWeight="medium">
                  {activeSession ? 'Session Active' : 'No Active Session'}
                </Typography>
                {lastActionTime && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Last check-in: {lastActionTime}
                  </Typography>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        {[
          { label: 'Team Size', value: stats.teamCount, icon: <Group />, color: 'primary', desc: 'Total members' },
          { label: 'Present Today', value: stats.presentToday, icon: <CheckCircle />, color: 'success', desc: 'Clocked in' },
          { label: 'Pending Approvals', value: stats.pendingApprovals, icon: <EventNote />, color: 'warning', desc: 'Awaiting review' },
          { label: 'Weekly Attendance', value: `${stats.attendanceRate}%`, icon: <TrendingUp />, color: 'info', desc: 'Last 7 days' },
        ].map((item, i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 4 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" variant="body2" gutterBottom>
                      {item.desc}
                    </Typography>
                    <Typography variant="h3" fontWeight="bold" color={`${item.color}.main`}>
                      {item.value}
                    </Typography>
                    <Typography variant="h6" fontWeight="medium" mt={1}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${item.color}.light`, width: 64, height: 64 }}>
                    {React.cloneElement(item.icon, { sx: { fontSize: 36, color: `${item.color}.main` } })}
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', boxShadow: 4 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <People sx={{ fontSize: 48, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">Team Management</Typography>
                  <Typography color="text.secondary">Monitor attendance & performance</Typography>
                </Box>
              </Stack>
              <Box mt="auto">
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to="/manager/team"
                    startIcon={<People />}
                    fullWidth
                  >
                    View Team Members
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    to="/manager/reports"
                    startIcon={<Report />}
                    fullWidth
                  >
                    Generate Reports
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', boxShadow: 4 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">Approval Center</Typography>
                  <Typography color="text.secondary">Review pending requests</Typography>
                </Box>
              </Stack>
              <Box mt="auto">
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  component={Link}
                  to="/manager/approvals"
                  startIcon={<CheckCircle />}
                  fullWidth
                >
                  Review {stats.pendingApprovals} Pending Request{stats.pendingApprovals !== 1 ? 's' : ''}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};

// ====================== TEAM OVERVIEW ======================
const TeamOverviewPage = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      // Get manager's department employees
      const user = await api.getCurrentUser();
      let employees = [];
      
      if (user?.employee?.department?.id) {
        // Get employees from manager's department
        const allEmployees = await api.get('/employees/employees/').catch(() => []);
        const employeesList = Array.isArray(allEmployees) ? allEmployees : allEmployees?.data || [];
        employees = employeesList.filter(emp => emp.department?.id === user.employee.department.id);
      } else {
        // Fallback to all employees if no department
        const res = await api.get('/employees/employees/').catch(() => ({ data: [] }));
        employees = Array.isArray(res) ? res : res.data || [];
      }

      const mapped = employees.map(emp => ({
        id: emp.id,
        name: emp.full_name || emp.user?.email?.split('@')[0] || 'Unknown',
        email: emp.user?.email || '',
        department: emp.department?.name || 'No Department',
        role: emp.user?.roles?.[0]?.name || 'Employee',
        status: emp.is_active ? 'Active' : 'Inactive',
        attendance_rate: 85, // Placeholder — real rate would come from attendance aggregation
      }));

      setTeam(mapped);
    } catch (err) {
      console.error('Failed to load team:', err);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['all', ...new Set(team.map(m => m.department))];

  const filtered = team.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || member.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <DashboardLayout title="Team Overview" breadcrumbs={['Team Overview']}>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="end">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                name="manager-team-search"
                id="manager-team-search"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} label="Department">
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button variant="contained" startIcon={<Refresh />} onClick={() => fetchTeam()} fullWidth>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box textAlign="center" py={8}>
              <CircularProgress />
            </Box>
          ) : team.length === 0 ? (
            <Alert severity="info">No team members found. Contact admin if this is incorrect.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Employee</strong></TableCell>
                      <TableCell><strong>Department</strong></TableCell>
                      <TableCell><strong>Role</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Attendance</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map(member => (
                      <TableRow key={member.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar>{member.name[0]}</Avatar>
                            <Box>
                              <Typography fontWeight="medium">{member.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{member.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{member.department}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>
                          <Chip label={member.status} color={getStatusColor(member.status)} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress variant="determinate" value={member.attendance_rate} sx={{ flex: 1 }} />
                            <Typography variant="body2">{member.attendance_rate}%</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filtered.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setPage(0);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ====================== MAIN COMPONENT ======================
const ManagerDashboard = ({ onNotify }) => {
  return (
    <Routes>
      <Route path="dashboard" element={<ManagerDashboardHome onNotify={onNotify} />} />
      <Route path="team" element={<TeamOverviewPage />} />
      <Route path="reports" element={<Reports onNotify={onNotify} />} />
      <Route path="biometrics" element={<Biometrics onNotify={onNotify} role="Manager" />} />
      <Route path="settings" element={<Settings onNotify={onNotify} />} />
      <Route path="*" element={<ManagerDashboardHome onNotify={onNotify} />} />
    </Routes>
  );
};

export default ManagerDashboard;