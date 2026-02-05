// src/pages/AttendanceSessions.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PlayArrow, Stop, Search, Clear } from '@mui/icons-material';
import { api } from '../services/api.service.js';

// Helper function to check if current time is within shift time
const isWithinShiftTime = (shift) => {
  if (!shift || !shift.start_time || !shift.end_time) return false;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Get current day of week (lowercase)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  
  // Check if shift is active on current day
  if (!shift[currentDay]) return false;
  
  // Check if current time is within shift start and end time
  return currentTime >= shift.start_time && currentTime <= shift.end_time;
};

// Helper function to get available shifts for current time
const enrichSessions = async (sessionsList) => {
  try {
    // Fetch shifts, users, and employees in parallel
    const [shiftsData, usersData, employeesData] = await Promise.all([
      api.get('/attendance/shifts/').catch(() => []),
      api.get('/accounts/users/').catch(() => []),
      api.get('/employees/employees/').catch(() => []),
    ]);

    const shiftsList = Array.isArray(shiftsData) ? shiftsData : shiftsData?.results || [];
    const usersList = Array.isArray(usersData) ? usersData : usersData?.results || [];
    const employeesList = Array.isArray(employeesData) ? employeesData : employeesData?.results || [];

    // Enrich sessions with shift and user data
    return sessionsList.map((session) => {
      // Get shift ID (could be object with id, or just the id number)
      const shiftId = typeof session.shift === 'object' && session.shift !== null
        ? session.shift.id
        : session.shift;
      
      // Get started_by ID (could be object with id, or just the id/UUID)
      const startedById = typeof session.started_by === 'object' && session.started_by !== null
        ? session.started_by.id
        : session.started_by;

      // Find matching shift and user
      const shift = shiftsList.find((s) => String(s.id) === String(shiftId));
      const user = usersList.find((u) => String(u.id) === String(startedById));
      
      // Find employee for this user to get full_name
      const employee = employeesList.find((e) => e.user?.id === String(startedById));
      
      // Combine user and employee data
      const enrichedUser = user ? {
        ...user,
        full_name: employee?.full_name || user.full_name,
      } : null;

      return {
        ...session,
        shift: shift || session.shift,
        started_by: enrichedUser || session.started_by,
      };
    });
  } catch (err) {
    console.error('Error enriching sessions:', err);
    // Return original sessions if enrichment fails
    return sessionsList;
  }
};

