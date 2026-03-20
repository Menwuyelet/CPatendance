// src/pages/Shifts.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Box,
  Card,
  CardContent,
  TableContainer,
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
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Chip,
  Paper,
  Collapse,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Refresh as RefreshIcon,
  Search, 
  Clear, 
  FilterList, 
  ExpandMore, 
  ExpandLess,
  AccessTime,
  Schedule,
  LightMode,
  DarkMode
} from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { api } from '../services/api.service.js';
import { format, parse } from 'date-fns';

const SHIFT_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const getDayLabels = (item) =>
  SHIFT_DAYS.filter((day) => item?.[day]).map((day) => day.charAt(0).toUpperCase() + day.slice(1, 3));

const getDurationLabel = (startTime, endTime) => {
  if (!startTime || !endTime) return '';

  const diffMs = endTime - startTime;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHrs}h ${diffMins}m`;
};

const SHIFTS_PAGE_CACHE_KEY = 'attendance.shifts.pageCache.v1';

const readPersistedShiftsPageCache = () => {
  if (typeof window === 'undefined') {
    return {
      shifts: null,
      employees: null,
      employeeShifts: null,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(SHIFTS_PAGE_CACHE_KEY);
    if (!raw) {
      return {
        shifts: null,
        employees: null,
        employeeShifts: null,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      shifts: Array.isArray(parsed?.shifts) ? parsed.shifts : null,
      employees: Array.isArray(parsed?.employees) ? parsed.employees : null,
      employeeShifts: Array.isArray(parsed?.employeeShifts) ? parsed.employeeShifts : null,
    };
  } catch (error) {
    // console.warn('Unable to read persisted shifts cache:', error);
    return {
      shifts: null,
      employees: null,
      employeeShifts: null,
    };
  }
};

const persistShiftsPageCache = (cache) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(SHIFTS_PAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Unable to persist shifts cache:', error);
  }
};

const stripShiftViewFields = (shift) => {
  if (!shift || typeof shift !== 'object') return shift;

  const {
    start_time_date,
    end_time_date,
    start_time_display,
    end_time_display,
    ...rest
  } = shift;

  return rest;
};

// Module-level cache so revisiting the route doesn't re-fetch by default.
let shiftsPageCache = readPersistedShiftsPageCache();

let shiftsPageInFlight = {
  shifts: null,
  employeeData: null,
};

const Shifts = ({ role, onNotify: propsNotify }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
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
  const canViewShifts = isAdmin || isHR || isManager;
  const canManageShifts = isHR || isManager;
  const canManageEmployeeShifts = isHR || isManager;

  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftError, setShiftError] = useState('');
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [timeFormat, setTimeFormat] = useState('12'); // '12' or '24'
  const [ampmMode, setAmpmMode] = useState(true); // true = AM/PM, false = 24h

  // Employee Shift Assignment state
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [employeeShiftsLoading, setEmployeeShiftsLoading] = useState(false);
  const [employeeShiftsError, setEmployeeShiftsError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeeShiftDialogOpen, setEmployeeShiftDialogOpen] = useState(false);
  const [employeeShiftForm, setEmployeeShiftForm] = useState({ employee: '', shift: '' });
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Filtering state
  const [shiftFilters, setShiftFilters] = useState({
    search: '',
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
    timeRange: {
      start: null,
      end: null,
    }
  });

  const [employeeShiftFilters, setEmployeeShiftFilters] = useState({
    search: '',
    shift: '',
    employeeStatus: '',
  });

  // UI state for filters
  const [shiftFilterExpanded, setShiftFilterExpanded] = useState(false);
  const [employeeShiftFilterExpanded, setEmployeeShiftFilterExpanded] = useState(false);
  const [showFullShiftList, setShowFullShiftList] = useState(false);
  const [showFullEmployeeList, setShowFullEmployeeList] = useState(false);
  const [expandedEmployeeRows, setExpandedEmployeeRows] = useState({});

  const emptyShiftForm = {
    name: '',
    start_time: null,
    end_time: null,
    description: '',
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };
  
  const [shiftForm, setShiftForm] = useState(emptyShiftForm);

  // Helper function to convert time string to Date object with AM/PM support
  const timeStringToDate = (timeStr) => {
    if (!timeStr) return null;
    
    try {
      // Try to parse 12-hour format first (with AM/PM)
      const formatsToTry = [
        'h:mm a',      // 1:30 PM
        'h:mm:ss a',   // 1:30:00 PM
        'h:mm',        // 1:30 (no AM/PM)
        'HH:mm',       // 13:30 (24-hour)
        'HH:mm:ss',    // 13:30:00 (24-hour)
      ];

      for (const formatStr of formatsToTry) {
        try {
          const parsed = parse(timeStr, formatStr, new Date());
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch (e) {
          continue;
        }
      }

      // If parsing fails, try to manually parse
      const [timePart, ampm] = timeStr.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hours < 12) {
          hours += 12;
        } else if (ampm.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
      }
      
      const date = new Date();
      date.setHours(hours, minutes || 0, 0, 0);
      return date;
    } catch (error) {
      console.error('Error parsing time:', timeStr, error);
      return null;
    }
  };

  // Helper function to convert Date object to formatted time string
  const formatTime = (date, formatType = '12') => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    
    if (formatType === '12') {
      // 12-hour format with AM/PM
      return format(date, 'h:mm a');
    } else {
      // 24-hour format
      return format(date, 'HH:mm');
    }
  };

  // Helper to get time display string with AM/PM
  const getTimeDisplay = (date) => {
    return formatTime(date, timeFormat);
  };

  const processShiftList = (list) =>
    list.map((shift) => {
      const startTimeDate = timeStringToDate(shift.start_time);
      const endTimeDate = timeStringToDate(shift.end_time);
      return {
        ...shift,
        start_time_date: startTimeDate,
        end_time_date: endTimeDate,
        start_time_display: formatTime(startTimeDate, timeFormat),
        end_time_display: formatTime(endTimeDate, timeFormat),
      };
    });

  const loadShiftList = async ({ force = false } = {}) => {
    if (!canViewShifts) {
      setShifts([]);
      setShiftsLoading(false);
      return false;
    }

    try {
      if (!force && Array.isArray(shiftsPageCache.shifts)) {
        setShifts(processShiftList(shiftsPageCache.shifts));
        setShiftsLoading(false);
        return true;
      }

      setShiftsLoading(true);
      setShiftError('');

      if (!force && shiftsPageInFlight.shifts) {
        const sharedData = await shiftsPageInFlight.shifts;
        setShifts(processShiftList(sharedData));
        return true;
      }

      const requestPromise = api.get('/attendance/shifts/');
      shiftsPageInFlight.shifts = requestPromise;
      const data = await requestPromise;
      const list = Array.isArray(data) ? data : [];
      shiftsPageCache.shifts = list;
      setShifts(processShiftList(list));
      return true;
    } catch (err) {
      console.error('Unable to load shifts:', err);
      setShifts([]);
      setShiftError('Unable to load shifts.');
      if (err.response?.status !== 403) {
        showNotification('Failed to fetch shifts from server.', 'error');
      }
      return false;
    } finally {
      shiftsPageInFlight.shifts = null;
      setShiftsLoading(false);
    }
  };

  const loadEmployeeAssignmentData = async ({ force = false } = {}) => {
    if (!canManageEmployeeShifts) {
      setEmployeeShifts([]);
      setEmployees([]);
      setEmployeeShiftsLoading(false);
      return false;
    }

    try {
      if (
        !force &&
        Array.isArray(shiftsPageCache.employees) &&
        Array.isArray(shiftsPageCache.employeeShifts)
      ) {
        setEmployees(shiftsPageCache.employees);
        setEmployeeShifts(shiftsPageCache.employeeShifts);
        setEmployeeShiftsLoading(false);
        return true;
      }

      setEmployeeShiftsLoading(true);
      setEmployeeShiftsError('');

      if (!force && shiftsPageInFlight.employeeData) {
        const sharedData = await shiftsPageInFlight.employeeData;
        setEmployees(sharedData.employees);
        setEmployeeShifts(sharedData.employeeShifts);
        return true;
      }

      const requestPromise = Promise.all([
        api.get('/employees/employees/').catch((err) => {
          console.error('Error loading employees:', err);
          return [];
        }),
        api.listEmployeeShifts().catch((err) => {
          console.error('Error loading employee shifts:', err);
          return [];
        }),
      ]).then(([employeesData, employeeShiftsData]) => ({
        employees: Array.isArray(employeesData)
          ? employeesData
          : employeesData?.results || employeesData?.data || [],
        employeeShifts: Array.isArray(employeeShiftsData)
          ? employeeShiftsData
          : employeeShiftsData?.results || employeeShiftsData?.data || [],
      }));

      shiftsPageInFlight.employeeData = requestPromise;
      const nextData = await requestPromise;

      shiftsPageCache.employees = nextData.employees;
      shiftsPageCache.employeeShifts = nextData.employeeShifts;
      setEmployees(nextData.employees);
      setEmployeeShifts(nextData.employeeShifts);
      return true;
    } catch (err) {
      console.error('Unable to load employee shifts:', err);
      setEmployeeShifts([]);
      setEmployees([]);
      setEmployeeShiftsError('Unable to load employee shifts.');
      showNotification('Failed to fetch employee shifts.', 'error');
      return false;
    } finally {
      shiftsPageInFlight.employeeData = null;
      setEmployeeShiftsLoading(false);
    }
  };

  const handleRefreshLists = async () => {
    const [shiftOk, employeeOk] = await Promise.all([
      loadShiftList({ force: true }),
      canManageEmployeeShifts ? loadEmployeeAssignmentData({ force: true }) : Promise.resolve(true),
    ]);

    if (shiftOk && employeeOk) {
      showNotification('Shifts data refreshed successfully.', 'success');
    }
  };

  useEffect(() => {
    loadShiftList({ force: false });
  }, [canViewShifts]);

  // Load employee shifts and employees
  useEffect(() => {
    loadEmployeeAssignmentData({ force: false });
  }, [canManageEmployeeShifts]);

  // Update cached display labels when user changes preferred time format.
  useEffect(() => {
    setShifts((prev) =>
      prev.map((shift) => ({
        ...shift,
        start_time_display: formatTime(shift.start_time_date, timeFormat),
        end_time_display: formatTime(shift.end_time_date, timeFormat),
      })),
    );
  }, [timeFormat]);

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
      const employeeId = typeof assignment.employee === 'object' && assignment.employee !== null
        ? assignment.employee.id
        : assignment.employee;
      
      const shiftId = typeof assignment.shift === 'object' && assignment.shift !== null
        ? assignment.shift.id
        : assignment.shift;
      
      const employee = employees.find((emp) => String(emp.id) === String(employeeId));
      const shift = shifts.find((s) => String(s.id) === String(shiftId));
      
      return {
        ...assignment,
        employee: employee || assignment.employee,
        shift: shift || assignment.shift,
      };
    });
  }, [employeeShifts, employees, shifts]);

  // Filter shifts based on multiple criteria
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const { search, days, timeRange } = shiftFilters;
      
      // Text search filter
      const searchLower = search.toLowerCase();
      const name = (shift.name || '').toLowerCase();
      const description = (shift.description || '').toLowerCase();
      
      const matchesSearch = !search.trim() || 
        name.includes(searchLower) ||
        description.includes(searchLower);
      
      if (!matchesSearch) return false;
      
      // Days filter (any selected day must match)
      const selectedDays = Object.keys(days).filter(day => days[day]);
      if (selectedDays.length > 0) {
        const hasSelectedDay = selectedDays.some(day => shift[day]);
        if (!hasSelectedDay) return false;
      }
      
      // Time range filter (using Date objects)
      if (timeRange.start && timeRange.end) {
        const shiftStart = shift.start_time_date;
        const shiftEnd = shift.end_time_date;
        
        if (shiftStart && shiftEnd) {
          const shiftStartsWithin = shiftStart >= timeRange.start && shiftStart <= timeRange.end;
          const shiftEndsWithin = shiftEnd >= timeRange.start && shiftEnd <= timeRange.end;
          const filterWithinShift = timeRange.start >= shiftStart && timeRange.end <= shiftEnd;
          
          if (!(shiftStartsWithin || shiftEndsWithin || filterWithinShift)) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [shifts, shiftFilters]);

  // Filter employee shifts
  const filteredEmployeeShifts = useMemo(() => {
    return enrichedEmployeeShifts.filter(assignment => {
      const { search, shift: selectedShift, employeeStatus } = employeeShiftFilters;
      
      // Text search filter
      const searchLower = search.toLowerCase();
      const employee = assignment.employee || {};
      const employeeName = employee.full_name || '';
      const employeeEmail = employee.user?.email || '';
      const employeeCode = employee.employee_code || '';
      const shiftName = assignment.shift?.name || '';
      
      const matchesSearch = !search.trim() || 
        employeeName.toLowerCase().includes(searchLower) ||
        employeeEmail.toLowerCase().includes(searchLower) ||
        employeeCode.toLowerCase().includes(searchLower) ||
        shiftName.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
      
      // Shift filter
      if (selectedShift && assignment.shift?.id !== parseInt(selectedShift)) {
        return false;
      }
      
      // Employee status filter
      if (employeeStatus) {
        const empStatus = employee.status || employee.is_active;
        if (employeeStatus === 'active' && !empStatus) return false;
        if (employeeStatus === 'inactive' && empStatus) return false;
      }
      
      return true;
    });
  }, [enrichedEmployeeShifts, employeeShiftFilters]);

  const groupedEmployeeAssignments = useMemo(() => {
    const groupedMap = new Map();

    filteredEmployeeShifts.forEach((assignment) => {
      const employee = assignment.employee || {};
      const employeeId = typeof employee === 'object' && employee !== null ? employee.id : employee;
      const groupKey = String(employeeId || employee.user?.email || assignment.id);

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          employeeId,
          employee,
          assignments: [],
        });
      }

      groupedMap.get(groupKey).assignments.push(assignment);
    });

    return Array.from(groupedMap.values()).sort((a, b) => {
      const left = String(a.employee?.full_name || a.employee?.employee_code || '').toLowerCase();
      const right = String(b.employee?.full_name || b.employee?.employee_code || '').toLowerCase();
      return left.localeCompare(right);
    });
  }, [filteredEmployeeShifts]);

  const visibleShifts = useMemo(
    () => (showFullShiftList ? filteredShifts : filteredShifts.slice(0, 12)),
    [filteredShifts, showFullShiftList],
  );

  const visibleGroupedEmployeeAssignments = useMemo(
    () => (showFullEmployeeList ? groupedEmployeeAssignments : groupedEmployeeAssignments.slice(0, 12)),
    [groupedEmployeeAssignments, showFullEmployeeList],
  );

  // Get active filter count for shifts
  const activeShiftFilterCount = useMemo(() => {
    let count = 0;
    if (shiftFilters.search.trim()) count++;
    if (shiftFilters.timeRange.start) count++;
    if (shiftFilters.timeRange.end) count++;
    count += Object.values(shiftFilters.days).filter(Boolean).length;
    return count;
  }, [shiftFilters]);

  // Get active filter count for employee shifts
  const activeEmployeeShiftFilterCount = useMemo(() => {
    let count = 0;
    if (employeeShiftFilters.search.trim()) count++;
    if (employeeShiftFilters.shift) count++;
    if (employeeShiftFilters.employeeStatus) count++;
    return count;
  }, [employeeShiftFilters]);

  const handleShiftFieldChange = (field, value) => {
    setShiftForm((prev) => ({ ...prev, [field]: value }));
  };

  const openShiftDialogForCreate = () => {
    setEditingShift(null);
    setShiftForm(emptyShiftForm);
    setShiftDialogOpen(true);
  };

  const openShiftDialogForEdit = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name || '',
      start_time: shift.start_time_date || null,
      end_time: shift.end_time_date || null,
      description: shift.description || '',
      monday: !!shift.monday,
      tuesday: !!shift.tuesday,
      wednesday: !!shift.wednesday,
      thursday: !!shift.thursday,
      friday: !!shift.friday,
      saturday: !!shift.saturday,
      sunday: !!shift.sunday,
    });
    setShiftDialogOpen(true);
  };

  const closeShiftDialog = () => {
    setShiftDialogOpen(false);
    setEditingShift(null);
    setShiftForm(emptyShiftForm);
  };

  // Filter handler functions
  const handleShiftFilterChange = (field, value) => {
    setShiftFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayFilterChange = (day, checked) => {
    setShiftFilters(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: checked
      }
    }));
  };

  const handleTimeFilterChange = (type, value) => {
    setShiftFilters(prev => ({
      ...prev,
      timeRange: {
        ...prev.timeRange,
        [type]: value
      }
    }));
  };

  const handleEmployeeShiftFilterChange = (field, value) => {
    setEmployeeShiftFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearShiftFilters = () => {
    setShiftFilters({
      search: '',
      days: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      },
      timeRange: { start: null, end: null }
    });
    setShowFullShiftList(false);
  };

  const clearEmployeeShiftFilters = () => {
    setEmployeeShiftFilters({
      search: '',
      shift: '',
      employeeStatus: ''
    });
    setShowFullEmployeeList(false);
    setExpandedEmployeeRows({});
  };

  const toggleEmployeeRow = (rowKey) => {
    setExpandedEmployeeRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const handleTimeFormatChange = (event) => {
    const newFormat = event.target.value;
    setTimeFormat(newFormat);
    setAmpmMode(newFormat === '12');
    // Store preference in localStorage
    localStorage.setItem('timeFormat', newFormat);
    showNotification(`Time format changed to ${newFormat}-hour format`, 'info');
  };

  const handleSubmitShift = async () => {
    if (!canManageShifts) return;

    // Validate time
    if (!shiftForm.start_time || !shiftForm.end_time) {
      setShiftError('Please select both start and end times');
      showNotification('Please select both start and end times', 'warning');
      return;
    }

    if (shiftForm.start_time >= shiftForm.end_time) {
      setShiftError('End time must be after start time');
      showNotification('End time must be after start time', 'warning');
      return;
    }

    // Convert Date objects to 24-hour format strings for API
    const payload = {
      name: shiftForm.name,
      start_time: format(shiftForm.start_time, 'HH:mm'), // Always send 24-hour to API
      end_time: format(shiftForm.end_time, 'HH:mm'),     // Always send 24-hour to API
      description: shiftForm.description,
      monday: shiftForm.monday,
      tuesday: shiftForm.tuesday,
      wednesday: shiftForm.wednesday,
      thursday: shiftForm.thursday,
      friday: shiftForm.friday,
      saturday: shiftForm.saturday,
      sunday: shiftForm.sunday,
    };

    try {
      let result;
      if (editingShift && editingShift.id) {
        result = await api.put(`/attendance/shifts/${editingShift.id}/`, payload);
        showNotification('Shift updated successfully.', 'success');
      } else {
        result = await api.post('/attendance/shifts/', payload);
        showNotification('Shift created successfully.', 'success');
      }

      // Add date objects and formatted display times to the result for local state
      const startDate = timeStringToDate(result.start_time);
      const endDate = timeStringToDate(result.end_time);
      
      const processedResult = {
        ...result,
        start_time_date: startDate,
        end_time_date: endDate,
        start_time_display: formatTime(startDate, timeFormat),
        end_time_display: formatTime(endDate, timeFormat),
      };

      setShifts((prev) => {
        if (editingShift && editingShift.id) {
          return prev.map((s) => (s.id === result.id ? processedResult : s));
        }
        return [...prev, processedResult];
      });

      closeShiftDialog();
      setShiftError('');
    } catch (err) {
      console.error('Failed to save shift:', err);
      const message = err?.message || 'Failed to save shift.';
      setShiftError(message);
      showNotification(message, 'error');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!canManageShifts) return;
    const confirmed = window.confirm('Are you sure you want to delete this shift?');
    if (!confirmed) return;
    try {
      await api.delete(`/attendance/shifts/${shiftId}/`);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      showNotification('Shift deleted successfully.', 'success');
    } catch (err) {
      console.error('Failed to delete shift:', err);
      setShiftError('Failed to delete shift.');
      showNotification('Failed to delete shift.', 'error');
    }
  };

  // Employee Shift Assignment handlers
  // Count shifts per employee per day (returns max shifts across all days)
  const getEmployeeShiftCount = (employeeId) => {
    const employeeShiftAssignments = employeeShifts.filter(assignment => {
      const empId = typeof assignment.employee === 'object' && assignment.employee !== null
        ? assignment.employee.id
        : assignment.employee;
      return String(empId) === String(employeeId);
    });
    
    // Count shifts for each day and return the maximum
    let maxShiftsPerDay = 0;
    
    SHIFT_DAYS.forEach(day => {
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
      showNotification('Employee already has maximum of 2 shifts per day. Cannot assign more shifts.', 'error');
      return;
    }
    
    // Get the shift being assigned to check its days
    const selectedShift = shifts.find(s => String(s.id) === String(employeeShiftForm.shift));
    if (selectedShift) {
      const daysWithNewShift = SHIFT_DAYS.filter(day => selectedShift[day]);
      
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
          showNotification(`Cannot assign shift: Employee already has 2 shifts on ${day.charAt(0).toUpperCase() + day.slice(1)}. Maximum is 2 shifts per day.`, 'error');
          return;
        }
      }
    }
    
    try {
      const createdAssignment = await api.assignEmployeeShift(employeeShiftForm.employee, employeeShiftForm.shift);
      showNotification('Shift assigned to employee successfully.', 'success');
      setEmployeeShiftDialogOpen(false);
      setEmployeeShiftForm({ employee: '', shift: '' });
      setEmployeeSearch('');

      const optimisticAssignment =
        createdAssignment && typeof createdAssignment === 'object'
          ? createdAssignment
          : {
              id: `tmp-${Date.now()}`,
              employee: employeeShiftForm.employee,
              shift: employeeShiftForm.shift,
            };

      setEmployeeShifts((prev) => [optimisticAssignment, ...prev]);
    } catch (err) {
      // Extract error message
      let errorMsg = 'Failed to assign shift to employee.';
      
      try {
        if (err?.message) {
          errorMsg = err.message;
        }
        
        if (err?.response?.data) {
          const data = err.response.data;
          if (typeof data === 'string') {
            errorMsg = data;
          } else if (data?.detail) {
            errorMsg = data.detail;
          } else if (data?.message) {
            errorMsg = data.message;
          } else if (typeof data === 'object' && data !== null) {
            const values = Object.values(data);
            if (values.length > 0) {
              errorMsg = values.flat().join(', ');
            }
          }
        }
      } catch {
        // Ignore extraction errors
      }
      
      // Log warning (not spam)
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
      setEmployeeShifts((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
    } catch (err) {
      console.error('Failed to remove shift assignment:', err);
      showNotification(err.message || 'Failed to remove shift assignment.', 'error');
    }
  };

  // Load time format preference
  useEffect(() => {
    const savedFormat = localStorage.getItem('timeFormat');
    if (savedFormat) {
      setTimeFormat(savedFormat);
      setAmpmMode(savedFormat === '12');
    }
  }, []);

  useEffect(() => {
    shiftsPageCache = {
      ...shiftsPageCache,
      shifts: Array.isArray(shifts) ? shifts.map(stripShiftViewFields) : null,
    };
    persistShiftsPageCache(shiftsPageCache);
  }, [shifts]);

  useEffect(() => {
    shiftsPageCache = {
      ...shiftsPageCache,
      employees: Array.isArray(employees) ? employees : null,
    };
    persistShiftsPageCache(shiftsPageCache);
  }, [employees]);

  useEffect(() => {
    shiftsPageCache = {
      ...shiftsPageCache,
      employeeShifts: Array.isArray(employeeShifts) ? employeeShifts : null,
    };
    persistShiftsPageCache(shiftsPageCache);
  }, [employeeShifts]);

  if (!canViewShifts) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have permission to view shifts.</Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* Header with Time Format Toggle */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom fontWeight="600">
            Shift Management
          </Typography>
          
          <FormControl sx={{ width: { xs: '100%', md: 'auto' } }}>
            <ToggleButtonGroup
              value={timeFormat}
              exclusive
              onChange={handleTimeFormatChange}
              size="small"
              aria-label="time format"
              fullWidth={isMobile}
              orientation={isMobile ? 'vertical' : 'horizontal'}
            >
              <ToggleButton value="12" aria-label="12-hour format">
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                  <LightMode fontSize="small" />
                  <Typography variant="body2">12-Hour (AM/PM)</Typography>
                </Stack>
              </ToggleButton>
              <ToggleButton value="24" aria-label="24-hour format">
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                  <DarkMode fontSize="small" />
                  <Typography variant="body2">24-Hour</Typography>
                </Stack>
              </ToggleButton>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefreshLists}
                    size="small"
                    fullWidth={isMobile}
                    disabled={shiftsLoading || employeeShiftsLoading}
                  >
                    Refresh
                  </Button>
            </ToggleButtonGroup>
          </FormControl>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isAdmin
            ? 'View all defined shifts (read-only access).'
            : isManager
            ? 'View all defined shifts (read-only access). Only HR can create, edit, or delete shifts.'
            : 'View all defined shifts. HR can add, edit, or delete shifts.'}
        </Typography>

        {/* Shift List Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ mb: 2 }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Typography variant="h6">Shift List</Typography>
                {activeShiftFilterCount > 0 && (
                  <Chip 
                    label={`${activeShiftFilterCount} active`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                )}
                <Chip 
                  label={`${timeFormat}-hour format`} 
                  size="small" 
                  color="info"
                  variant="outlined"
                  icon={<AccessTime fontSize="small" />}
                />
                <Chip
                  label={`${visibleShifts.length}/${filteredShifts.length} shown`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  endIcon={shiftFilterExpanded ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setShiftFilterExpanded(!shiftFilterExpanded)}
                  size="small"
                  fullWidth={isMobile}
                >
                  Filter
                </Button>
                <Button
                  variant="outlined"
                  endIcon={showFullShiftList ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setShowFullShiftList((prev) => !prev)}
                  size="small"
                  fullWidth={isMobile}
                  disabled={filteredShifts.length <= 12}
                >
                  {showFullShiftList ? 'Show Less' : 'Show Full List'}
                </Button>
                {canManageShifts && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openShiftDialogForCreate}
                    size="small"
                    fullWidth={isMobile}
                  >
                    Add Shift
                  </Button>
                )}
              </Stack>
            </Stack>

            {/* Shift Filter Section */}
            <Collapse in={shiftFilterExpanded}>
              <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                  <TextField
                    size="small"
                    placeholder="Search shifts by name or description..."
                    value={shiftFilters.search}
                    onChange={(e) => handleShiftFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                      endAdornment: shiftFilters.search && (
                        <IconButton size="small" onClick={() => handleShiftFilterChange('search', '')}>
                          <Clear fontSize="small" />
                        </IconButton>
                      ),
                    }}
                    fullWidth
                    sx={{ flexGrow: 1 }}
                  />
                  
                  <Grid container spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TimePicker
                        label="From Time"
                        value={shiftFilters.timeRange.start}
                        onChange={(newValue) => handleTimeFilterChange('start', newValue)}
                        ampm={ampmMode}
                        textField={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            fullWidth
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTime fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TimePicker
                        label="To Time"
                        value={shiftFilters.timeRange.end}
                        onChange={(newValue) => handleTimeFilterChange('end', newValue)}
                        ampm={ampmMode}
                        textField={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            fullWidth
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTime fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                  
                  <Button
                    size="small"
                    onClick={clearShiftFilters}
                    startIcon={<Clear />}
                    variant="outlined"
                    disabled={activeShiftFilterCount === 0}
                    fullWidth={isMobile}
                  >
                    Clear All
                  </Button>
                </Stack>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Filter by Days:
                  </Typography>
                  <FormGroup row={!isMobile}>
                    {SHIFT_DAYS.map((day) => (
                      <FormControlLabel
                        key={day}
                        control={
                          <Checkbox
                            size="small"
                            checked={shiftFilters.days[day]}
                            onChange={(e) => handleDayFilterChange(day, e.target.checked)}
                          />
                        }
                        label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      />
                    ))}
                  </FormGroup>
                </Box>
              </Paper>
            </Collapse>

            {/* Error and Loading States */}
            {shiftError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setShiftError('')}>
                {shiftError}
              </Alert>
            )}

            {shiftsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : filteredShifts.length === 0 ? (
              <Alert severity="info">
                {shifts.length === 0 ? 'No shifts defined yet.' : 'No shifts match your filters.'}
                {activeShiftFilterCount > 0 && (
                  <Button size="small" onClick={clearShiftFilters} sx={{ ml: 1 }}>
                    Clear filters
                  </Button>
                )}
              </Alert>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Showing {visibleShifts.length} of {filteredShifts.length} filtered shifts ({shifts.length} total) • Displaying in {timeFormat}-hour format
                </Typography>
                {isTablet ? (
                  <Stack spacing={1.5}>
                    {visibleShifts.map((shift) => {
                      const days = getDayLabels(shift);
                      const duration = getDurationLabel(shift.start_time_date, shift.end_time_date);

                      return (
                        <Paper key={shift.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Stack spacing={1.25}>
                            <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" fontWeight={700} noWrap>
                                  {shift.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {shift.start_time_display || shift.start_time} - {shift.end_time_display || shift.end_time}
                                </Typography>
                              </Box>
                              {duration && <Chip label={duration} size="small" color="primary" variant="outlined" />}
                            </Stack>
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                              {days.length > 0 ? (
                                days.map((day) => <Chip key={day} label={day} size="small" variant="outlined" />)
                              ) : (
                                <Chip label="No active day" size="small" variant="outlined" />
                              )}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {shift.description || 'No description provided.'}
                            </Typography>
                            {canManageShifts && (
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button size="small" startIcon={<EditIcon />} onClick={() => openShiftDialogForEdit(shift)}>
                                  Edit
                                </Button>
                                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteShift(shift.id)}>
                                  Delete
                                </Button>
                              </Stack>
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Name</strong></TableCell>
                          <TableCell><strong>Time</strong></TableCell>
                          <TableCell><strong>Days</strong></TableCell>
                          <TableCell><strong>Duration</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                          {canManageShifts && (
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleShifts.map((shift) => {
                          const days = getDayLabels(shift);
                          const duration = getDurationLabel(shift.start_time_date, shift.end_time_date);

                          return (
                            <TableRow key={shift.id} hover>
                              <TableCell>{shift.name}</TableCell>
                              <TableCell>
                                <Stack direction="column" spacing={0.5}>
                                  <Typography variant="body2">
                                    {shift.start_time_display || shift.start_time} - {shift.end_time_display || shift.end_time}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    <AccessTime fontSize="inherit" /> {duration}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                  {days.map((day) => (
                                    <Chip key={day} label={day} size="small" variant="outlined" />
                                  ))}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={duration} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                                  {shift.description || '–'}
                                </Typography>
                              </TableCell>
                              {canManageShifts && (
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => openShiftDialogForEdit(shift)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteShift(shift.id)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Shift Dialog */}
        <Dialog
          open={shiftDialogOpen}
          onClose={closeShiftDialog}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
          scroll="paper"
          PaperProps={{
            sx: {
              width: { xs: 'calc(100vw - 16px)', sm: '100%' },
              maxHeight: { xs: 'calc(100dvh - 16px)', sm: 'calc(100dvh - 48px)' },
              m: { xs: 1, sm: 3 },
            },
          }}
        >
          <DialogTitle>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
              <Schedule />
              <span>{editingShift ? 'Edit Shift' : 'Add New Shift'}</span>
              <Chip 
                label={`${timeFormat}-hour`} 
                size="small" 
                color="info"
                variant="outlined"
                sx={{ ml: 2 }}
              />
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            <TextField
              margin="normal"
              label="Shift Name"
              fullWidth
              value={shiftForm.name}
              onChange={(e) => handleShiftFieldChange('name', e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Schedule />
                  </InputAdornment>
                ),
              }}
            />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TimePicker
                  label="Start Time"
                  value={shiftForm.start_time}
                  onChange={(newValue) => handleShiftFieldChange('start_time', newValue)}
                  ampm={ampmMode}
                  textField={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccessTime />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  minutesStep={5}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TimePicker
                  label="End Time"
                  value={shiftForm.end_time}
                  onChange={(newValue) => handleShiftFieldChange('end_time', newValue)}
                  ampm={ampmMode}
                  textField={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccessTime />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  minutesStep={5}
                />
              </Grid>
            </Grid>
            
            {/* Time preview */}
            {shiftForm.start_time && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Stack direction="column" spacing={0.5}>
                  <Typography variant="body2">
                    Start: {getTimeDisplay(shiftForm.start_time)}
                  </Typography>
                  {shiftForm.end_time && (
                    <>
                      <Typography variant="body2">
                        End: {getTimeDisplay(shiftForm.end_time)}
                      </Typography>
                      {shiftForm.start_time < shiftForm.end_time && (
                        <Typography variant="body2" fontWeight="medium">
                          Duration: {(() => {
                            const diffMs = shiftForm.end_time - shiftForm.start_time;
                            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            return `${diffHrs} hours ${diffMins} minutes`;
                          })()}
                        </Typography>
                      )}
                    </>
                  )}
                </Stack>
              </Alert>
            )}
            
            <TextField
              margin="normal"
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={shiftForm.description}
              onChange={(e) => handleShiftFieldChange('description', e.target.value)}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Active Days
              </Typography>
              <FormGroup row={!isMobile}>
                {SHIFT_DAYS.map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={shiftForm[day]}
                        onChange={(e) => handleShiftFieldChange(day, e.target.checked)}
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  />
                ))}
              </FormGroup>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1 }}>
            <Button onClick={closeShiftDialog} fullWidth={isMobile}>Cancel</Button>
            {canManageShifts && (
              <Button 
                onClick={handleSubmitShift} 
                variant="contained"
                disabled={!shiftForm.name || !shiftForm.start_time || !shiftForm.end_time}
                fullWidth={isMobile}
              >
                {editingShift ? 'Save Changes' : 'Create Shift'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Employee Shift Assignments Section */}
        {canManageEmployeeShifts && (
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mb: 2 }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Typography variant="h6">Employee Shift Assignments</Typography>
                  {activeEmployeeShiftFilterCount > 0 && (
                    <Chip 
                      label={`${activeEmployeeShiftFilterCount} active`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  )}
                  <Chip
                    label={`${visibleGroupedEmployeeAssignments.length}/${groupedEmployeeAssignments.length} employees`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${filteredEmployeeShifts.length} assignments`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    endIcon={employeeShiftFilterExpanded ? <ExpandLess /> : <ExpandMore />}
                    onClick={() => setEmployeeShiftFilterExpanded(!employeeShiftFilterExpanded)}
                    size="small"
                      fullWidth={isMobile}
                  >
                    Filter
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setEmployeeShiftDialogOpen(true)}
                    size="small"
                    fullWidth={isMobile}
                  >
                    Assign Shift
                  </Button>
                </Stack>
              </Stack>

              {/* Employee Shift Filter Section */}
              <Collapse in={employeeShiftFilterExpanded}>
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Search by employee name, email, code or shift name..."
                      value={employeeShiftFilters.search}
                      onChange={(e) => handleEmployeeShiftFilterChange('search', e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                        endAdornment: employeeShiftFilters.search && (
                          <IconButton size="small" onClick={() => handleEmployeeShiftFilterChange('search', '')}>
                            <Clear fontSize="small" />
                          </IconButton>
                        ),
                      }}
                      fullWidth
                      sx={{ flexGrow: 1 }}
                    />
                    
                    <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
                      <InputLabel>Shift</InputLabel>
                      <Select
                        value={employeeShiftFilters.shift}
                        label="Shift"
                        onChange={(e) => handleEmployeeShiftFilterChange('shift', e.target.value)}
                      >
                        <MenuItem value="">All Shifts</MenuItem>
                        {shifts.map((shift) => (
                          <MenuItem key={shift.id} value={shift.id}>
                            <Stack>
                              <Typography>{shift.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {shift.start_time_display || shift.start_time} - {shift.end_time_display || shift.end_time}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
                      <InputLabel>Employee Status</InputLabel>
                      <Select
                        value={employeeShiftFilters.employeeStatus}
                        label="Employee Status"
                        onChange={(e) => handleEmployeeShiftFilterChange('employeeStatus', e.target.value)}
                      >
                        <MenuItem value="">All Status</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Button
                      size="small"
                      onClick={clearEmployeeShiftFilters}
                      startIcon={<Clear />}
                      variant="outlined"
                      disabled={activeEmployeeShiftFilterCount === 0}
                      fullWidth={isMobile}
                    >
                      Clear All
                    </Button>
                  </Stack>
                </Paper>
              </Collapse>

              {/* Error and Loading States */}
              {employeeShiftsError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmployeeShiftsError('')}>
                  {employeeShiftsError}
                </Alert>
              )}

              {employeeShiftsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : groupedEmployeeAssignments.length === 0 ? (
                <Alert severity="info">
                  {enrichedEmployeeShifts.length === 0 
                    ? 'No employee shift assignments found.' 
                    : 'No assignments match your filters.'}
                  {activeEmployeeShiftFilterCount > 0 && (
                    <Button size="small" onClick={clearEmployeeShiftFilters} sx={{ ml: 1 }}>
                      Clear filters
                    </Button>
                  )}
                </Alert>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Showing {visibleGroupedEmployeeAssignments.length} employee rows with {filteredEmployeeShifts.length} assignment(s)
                  </Typography>
                  {isTablet ? (
                    <Stack spacing={1.5}>
                      {visibleGroupedEmployeeAssignments.map((group) => {
                        const employee = group.employee || {};
                        const isExpanded = !!expandedEmployeeRows[group.key];
                        const visibleAssignments = isExpanded ? group.assignments : group.assignments.slice(0, 2);

                        return (
                          <Paper key={group.key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Stack spacing={1.25}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                                    {employee.full_name || 'Unknown'}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {employee.user?.email || '-'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Code: {employee.employee_code || '-'}
                                  </Typography>
                                </Box>
                                <Chip label={`${group.assignments.length} shift(s)`} size="small" variant="outlined" />
                              </Stack>

                              {visibleAssignments.map((assignment) => {
                                const shift = assignment.shift;
                                const duration = getDurationLabel(shift?.start_time_date, shift?.end_time_date);
                                return (
                                  <Paper key={assignment.id} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
                                    <Stack spacing={0.75}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                          <Chip
                                            label={assignment.shift?.name || 'Unknown'}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                          />
                                          {duration && <Chip label={duration} size="small" color="secondary" variant="outlined" />}
                                        </Stack>
                                        <Button
                                          size="small"
                                          color="error"
                                          startIcon={<DeleteIcon />}
                                          onClick={() => handleRemoveEmployeeShift(assignment.id)}
                                        >
                                          Remove
                                        </Button>
                                      </Stack>
                                      <Typography variant="body2">
                                        {shift?.start_time_display || shift?.start_time} - {shift?.end_time_display || shift?.end_time}
                                      </Typography>
                                      {timeFormat === '12' && (
                                        <Typography variant="caption" color="text.secondary">
                                          24h: {shift?.start_time} - {shift?.end_time}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Paper>
                                );
                              })}

                              {group.assignments.length > 2 && (
                                <Button
                                  size="small"
                                  variant="text"
                                  endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                                  onClick={() => toggleEmployeeRow(group.key)}
                                >
                                  {isExpanded ? 'Show Less Shifts' : `Show All Shifts (${group.assignments.length})`}
                                </Button>
                              )}
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Employee</strong></TableCell>
                            <TableCell><strong>Email</strong></TableCell>
                            <TableCell><strong>Employee Code</strong></TableCell>
                            <TableCell><strong>Assigned Shifts</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {visibleGroupedEmployeeAssignments.map((group) => {
                            const employee = group.employee || {};
                            const isExpanded = !!expandedEmployeeRows[group.key];
                            const visibleAssignments = isExpanded ? group.assignments : group.assignments.slice(0, 2);

                            return (
                              <TableRow key={group.key} hover>
                                <TableCell>
                                  {employee.full_name || 'Unknown'}
                                </TableCell>
                                <TableCell>{employee.user?.email || '-'}</TableCell>
                                <TableCell>{employee.employee_code || '-'}</TableCell>
                                <TableCell>
                                  <Stack spacing={1}>
                                    {visibleAssignments.map((assignment) => {
                                      const shift = assignment.shift;
                                      const duration = getDurationLabel(shift?.start_time_date, shift?.end_time_date);
                                      return (
                                        <Paper key={assignment.id} variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
                                          <Stack spacing={0.5}>
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                              <Chip
                                                label={assignment.shift?.name || 'Unknown'}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                              />
                                              {duration && (
                                                <Chip
                                                  label={duration}
                                                  size="small"
                                                  color="secondary"
                                                  variant="outlined"
                                                />
                                              )}
                                            </Stack>
                                            <Typography variant="body2">
                                              {shift?.start_time_display || shift?.start_time} - {shift?.end_time_display || shift?.end_time}
                                            </Typography>
                                          </Stack>
                                        </Paper>
                                      );
                                    })}
                                    {group.assignments.length > 2 && (
                                      <Button
                                        size="small"
                                        variant="text"
                                        endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                                        onClick={() => toggleEmployeeRow(group.key)}
                                        sx={{ alignSelf: 'flex-start' }}
                                      >
                                        {isExpanded ? 'Show Less Shifts' : `Show All Shifts (${group.assignments.length})`}
                                      </Button>
                                    )}
                                  </Stack>
                                </TableCell>
                                <TableCell align="right">
                                  <Stack spacing={0.75} alignItems="flex-end">
                                    {visibleAssignments.map((assignment) => (
                                      <Tooltip key={assignment.id} title={`Remove ${assignment.shift?.name || 'Shift'}`}>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => handleRemoveEmployeeShift(assignment.id)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    ))}
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Employee Shift Assignment Dialog */}
        <Dialog
          open={employeeShiftDialogOpen}
          onClose={() => {
            setEmployeeShiftDialogOpen(false);
            setEmployeeShiftForm({ employee: '', shift: '' });
            setEmployeeSearch('');
          }}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
          scroll="paper"
          PaperProps={{
            sx: {
              width: { xs: 'calc(100vw - 16px)', sm: '100%' },
              maxHeight: { xs: 'calc(100dvh - 16px)', sm: 'calc(100dvh - 48px)' },
              m: { xs: 1, sm: 3 },
            },
          }}
        >
          <DialogTitle>Assign Shift to Employee</DialogTitle>
          <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Employee"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search by name, email or code"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
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
                      <Stack spacing={0.25}>
                        <Typography variant="body2">{emp.full_name || emp.employee_code || 'Unknown'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.user?.email || emp.employee_code || 'No contact info'}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))
                )}
              </Select>
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
                    <Stack spacing={0.25}>
                      <Typography variant="body2">{shift.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {shift.start_time_display || shift.start_time} - {shift.end_time_display || shift.end_time}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: 1 }}>
            <Button
              onClick={() => {
                setEmployeeShiftDialogOpen(false);
                setEmployeeSearch('');
              }}
              fullWidth={isMobile}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignEmployeeShift} 
              variant="contained"
              disabled={!employeeShiftForm.employee || !employeeShiftForm.shift}
              fullWidth={isMobile}
            >
              Assign Shift
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Shifts;
