// src/pages/ManagerDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { api } from '../services/api.service.js';
import Reports from './Reports.jsx';
import Biometrics from './Biometrics.jsx';
import Settings from './Settings.jsx';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Avatar,
  CircularProgress,
  LinearProgress,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Alert,
} from '@mui/material';
import {
  People,
  CheckCircle,
  Report,
  Refresh,
  Search,
  TrendingUp,
  Group,
  EventNote,
  Visibility,
  Fingerprint,
  Settings as SettingsIcon,
  Schedule,
} from '@mui/icons-material';

// Status color helper
const getStatusColor = (status) => {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (['present', 'approved', 'active'].includes(s)) return 'success';
  if (['absent', 'rejected', 'inactive'].includes(s)) return 'error';
  if (['remote', 'on leave', 'pending'].includes(s)) return 'warning';
  return 'default';
};

// Dashboard Layout Component
const DashboardLayout = ({ children, title, breadcrumbs = [], actions }) => (
  <Box sx={{ width: '100%' }}>
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {breadcrumbs.length > 0 && (
          <>
            <Typography color="text.secondary">/</Typography>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <Typography color={idx === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}>
                  {crumb.label}
                </Typography>
                {idx < breadcrumbs.length - 1 && <Typography color="text.secondary">/</Typography>}
              </React.Fragment>
            ))}
          </>
        )}
      </Box>
      {actions && <Box sx={{ mt: 2 }}>{actions}</Box>}
    </Box>
    {children}
  </Box>
);