const AttendanceSessions = ({ role, onNotify: propsNotify }) => {
  const isManager = role === 'Manager';
  const isHR = role === 'HR';
  const isAdmin = role === 'Admin';

  // Use notifications hook, fallback to props
  const notifyContext = useNotifications();
  
  // Helper function to show notifications
  const showNotification = (message, severity = 'info') => {
    if (propsNotify && typeof propsNotify === 'function') {
      propsNotify(message, severity);
    } else if (propsNotify && typeof propsNotify.addNotification === 'function') {
      propsNotify.addNotification(message, severity);
    } else if (notifyContext && typeof notifyContext.addNotification === 'function') {
      notifyContext.addNotification(message, severity);
    } else {
      console.warn('Notification:', message);
    }
  };

  // Permissions
  const canManageSessions = isHR || isManager || isAdmin;
  const canManageEmployeeShifts = isHR || isManager;

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [selectedShiftForSession, setSelectedShiftForSession] = useState('');
  const [shifts, setShifts] = useState([]);

  // Employee Shifts state
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [employeeShiftsLoading, setEmployeeShiftsLoading] = useState(false);
  const [employeeShiftsError, setEmployeeShiftsError] = useState('');
  const [employeeShiftDialogOpen, setEmployeeShiftDialogOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeShiftForm, setEmployeeShiftForm] = useState({ employee: '', shift: '' });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Load shifts for session creation
  useEffect(() => {
    if (!canManageSessions) return;
    const loadShifts = async () => {
      try {
        const data = await api.get('/attendance/shifts/');
        setShifts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load shifts:', err);
      }
    };
    loadShifts();
  }, [canManageSessions]);

  // Load attendance sessions
  useEffect(() => {
    if (!canManageSessions) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    const loadSessions = async () => {
      setSessionsLoading(true);
      setSessionError('');
      try {
        // Fetch sessions
        const sessionsData = await api.listAttendanceSessions().catch(() => []);
        const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];

        // Enrich sessions with shift and user data
        const enrichedSessions = await enrichSessions(sessionsList);
        setSessions(enrichedSessions);
      } catch (err) {
        console.error('Unable to load attendance sessions:', err);
        setSessions([]);
        setSessionError('Unable to load attendance sessions.');
        showNotification('Failed to fetch attendance sessions.', 'error');
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [canManageSessions]);

  // Load employee shifts
  useEffect(() => {
    if (!canManageEmployeeShifts) {
      setEmployeeShifts([]);
      setEmployeeShiftsLoading(false);
      return;
    }

    const loadEmployeeShifts = async () => {
      setEmployeeShiftsLoading(true);
      setEmployeeShiftsError('');
      try {
        const [employeesData, employeeShiftsData, shiftsData] = await Promise.all([
          api.get('/employees/employees/').catch((err) => {
            console.error('Error loading employees:', err);
            return [];
          }),
          api.listEmployeeShifts().catch((err) => {
            console.error('Error loading employee shifts:', err);
            return [];
          }),
          api.get('/attendance/shifts/').catch((err) => {
            console.error('Error loading shifts:', err);
            return [];
          }),
        ]);

        // Handle paginated response (results field) or direct array
        const employeesList = Array.isArray(employeesData)
          ? employeesData
          : employeesData?.results || employeesData?.data || [];
        const employeeShiftsList = Array.isArray(employeeShiftsData)
          ? employeeShiftsData
          : employeeShiftsData?.results || employeeShiftsData?.data || [];
        const shiftsList = Array.isArray(shiftsData)
          ? shiftsData
          : shiftsData?.results || shiftsData?.data || [];

        console.log('Loaded employees:', employeesList.length, employeesList);
        console.log('Loaded employee shifts:', employeeShiftsList.length);

        setEmployees(employeesList);
        setEmployeeShifts(employeeShiftsList);
        setShifts(shiftsList);
      } catch (err) {
        console.error('Unable to load employee shifts:', err);
        setEmployeeShifts([]);
        setEmployeeShiftsError('Unable to load employee shifts.');
        showNotification('Failed to fetch employee shifts.', 'error');
      } finally {
        setEmployeeShiftsLoading(false);
      }
    };

    loadEmployeeShifts();
  }, [canManageEmployeeShifts]);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const searchLower = employeeSearch.toLowerCase();
    return employees.filter((emp) => {
      const email = emp.user?.email || '';
      const name = emp.full_name || '';
      const code = emp.employee_code || '';
      return (
        email.toLowerCase().includes(searchLower) ||
        name.toLowerCase().includes(searchLower) ||
        code.toLowerCase().includes(searchLower)
      );
    });
  }, [employees, employeeSearch]);

  // Enrich employee shifts with employee and shift details
  const enrichedEmployeeShifts = useMemo(() => {
    if (!employeeShifts.length || !employees.length || !shifts.length) {
      return employeeShifts;
    }
    
    return employeeShifts.map((assignment) => {
      // Extract employee ID (could be object with id, or just the id number)
      const employeeId = typeof assignment.employee === 'object' && assignment.employee !== null
        ? assignment.employee.id
        : assignment.employee;
      
      // Extract shift ID (could be object with id, or just the id number)
      const shiftId = typeof assignment.shift === 'object' && assignment.shift !== null
        ? assignment.shift.id
        : assignment.shift;
      
      // Find matching employee and shift (convert to string for comparison to handle type mismatches)
      const employee = employees.find((emp) => String(emp.id) === String(employeeId));
      const shift = shifts.find((s) => String(s.id) === String(shiftId));
      
      return {
        ...assignment,
        employee: employee || assignment.employee,
        shift: shift || assignment.shift,
      };
    });
  }, [employeeShifts, employees, shifts]);

  // Filter shifts that are applicable today and within time window
  const availableShiftsForSession = useMemo(() => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    
    return shifts.filter(shift => {
      // Check if shift is active on current day
      if (!shift[currentDay]) return false;
      // Check if current time is within shift hours
      return currentTime >= shift.start_time && currentTime <= shift.end_time;
    });
  }, [shifts]);

  // Sessions handlers
  const handleStartSession = async () => {
    if (!selectedShiftForSession) {
      showNotification('Please select a shift to start the session.', 'warning');
      return;
    }
    
    // Find the selected shift
    const selectedShift = shifts.find(s => String(s.id) === String(selectedShiftForSession));
    if (!selectedShift) {
      showNotification('Selected shift not found.', 'error');
      return;
    }
    
    // Check if current time is within shift time
    if (!isWithinShiftTime(selectedShift)) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const now = new Date();
      const currentDay = days[now.getDay()];
      const dayName = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
      showNotification(`Cannot start session: Current time is outside the shift hours (${selectedShift.start_time} - ${selectedShift.end_time}) on ${dayName}.`, 'warning');
      return;
    }
    
    try {
      await api.createAttendanceSession(selectedShiftForSession);
      showNotification('Attendance session started successfully.', 'success');
      setSessionDialogOpen(false);
      setSelectedShiftForSession('');
      // Reload sessions with enrichment
      const sessionsData = await api.listAttendanceSessions().catch(() => []);
      const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];
      const enrichedSessions = await enrichSessions(sessionsList);
      setSessions(enrichedSessions);
    } catch (err) {
      console.error('Failed to start session:', err);
      showNotification(err.message || 'Failed to start attendance session.', 'error');
    }
  };

  const handleCloseSession = async (sessionId) => {
    const confirmed = window.confirm('Are you sure you want to close this attendance session?');
    if (!confirmed) return;
    try {
      await api.closeAttendanceSession(sessionId);
      showNotification('Attendance session closed successfully.', 'success');
      // Reload sessions with enrichment
      const sessionsData = await api.listAttendanceSessions().catch(() => []);
      const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];
      const enrichedSessions = await enrichSessions(sessionsList);
      setSessions(enrichedSessions);
    } catch (err) {
      console.error('Failed to close session:', err);
      showNotification(err.message || 'Failed to close attendance session.', 'error');
    }
  };

  // Employee Shifts handlers
  // Count shifts per employee per day (returns max shifts across all days)
  const getEmployeeShiftCount = (employeeId) => {
    const employeeShiftAssignments = employeeShifts.filter(assignment => {
      const empId = typeof assignment.employee === 'object' && assignment.employee !== null
        ? assignment.employee.id
        : assignment.employee;
      return String(empId) === String(employeeId);
    });
    
    // Count shifts for each day and return the maximum
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let maxShiftsPerDay = 0;
    
    days.forEach(day => {
      const shiftsOnDay = employeeShiftAssignments.filter(a => a.shift && a.shift[day]);
      if (shiftsOnDay.length > maxShiftsPerDay) {
        maxShiftsPerDay = shiftsOnDay.length;
      }
    });
    
    return maxShiftsPerDay;
  };

  const handleAssignEmployeeShift = async () => {
    if (!employeeShiftForm.employee || !employeeShiftForm.shift) {
      showNotification('Please select both employee and shift.', 'warning');
      return;
    }
    
    // Check if shift is already assigned to employee
    const isAlreadyAssigned = employeeShifts.some(assignment => {
      const empId = typeof assignment.employee === 'object' && assignment.employee !== null
        ? assignment.employee.id
        : assignment.employee;
      const shiftId = typeof assignment.shift === 'object' && assignment.shift !== null
        ? assignment.shift.id
        : assignment.shift;
      return String(empId) === String(employeeShiftForm.employee) && 
             String(shiftId) === String(employeeShiftForm.shift);
    });
    
    if (isAlreadyAssigned) {
      showNotification('This shift is already assigned to this employee.', 'warning');
      return;
    }
    
    // Check if employee already has 2 shifts on any day
    const currentShiftCount = getEmployeeShiftCount(employeeShiftForm.employee);
    if (currentShiftCount >= 2) {
      showNotification('Employee already has reached maximum of 2 shifts per day. Cannot assign more shifts.', 'error');
      return;
    }
    
    // Get the shift being assigned to check its days
    const selectedShift = shifts.find(s => String(s.id) === String(employeeShiftForm.shift));
    if (selectedShift) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const daysWithNewShift = days.filter(day => selectedShift[day]);
      
      // Check if adding this shift would exceed limit on any day
      for (const day of daysWithNewShift) {
        const existingShiftsOnDay = employeeShifts.filter(assignment => {
          const empId = typeof assignment.employee === 'object' && assignment.employee !== null
            ? assignment.employee.id
            : assignment.employee;
          return String(empId) === String(employeeShiftForm.employee) && 
                 assignment.shift && assignment.shift[day];
        });
        
        if (existingShiftsOnDay.length >= 2) {
          showNotification(`Cannot assign shift. Employee already has 2 shifts on ${day.charAt(0).toUpperCase() + day.slice(1)}. Maximum is 2 shifts per day.`, 'error');
          return;
        }
      }
    }
    
    try {
      await api.assignEmployeeShift(employeeShiftForm.employee, employeeShiftForm.shift);
      showNotification('Shift assigned to employee successfully.', 'success');
      setEmployeeShiftDialogOpen(false);
      setEmployeeShiftForm({ employee: '', shift: '' });
      setEmployeeSearch('');
      // Reload employee shifts
      const data = await api.listEmployeeShifts();
      setEmployeeShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      // Extract error message from various possible formats
      let errorMsg = 'Failed to assign shift to employee.';
      
      if (err?.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data?.detail) {
          errorMsg = data.detail;
        } else if (data?.message) {
          errorMsg = data.message;
        } else if (data?.error) {
          errorMsg = data.error;
        } else if (typeof data === 'object' && data !== null) {
          const values = Object.values(data).flat();
          if (values.length > 0) {
            errorMsg = values.join(', ');
          }
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      console.warn('Shift assignment failed:', errorMsg);
      showNotification(errorMsg, 'error');
    }
  };

  const handleRemoveEmployeeShift = async (assignmentId) => {
    const confirmed = window.confirm('Are you sure you want to remove this shift assignment?');
    if (!confirmed) return;
    try {
      await api.removeEmployeeShift(assignmentId);
      showNotification('Shift assignment removed successfully.', 'success');
      // Reload employee shifts
      const data = await api.listEmployeeShifts();
      setEmployeeShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to remove shift assignment:', err);
      showNotification(err.message || 'Failed to remove shift assignment.', 'error');
    }
  };

  if (!canManageSessions && !canManageEmployeeShifts) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have permission to view attendance sessions.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Attendance Sessions & Employee Shifts
      </Typography>

      {/* Attendance Sessions Section */}
      {canManageSessions && (
        <Box sx={{ mt: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Attendance Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start and manage attendance sessions for shifts.
          </Typography>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">Active Sessions</Typography>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={() => setSessionDialogOpen(true)}
                  size="small"
                >
                  Start Session
                </Button>
              </Stack>

              {sessionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSessionError('')}>
                  {sessionError}
                </Alert>
              )}

              {sessionsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : sessions.length === 0 ? (
                <Alert severity="info">No attendance sessions found.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Shift Name</strong></TableCell>
                      <TableCell><strong>Started By</strong></TableCell>
                      <TableCell><strong>Started At</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id} hover>
                        <TableCell><strong>{session.shift?.name || 'Unknown'}</strong></TableCell>
                        <TableCell>{session.started_by?.email || session.started_by?.full_name || 'Unknown'}</TableCell>
                        <TableCell>
                          {session.started_at ? new Date(session.started_at).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={session.is_active ? 'Active' : 'Closed'}
                            size="small"
                            color={session.is_active ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {session.is_active && (
                            <Tooltip title="Close Session">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCloseSession(session.id)}
                              >
                                <Stop fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Start Attendance Session</DialogTitle>
            <DialogContent dividers>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Shift</InputLabel>
                  <Select
                  value={selectedShiftForSession}
                  label="Select Shift"
                  onChange={(e) => setSelectedShiftForSession(e.target.value)}
                >
                  {availableShiftsForSession.length > 0 ? (
                    availableShiftsForSession.map((shift) => (
                      <MenuItem key={shift.id} value={shift.id}>
                        {shift.name} ({shift.start_time} - {shift.end_time})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled value="">
                      No shifts available at current time
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSessionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleStartSession} variant="contained">
                Start Session
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* Employee Shift Assignments Section */}
      {canManageEmployeeShifts && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Employee Shift Assignments
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign shifts to employees. Search by email, name, or employee code.
          </Typography>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">Assignments</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setEmployeeShiftDialogOpen(true)}
                  size="small"
                >
                  Assign Shift
                </Button>
              </Stack>

              {employeeShiftsError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmployeeShiftsError('')}>
                  {employeeShiftsError}
                </Alert>
              )}

              {employeeShiftsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : enrichedEmployeeShifts.length === 0 ? (
                <Alert severity="info">No employee shift assignments found.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Employee</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Shift</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enrichedEmployeeShifts.map((assignment) => (
                      <TableRow key={assignment.id} hover>
                        <TableCell>
                          {assignment.employee?.full_name || assignment.employee?.employee_code || 'Unknown'}
                        </TableCell>
                        <TableCell>{assignment.employee?.user?.email || '-'}</TableCell>
                        <TableCell>{assignment.shift?.name || 'Unknown'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove Assignment">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveEmployeeShift(assignment.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={employeeShiftDialogOpen}
            onClose={() => {
              setEmployeeShiftDialogOpen(false);
              setEmployeeSearch('');
              setEmployeeShiftForm({ employee: '', shift: '' });
            }}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Assign Shift to Employee</DialogTitle>
            <DialogContent dividers>
              <TextField
                fullWidth
                sx={{ mt: 2 }}
                label="Search Employee"
                placeholder="Search by email, name, or employee code..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                name="attendance-employee-search"
                id="attendance-employee-search"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: employeeSearch && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setEmployeeSearch('')}>
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={employeeShiftForm.employee}
                  label="Select Employee"
                  onChange={(e) => setEmployeeShiftForm((prev) => ({ ...prev, employee: e.target.value }))}
                  disabled={employeeShiftsLoading || filteredEmployees.length === 0}
                >
                  {filteredEmployees.length === 0 ? (
                    <MenuItem disabled value="">
                      {employeeShiftsLoading ? 'Loading employees...' : 'No employees found'}
                    </MenuItem>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.full_name || emp.employee_code || 'Unknown'} ({emp.user?.email || 'No email'})
                      </MenuItem>
                    ))
                  )}
                </Select>
                {filteredEmployees.length === 0 && !employeeShiftsLoading && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                    No employees available. Make sure employees are created and assigned to your department.
                  </Typography>
                )}
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Shift</InputLabel>
                <Select
                  value={employeeShiftForm.shift}
                  label="Select Shift"
                  onChange={(e) => setEmployeeShiftForm((prev) => ({ ...prev, shift: e.target.value }))}
                >
                  {shifts.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.start_time} - {shift.end_time})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Warning message if employee has 2 shifts */}
              {employeeShiftForm.employee && (() => {
                const currentShiftCount = getEmployeeShiftCount(employeeShiftForm.employee);
                const selectedShift = shifts.find(s => String(s.id) === String(employeeShiftForm.shift));
                
                if (currentShiftCount >= 2) {
                  return (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      This employee already has 2 shifts on some days. Maximum allowed is 2 shifts per employee per day.
                    </Alert>
                  );
                }
                
                // Check if adding selected shift would exceed limit
                if (selectedShift) {
                  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  const daysWithNewShift = days.filter(day => selectedShift[day]);
                  
                  for (const day of daysWithNewShift) {
                    const existingShiftsOnDay = employeeShifts.filter(assignment => {
                      const empId = typeof assignment.employee === 'object' && assignment.employee !== null
                        ? assignment.employee.id
                        : assignment.employee;
                      return String(empId) === String(employeeShiftForm.employee) && 
                             assignment.shift && assignment.shift[day];
                    });
                    
                    if (existingShiftsOnDay.length >= 2) {
                      return (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          Cannot assign this shift. Employee already has 2 shifts on {day}. Maximum allowed is 2 shifts per day.
                        </Alert>
                      );
                    }
                    
                    if (existingShiftsOnDay.length === 1) {
                      return (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          Note: Employee already has 1 shift on {day}. This will be their second shift on that day.
                        </Alert>
                      );
                    }
                  }
                }
                
                return null;
              })()}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setEmployeeShiftDialogOpen(false);
                  setEmployeeSearch('');
                  setEmployeeShiftForm({ employee: '', shift: '' });
                }}
              >
                Cancel
              </Button>
              <Tooltip 
                title={(() => {
                  if (!employeeShiftForm.employee || !employeeShiftForm.shift) return 'Please select both employee and shift';
                  const currentShiftCount = getEmployeeShiftCount(employeeShiftForm.employee);
                  if (currentShiftCount >= 2) return 'Employee already has maximum of 2 shifts per day';
                  const selectedShift = shifts.find(s => String(s.id) === String(employeeShiftForm.shift));
                  if (selectedShift) {
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    const daysWithNewShift = days.filter(day => selectedShift[day]);
                    for (const day of daysWithNewShift) {
                      const existingShiftsOnDay = employeeShifts.filter(assignment => {
                        const empId = typeof assignment.employee === 'object' && assignment.employee !== null
                          ? assignment.employee.id
                          : assignment.employee;
                        return String(empId) === String(employeeShiftForm.employee) && 
                               assignment.shift && assignment.shift[day];
                      });
                      if (existingShiftsOnDay.length >= 2) return `Employee already has 2 shifts on ${day}`;
                    }
                  }
                  return '';
                })()}
                arrow
              >
                <span>
                  <Button 
                    onClick={handleAssignEmployeeShift} 
                    variant="contained"
                    disabled={(() => {
                      // Basic validation
                      if (!employeeShiftForm.employee || !employeeShiftForm.shift) return true;
                      
                      // Check if employee has reached max shifts
                      const currentShiftCount = getEmployeeShiftCount(employeeShiftForm.employee);
                      if (currentShiftCount >= 2) return true;
                      
                      // Check if adding selected shift would exceed limit on any day
                      const selectedShift = shifts.find(s => String(s.id) === String(employeeShiftForm.shift));
                      if (selectedShift) {
                        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                        const daysWithNewShift = days.filter(day => selectedShift[day]);
                        
                        for (const day of daysWithNewShift) {
                          const existingShiftsOnDay = employeeShifts.filter(assignment => {
                            const empId = typeof assignment.employee === 'object' && assignment.employee !== null
                              ? assignment.employee.id
                              : assignment.employee;
                            return String(empId) === String(employeeShiftForm.employee) && 
                                   assignment.shift && assignment.shift[day];
                          });
                          
                          if (existingShiftsOnDay.length >= 2) return true;
                        }
                      }
                      
                      return false;
                    })()}
                  >
                    Assign
                  </Button>
                </span>
              </Tooltip>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default AttendanceSessions;

