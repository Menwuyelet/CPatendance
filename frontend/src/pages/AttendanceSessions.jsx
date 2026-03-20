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
  TableContainer,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PlayArrow, Stop, Search, Clear, Refresh as RefreshIcon } from '@mui/icons-material';
import { api } from '../services/api.service.js';

const ATTENDANCE_SESSIONS_CACHE_KEY = 'attendance.sessions.pageCache.v1';

const readPersistedAttendanceSessionsCache = () => {
  if (typeof window === 'undefined') {
    return {
      sessions: null,
      shifts: null,
      employees: null,
      employeeShifts: null,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(ATTENDANCE_SESSIONS_CACHE_KEY);
    if (!raw) {
      return {
        sessions: null,
        shifts: null,
        employees: null,
        employeeShifts: null,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : null,
      shifts: Array.isArray(parsed?.shifts) ? parsed.shifts : null,
      employees: Array.isArray(parsed?.employees) ? parsed.employees : null,
      employeeShifts: Array.isArray(parsed?.employeeShifts) ? parsed.employeeShifts : null,
    };
  } catch (error) {
    // console.warn('Unable to read attendance sessions cache:', error);
    return {
      sessions: null,
      shifts: null,
      employees: null,
      employeeShifts: null,
    };
  }
};

const persistAttendanceSessionsCache = (cache) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(ATTENDANCE_SESSIONS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // console.warn('Unable to persist attendance sessions cache:', error);
  }
};

let attendanceSessionsPageCache = readPersistedAttendanceSessionsCache();

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

// Helper function to enrich sessions with shift and user data
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

    // console.log('Enriching sessions - Users:', usersList.length, 'Employees:', employeesList.length, 'Shifts:', shiftsList.length);

    // Create lookup maps for faster access
    const shiftsMap = new Map(shiftsList.map(s => [String(s.id), s]));
    const usersMap = new Map(usersList.map(u => [String(u.id), u]));
    const employeesMap = new Map(employeesList.map(e => [String(e.user?.id), e]));

    // Enrich sessions with shift and user data
    return sessionsList.map((session) => {
      // Get shift ID (could be object with id, or just the id number)
      const shiftId = typeof session.shift === 'object' && session.shift !== null
        ? String(session.shift.id)
        : String(session.shift);
      
      // Get started_by ID (could be object with id, or just the id/UUID)
      const startedById = typeof session.started_by === 'object' && session.started_by !== null
        ? String(session.started_by.id)
        : String(session.started_by);

      // Find matching shift and user from maps
      const shift = shiftsMap.get(shiftId);
      const user = usersMap.get(startedById);
      
      // Find employee for this user to get full_name
      const employee = employeesMap.get(startedById);
      
      // Build enriched user object with full_name
      let enrichedUser = null;
      if (user) {
        // Priority: employee.full_name > user.full_name > user email
        enrichedUser = {
          ...user,
          full_name: employee?.full_name || user.full_name || user.email || 'Unknown User',
        };
      } else if (session.started_by) {
        // If user not found in list, use the raw started_by data with fallback
        const raw = session.started_by;
        enrichedUser = typeof raw === 'object' 
          ? { ...raw, full_name: raw.full_name || raw.email || 'Unknown User' }
          : { id: raw, full_name: 'Unknown User' };
      }

      console.log(`Session ${session.id}: started_by=${startedById}, user found=${!!user}, employee found=${!!employee}, full_name=${enrichedUser?.full_name}`);

      return {
        ...session,
        shift: shift || session.shift,
        started_by: enrichedUser,
      };
    });
  } catch (err) {
    console.error('Error enriching sessions:', err);
    // Return original sessions if enrichment fails
    return sessionsList;
  }
};