// ====================== DASHBOARD HOME ======================
const ManagerDashboardHome = ({ onNotify }) => {
  const [stats, setStats] = useState({
    teamCount: 0,
    presentToday: 0,
    pendingApprovals: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [searchSession, setSearchSession] = useState('');
  const [filterSessionStatus, setFilterSessionStatus] = useState('ALL');
  const [filterSessionDate, setFilterSessionDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Excess shifts state
  const [excessShiftEmployees, setExcessShiftEmployees] = useState([]);
  const MAX_SHIFTS_PER_DAY = 2;

  // Detect employees with excess shifts
  const detectExcessShifts = useCallback((employeeShifts, shifts) => {
    const excessEmployees = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const shiftsByEmployee = {};
    employeeShifts.forEach(assignment => {
      const employeeId = assignment.employee?.id || assignment.employee;
      if (!shiftsByEmployee[employeeId]) {
        shiftsByEmployee[employeeId] = {
          employee: assignment.employee,
          excessDays: []
        };
      }

      days.forEach(day => {
        if (assignment.shift && assignment.shift[day]) {
          const shiftsOnDay = employeeShifts.filter(a => {
            const empId = a.employee?.id || a.employee;
            return empId === employeeId && a.shift && a.shift[day];
          });

          if (shiftsOnDay.length > MAX_SHIFTS_PER_DAY) {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            if (!shiftsByEmployee[employeeId].excessDays.includes(dayName)) {
              shiftsByEmployee[employeeId].excessDays.push(dayName);
            }
          }
        }
      });
    });

    Object.values(shiftsByEmployee).forEach(data => {
      if (data.excessDays.length > 0) {
        excessEmployees.push({
          employee: data.employee,
          excessDays: data.excessDays
        });
      }
    });

    return excessEmployees;
  }, []);

  // Set current date on client-side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  // Fetch stats after date is set
  useEffect(() => {
    if (currentDate) {
      fetchStats();
    }
  }, [currentDate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch data in parallel
      const [empRes, employeesRes, attendanceRes, sessionsRes, shiftsRes, empShiftsRes] = await Promise.all([
        api.getMyEmployee().catch(() => null),
        api.get('/employees/employees/').catch(() => ({ results: [] })),
        api.get('/attendance/attendance/').catch(() => ({ results: [] })),
        api.listAttendanceSessions({}).catch(() => []),
        api.get('/attendance/shifts/').catch(() => []),
        api.listEmployeeShifts().catch(() => []),
      ]);

      const employeesList = Array.isArray(employeesRes) ? employeesRes : employeesRes?.results || [];
      const attendanceList = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.results || [];
      const shifts = Array.isArray(shiftsRes) ? shiftsRes : shiftsRes?.results || [];
      const employeeShifts = Array.isArray(empShiftsRes) ? empShiftsRes : empShiftsRes?.results || [];

      // Detect excess shifts
      const excessShifts = detectExcessShifts(employeeShifts, shifts);
      setExcessShiftEmployees(excessShifts);

      // Filter by department once
      const emp = empRes;
      let employees = emp?.department?.id
        ? employeesList.filter(e => String(e.department?.id) === String(emp.department.id))
        : employeesList;

      // Use Set for O(1) lookups instead of O(n) includes
      const employeeIds = new Set(employees.map(e => String(e.id)));
      const deptAttendance = attendanceList.filter(a => {
        const aEmpId = String(a.employee?.id || a.employee);
        return employeeIds.has(aEmpId);
      });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayRecords = deptAttendance.filter(a => a.date === todayStr);
      
      const presentToday = todayRecords.filter(a => 
        ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())
      ).length;

      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const weeklyRecords = deptAttendance.filter(a => 
        a.date >= sevenDaysAgo && a.date <= todayStr
      );
      
      const weeklyPresent = weeklyRecords.filter(a => 
        ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())
      ).length;

      const attendanceRate = weeklyRecords.length > 0
        ? Math.round((weeklyPresent / weeklyRecords.length) * 100)
        : 0;

      setStats({
        teamCount: employees.length,
        presentToday,
        pendingApprovals: 0,
        attendanceRate,
      });

      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
    } catch (err) {
      console.error('Failed to load stats:', err);
      onNotify?.('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Notify when excess shifts are detected
  useEffect(() => {
    if (excessShiftEmployees.length > 0 && !loading) {
      const firstExcess = excessShiftEmployees[0];
      const message = `⚠️ ${firstExcess.employee?.full_name || 'An employee'} has ${firstExcess.excessDays.length > 3 ? 'excess shifts' : 'more than 2 shifts on ' + firstExcess.excessDays.join(', ')}`;
      onNotify?.(message, 'warning');
    }
  }, [excessShiftEmployees, loading, onNotify]);

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
    <DashboardLayout 
      title="Manager Dashboard"
      breadcrumbs={[{ label: 'Manager' }, { label: 'Dashboard' }]}
      actions={
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchStats}>
          Refresh
        </Button>
      }
    >
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', display: 'flex' }}>
                  <Group fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.teamCount}</Typography>
                  <Typography color="text.secondary">Team Members</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.main', display: 'flex' }}>
                  <CheckCircle fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.presentToday}</Typography>
                  <Typography color="text.secondary">Present Today</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.main', display: 'flex' }}>
                  <EventNote fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.pendingApprovals}</Typography>
                  <Typography color="text.secondary">Pending</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.light', color: 'info.main', display: 'flex' }}>
                  <TrendingUp fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.attendanceRate}%</Typography>
                  <Typography color="text.secondary">Weekly Attendance</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Quick Actions</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <People sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>Team Members</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View and manage your team
              </Typography>
              <Button variant="contained" component={Link} to="/manager/team" fullWidth>
                View Team
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Report sx={{ fontSize: 56, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>Reports</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Generate attendance reports
              </Typography>
              <Button variant="contained" color="secondary" component={Link} to="/manager/reports" fullWidth>
                View Reports
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Fingerprint sx={{ fontSize: 56, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>Biometrics</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage facial recognition
              </Typography>
              <Button variant="contained" color="warning" component={Link} to="/biometrics" fullWidth>
                Manage
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Attendance Sessions */}
      <Typography variant="h5" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>Attendance Sessions</Typography>
      <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          {/* Session Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search sessions..."
                value={searchSession}
                onChange={(e) => setSearchSession(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date"
                value={filterSessionDate}
                onChange={(e) => setFilterSessionDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterSessionStatus}
                  onChange={(e) => setFilterSessionStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="ALL">All Sessions</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                startIcon={<Refresh />}
                onClick={fetchStats}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>

          {/* Sessions Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.light' }}>
                  <TableCell><strong>Session ID</strong></TableCell>
                  <TableCell><strong>Shift</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filteredSessions = sessions.filter((session) => {
                    const matchesSearch = !searchSession ||
                      String(session.id).includes(searchSession) ||
                      session.shift?.name?.toLowerCase().includes(searchSession.toLowerCase());
                    
                    const matchesDate = !filterSessionDate || session.date === filterSessionDate;
                    
                    if (filterSessionStatus === 'ALL') return matchesSearch && matchesDate;
                    if (filterSessionStatus === 'ACTIVE') return matchesSearch && matchesDate && session.is_active;
                    if (filterSessionStatus === 'CLOSED') return matchesSearch && matchesDate && !session.is_active;
                    return matchesSearch && matchesDate;
                  });

                  if (loading) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <CircularProgress size={30} />
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (filteredSessions.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No sessions found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return filteredSessions.slice(0, 5).map((session) => (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          #{session.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {session.shift?.name || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {session.date || currentDate || format(new Date(), 'yyyy-MM-dd')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.is_active ? 'Active' : 'Closed'}
                          color={session.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" component={Link} to="/attendance/sessions">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ====================== TEAM OVERVIEW ======================
const TeamOverviewPage = ({ onNotify }) => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchTeam();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/employees/departments/').catch(() => ({ results: [] }));
      const list = Array.isArray(res) ? res : res?.results || [];
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchTeam = async () => {
    try {
      setLoading(true);
      
      const [empRes, employeesRes, attendanceRes] = await Promise.all([
        api.getMyEmployee().catch(() => null),
        api.get('/employees/employees/').catch(() => ({ results: [] })),
        api.get('/attendance/attendance/').catch(() => ({ results: [] })),
      ]);

      const employeesList = Array.isArray(employeesRes) ? employeesRes : employeesRes?.results || [];
      const attendanceList = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.results || [];

      let employees = empRes?.department?.id
        ? employeesList.filter(e => String(e.department?.id) === String(empRes.department.id))
        : employeesList;

      // Calculate real attendance rates
      const mapped = employees.map(emp => {
        const empAttendance = attendanceList.filter(a => 
          String(a.employee?.id || a.employee) === String(emp.id)
        );
        const totalDays = empAttendance.length;
        const presentDays = empAttendance.filter(a => 
          ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())
        ).length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

        return {
          id: emp.id,
          name: emp.full_name || emp.user?.email?.split('@')[0] || 'Unknown',
          email: emp.user?.email || '',
          department: emp.department?.name || 'No Department',
          role: emp.user?.roles?.[0]?.name || 'Employee',
          status: emp.is_active ? 'Active' : 'Inactive',
          attendance_rate: attendanceRate,
          total_days: totalDays,
          present_days: presentDays,
        };
      });

      setTeam(mapped);
    } catch (err) {
      console.error('Failed to load team:', err);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = team.filter(member => {
    const name = (member.name || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const department = (member.department || '').toLowerCase();
    const searchLower = search.toLowerCase();
    
    const matchesSearch = 
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      department.includes(searchLower);
    const matchesDept = deptFilter === 'all' || member.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <DashboardLayout 
      title="Team Overview" 
      breadcrumbs={[{ label: 'Manager' }, { label: 'Team' }]}
      actions={
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchTeam}>
          Refresh
        </Button>
      }
    >
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} label="Department">
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Team Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : team.length === 0 ? (
            <Alert severity="info">No team members found.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
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
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {member.name[0]}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="medium">{member.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {member.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{member.department}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>
                          <Chip 
                            label={member.status} 
                            color={getStatusColor(member.status)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <Box sx={{ width: 100 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={member.attendance_rate}
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: member.attendance_rate >= 80 ? 'success.main' : 
                                             member.attendance_rate >= 50 ? 'warning.main' : 'error.main',
                                  }
                                }}
                              />
                            </Box>
                            <Chip 
                              label={`${member.attendance_rate}%`}
                              size="small"
                              sx={{ 
                                bgcolor: member.attendance_rate >= 80 ? 'success.light' : 
                                         member.attendance_rate >= 50 ? 'warning.light' : 'error.light',
                                color: member.attendance_rate >= 80 ? 'success.dark' : 
                                       member.attendance_rate >= 50 ? 'warning.dark' : 'error.dark',
                              }}
                            />
                          </Stack>
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
  const location = useLocation();
  
  return (
    <Routes>
      <Route path="dashboard" element={<ManagerDashboardHome onNotify={onNotify} />} />
      <Route path="team" element={<TeamOverviewPage onNotify={onNotify} />} />
      <Route path="reports" element={<Reports onNotify={onNotify} />} />
      <Route path="biometrics" element={<Biometrics onNotify={onNotify} role="Manager" />} />
      <Route path="settings" element={<Settings onNotify={onNotify} />} />
      <Route path="*" element={<ManagerDashboardHome onNotify={onNotify} />} />
    </Routes>
  );
};

export default ManagerDashboard;