const AttendanceSessions = ({ role, onNotify: propsNotify }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [sessionStatusFilter, setSessionStatusFilter] = useState('ALL');
  const [sessionShiftFilter, setSessionShiftFilter] = useState('ALL');

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

    if (Array.isArray(attendanceSessionsPageCache.shifts)) {
      setShifts(attendanceSessionsPageCache.shifts);
      return;
    }

    const loadShifts = async () => {
      try {
        const data = await api.get('/attendance/shifts/');
        const shiftsList = Array.isArray(data) ? data : [];
        setShifts(shiftsList);
      } catch (err) {
        console.error('Failed to load shifts:', err);
      }
    };
    loadShifts();
  }, []);

  // Load attendance sessions
  useEffect(() => {
    if (!canManageSessions) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    if (Array.isArray(attendanceSessionsPageCache.sessions)) {
      setSessions(attendanceSessionsPageCache.sessions);
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
  }, []);

  // Load employee shifts
  useEffect(() => {
    if (!canManageEmployeeShifts) {
      setEmployeeShifts([]);
      setEmployeeShiftsLoading(false);
      return;
    }

    if (
      Array.isArray(attendanceSessionsPageCache.employees)
      && Array.isArray(attendanceSessionsPageCache.employeeShifts)
      && Array.isArray(attendanceSessionsPageCache.shifts)
    ) {
      setEmployees(attendanceSessionsPageCache.employees);
      setEmployeeShifts(attendanceSessionsPageCache.employeeShifts);
      setShifts(attendanceSessionsPageCache.shifts);
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

        // console.log('Loaded employees:', employeesList.length, employeesList);
        // console.log('Loaded employee shifts:', employeeShiftsList.length);

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

  useEffect(() => {
    attendanceSessionsPageCache = {
      ...attendanceSessionsPageCache,
      shifts: Array.isArray(shifts) ? shifts : null,
    };
    persistAttendanceSessionsCache(attendanceSessionsPageCache);
  }, [shifts]);

  useEffect(() => {
    attendanceSessionsPageCache = {
      ...attendanceSessionsPageCache,
      sessions: Array.isArray(sessions) ? sessions : null,
    };
    persistAttendanceSessionsCache(attendanceSessionsPageCache);
  }, [sessions]);

  useEffect(() => {
    attendanceSessionsPageCache = {
      ...attendanceSessionsPageCache,
      employees: Array.isArray(employees) ? employees : null,
    };
    persistAttendanceSessionsCache(attendanceSessionsPageCache);
  }, [employees]);

  useEffect(() => {
    attendanceSessionsPageCache = {
      ...attendanceSessionsPageCache,
      employeeShifts: Array.isArray(employeeShifts) ? employeeShifts : null,
    };
    persistAttendanceSessionsCache(attendanceSessionsPageCache);
  }, [employeeShifts]);

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

  const getShiftType = (shiftName) => {
    const value = String(shiftName || '').toLowerCase();
    if (value.includes('weekend')) return 'WEEKEND';
    if (value.includes('night')) return 'NIGHT';
    if (value.includes('afternoon')) return 'AFTERNOON';
    if (value.includes('morning')) return 'MORNING';
    return 'OTHER';
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesStatus =
        sessionStatusFilter === 'ALL'
        || (sessionStatusFilter === 'ACTIVE' && session.is_active)
        || (sessionStatusFilter === 'CLOSED' && !session.is_active);

      const shiftType = getShiftType(session.shift?.name);
      const matchesShiftType = sessionShiftFilter === 'ALL' || shiftType === sessionShiftFilter;

      return matchesStatus && matchesShiftType;
    });
  }, [sessions, sessionStatusFilter, sessionShiftFilter]);

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

    // Check for if selected session is already active
    const isAlreadyActive = sessions.some(session => 
      String(session.shift?.id) === String(selectedShiftForSession) && session.is_active
    );
    if (isAlreadyActive) {
      showNotification('Selected session is already active.', 'warning');
      return;
    }

    // check if there is an active session for any shift
    const isAnySessionActive = sessions.some(session => session.is_active);
    if (isAnySessionActive) {
      showNotification('There is already an active attendance session. Please close it before starting a new one.', 'warning');
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

  const handleRefreshAttendanceData = async () => {
    if (!canManageSessions && !canManageEmployeeShifts) return;

    try {
      setSessionsLoading(canManageSessions);
      setEmployeeShiftsLoading(canManageEmployeeShifts);
      setSessionError('');
      setEmployeeShiftsError('');

      const tasks = [];

      if (canManageSessions) {
        tasks.push(
          (async () => {
            const sessionsData = await api.listAttendanceSessions().catch(() => []);
            const sessionsList = Array.isArray(sessionsData) ? sessionsData : [];
            const enrichedSessions = await enrichSessions(sessionsList);
            setSessions(enrichedSessions);
          })(),
        );
      }

      if (canManageEmployeeShifts) {
        tasks.push(
          (async () => {
            const [employeesData, employeeShiftsData, shiftsData] = await Promise.all([
              api.get('/employees/employees/').catch(() => []),
              api.listEmployeeShifts().catch(() => []),
              api.get('/attendance/shifts/').catch(() => []),
            ]);

            const employeesList = Array.isArray(employeesData)
              ? employeesData
              : employeesData?.results || employeesData?.data || [];
            const employeeShiftsList = Array.isArray(employeeShiftsData)
              ? employeeShiftsData
              : employeeShiftsData?.results || employeeShiftsData?.data || [];
            const shiftsList = Array.isArray(shiftsData)
              ? shiftsData
              : shiftsData?.results || shiftsData?.data || [];

            setEmployees(employeesList);
            setEmployeeShifts(employeeShiftsList);
            setShifts(shiftsList);
          })(),
        );
      }

      await Promise.all(tasks);
      showNotification('Attendance session data refreshed successfully.', 'success');
    } catch (err) {
      console.error('Failed to refresh attendance session data:', err);
      showNotification('Failed to refresh attendance session data.', 'error');
    } finally {
      setSessionsLoading(false);
      setEmployeeShiftsLoading(false);
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
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Attendance Sessions & Employee Shifts
      </Typography>

      {/* Attendance Sessions Section */}
      {canManageSessions && (
        <Box sx={{ mt: 3, mb: 4 }}>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">Active Sessions</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefreshAttendanceData}
                    size="small"
                    fullWidth={isMobile}
                    disabled={sessionsLoading || employeeShiftsLoading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => setSessionDialogOpen(true)}
                    size="small"
                    fullWidth={isMobile}
                  >
                    Start Session
                  </Button>
                </Stack>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ mb: 2 }}
              >
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
                  <InputLabel>Session Status</InputLabel>
                  <Select
                    value={sessionStatusFilter}
                    label="Session Status"
                    onChange={(e) => setSessionStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Sessions</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="CLOSED">Closed</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                  <InputLabel>Shift Type</InputLabel>
                  <Select
                    value={sessionShiftFilter}
                    label="Shift Type"
                    onChange={(e) => setSessionShiftFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Shift Types</MenuItem>
                    <MenuItem value="MORNING">Morning</MenuItem>
                    <MenuItem value="AFTERNOON">Afternoon</MenuItem>
                    <MenuItem value="WEEKEND">Weekend</MenuItem>
                    <MenuItem value="NIGHT">Night</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={() => {
                    setSessionStatusFilter('ALL');
                    setSessionShiftFilter('ALL');
                  }}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                >
                  Clear Filters
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip label={`${filteredSessions.length} shown`} color="primary" variant="outlined" size="small" />
                <Chip label={`${sessions.filter((s) => s.is_active).length} active`} color="success" size="small" />
                <Chip label={`${sessions.filter((s) => !s.is_active).length} closed`} size="small" />
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
              ) : filteredSessions.length === 0 ? (
                <Alert severity="info">No sessions match the selected filters.</Alert>
              ) : isMobile ? (
                <Stack spacing={1.5}>
                  {filteredSessions.map((session) => (
                    <Paper key={session.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="subtitle2" fontWeight={700}>
                            {session.shift?.name || 'Unknown'}
                          </Typography>
                          <Chip
                            label={session.is_active ? 'Active' : 'Closed'}
                            size="small"
                            color={session.is_active ? 'success' : 'default'}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          By: {session.started_by?.full_name || session.started_by?.email || `User ID: ${session.started_by?.id || session.started_by || 'Unknown'}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Started: {session.started_at ? new Date(session.started_at).toLocaleString() : '-'}
                        </Typography>
                        {session.is_active && (
                          <Box>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              startIcon={<Stop fontSize="small" />}
                              onClick={() => handleCloseSession(session.id)}
                              fullWidth
                            >
                              Close Session
                            </Button>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <TableContainer>
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
                      {filteredSessions.map((session) => (
                        <TableRow key={session.id} hover>
                          <TableCell><strong>{session.shift?.name || 'Unknown'}</strong></TableCell>
                          <TableCell>
                            {session.started_by?.full_name || session.started_by?.email || `User ID: ${session.started_by?.id || session.started_by || 'Unknown'}`}
                          </TableCell>
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
                </TableContainer>
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
    </Box>
  );
};

export default AttendanceSessions;

