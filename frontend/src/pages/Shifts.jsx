// src/pages/Shifts.jsx
import React, { useEffect, useState, useMemo } from 'react';
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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search, Clear, FilterList, ExpandMore, ExpandLess } from '@mui/icons-material';
import { api } from '../services/api.service.js';

const Shifts = ({ role, onNotify }) => {
  const isManager = role === 'Manager';
  const isHR = role === 'HR';
  const isAdmin = role === 'Admin';

  // Permissions - based on backend views
  const canViewShifts = isAdmin || isHR || isManager;
  const canManageShifts = isHR; // Only HR can create/update/delete shifts
  const canManageEmployeeShifts = isHR || isManager; // HR and Manager can assign shifts to employees

  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftError, setShiftError] = useState('');
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

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
      start: '',
      end: '',
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

  const emptyShiftForm = {
    name: '',
    start_time: '',
    end_time: '',
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

  useEffect(() => {
    if (!canViewShifts) {
      setShifts([]);
      setShiftsLoading(false);
      return;
    }

    const loadShifts = async () => {
      setShiftsLoading(true);
      setShiftError('');
      try {
        const data = await api.get('/attendance/shifts/');
        const list = Array.isArray(data) ? data : [];
        setShifts(list);
      } catch (err) {
        console.error('Unable to load shifts:', err);
        setShifts([]);
        setShiftError('Unable to load shifts.');
        if (err.response?.status !== 403) {
          onNotify?.('Failed to fetch shifts from server.', 'error');
        }
      } finally {
        setShiftsLoading(false);
      }
    };

    loadShifts();
  }, [canViewShifts, onNotify]);

  // Load employee shifts and employees
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
        const [employeesData, employeeShiftsData] = await Promise.all([
          api.get('/employees/employees/').catch((err) => {
            console.error('Error loading employees:', err);
            return [];
          }),
          api.listEmployeeShifts().catch((err) => {
            console.error('Error loading employee shifts:', err);
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

        console.log('Loaded employees:', employeesList.length, employeesList);
        console.log('Loaded employee shifts:', employeeShiftsList.length);

        setEmployees(employeesList);
        setEmployeeShifts(employeeShiftsList);
      } catch (err) {
        console.error('Unable to load employee shifts:', err);
        setEmployeeShifts([]);
        setEmployees([]);
        setEmployeeShiftsError('Unable to load employee shifts.');
        onNotify?.('Failed to fetch employee shifts.', 'error');
      } finally {
        setEmployeeShiftsLoading(false);
      }
    };

    loadEmployeeShifts();
  }, [canManageEmployeeShifts, onNotify]);

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

  // Filter shifts based on multiple criteria
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const { search, days, timeRange } = shiftFilters;
      
      // Text search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search.trim() || 
        shift.name.toLowerCase().includes(searchLower) ||
        shift.description?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
      
      // Days filter (any selected day must match)
      const selectedDays = Object.keys(days).filter(day => days[day]);
      if (selectedDays.length > 0) {
        const hasSelectedDay = selectedDays.some(day => shift[day]);
        if (!hasSelectedDay) return false;
      }
      
      // Time range filter
      if (timeRange.start && timeRange.end) {
        const shiftStart = shift.start_time;
        const shiftEnd = shift.end_time;
        const filterStart = timeRange.start;
        const filterEnd = timeRange.end;
        
        // Check if shift overlaps with filter time range
        const shiftStartsWithin = shiftStart >= filterStart && shiftStart <= filterEnd;
        const shiftEndsWithin = shiftEnd >= filterStart && shiftEnd <= filterEnd;
        const filterWithinShift = filterStart >= shiftStart && filterEnd <= shiftEnd;
        
        if (!(shiftStartsWithin || shiftEndsWithin || filterWithinShift)) {
          return false;
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
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
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
      timeRange: { start: '', end: '' }
    });
  };

  const clearEmployeeShiftFilters = () => {
    setEmployeeShiftFilters({
      search: '',
      shift: '',
      employeeStatus: ''
    });
  };

  const handleSubmitShift = async () => {
    if (!canManageShifts) return;

    const payload = {
      name: shiftForm.name,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
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
        onNotify?.('Shift updated successfully.', 'success');
      } else {
        result = await api.post('/attendance/shifts/', payload);
        onNotify?.('Shift created successfully.', 'success');
      }

      setShifts((prev) => {
        if (editingShift && editingShift.id) {
          return prev.map((s) => (s.id === result.id ? result : s));
        }
        return [...prev, result];
      });

      closeShiftDialog();
      setShiftError('');
    } catch (err) {
      console.error('Failed to save shift:', err);
      const message = err?.message || 'Failed to save shift.';
      setShiftError(message);
      onNotify?.(message, 'error');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!canManageShifts) return;
    const confirmed = window.confirm('Are you sure you want to delete this shift?');
    if (!confirmed) return;
    try {
      await api.delete(`/attendance/shifts/${shiftId}/`);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      onNotify?.('Shift deleted successfully.', 'success');
    } catch (err) {
      console.error('Failed to delete shift:', err);
      setShiftError('Failed to delete shift.');
      onNotify?.('Failed to delete shift.', 'error');
    }
  };

  // Employee Shift Assignment handlers
  const handleAssignEmployeeShift = async () => {
    if (!employeeShiftForm.employee || !employeeShiftForm.shift) {
      onNotify?.('Please select both employee and shift.', 'warning');
      return;
    }
    try {
      await api.assignEmployeeShift(employeeShiftForm.employee, employeeShiftForm.shift);
      onNotify?.('Shift assigned to employee successfully.', 'success');
      setEmployeeShiftDialogOpen(false);
      setEmployeeShiftForm({ employee: '', shift: '' });
      setEmployeeSearch('');
      // Reload employee shifts
      const data = await api.listEmployeeShifts();
      setEmployeeShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to assign shift:', err);
      onNotify?.(err.message || 'Failed to assign shift to employee.', 'error');
    }
  };

  const handleRemoveEmployeeShift = async (assignmentId) => {
    const confirmed = window.confirm('Are you sure you want to remove this shift assignment?');
    if (!confirmed) return;
    try {
      await api.removeEmployeeShift(assignmentId);
      onNotify?.('Shift assignment removed successfully.', 'success');
      // Reload employee shifts
      const data = await api.listEmployeeShifts();
      setEmployeeShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to remove shift assignment:', err);
      onNotify?.(err.message || 'Failed to remove shift assignment.', 'error');
    }
  };

  if (!canViewShifts) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have permission to view shifts.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Shift Management
      </Typography>
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
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Shift List</Typography>
              {activeShiftFilterCount > 0 && (
                <Chip 
                  label={`${activeShiftFilterCount} active`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                endIcon={shiftFilterExpanded ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShiftFilterExpanded(!shiftFilterExpanded)}
                size="small"
              >
                Filter
              </Button>
              {canManageShifts && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openShiftDialogForCreate}
                  size="small"
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
                  sx={{ flexGrow: 1 }}
                />
                
                <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <TextField
                    size="small"
                    type="time"
                    label="From"
                    value={shiftFilters.timeRange.start}
                    onChange={(e) => handleTimeFilterChange('start', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                  
                  <TextField
                    size="small"
                    type="time"
                    label="To"
                    value={shiftFilters.timeRange.end}
                    onChange={(e) => handleTimeFilterChange('end', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                </Stack>
                
                <Button
                  size="small"
                  onClick={clearShiftFilters}
                  startIcon={<Clear />}
                  variant="outlined"
                  disabled={activeShiftFilterCount === 0}
                >
                  Clear All
                </Button>
              </Stack>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Filter by Days:
                </Typography>
                <FormGroup row>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
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
                Showing {filteredShifts.length} of {shifts.length} shifts
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>Days</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    {canManageShifts && (
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredShifts.map((shift) => {
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                      .filter((d) => shift[d])
                      .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3));
                    return (
                      <TableRow key={shift.id} hover>
                        <TableCell>{shift.name}</TableCell>
                        <TableCell>
                          {shift.start_time} – {shift.end_time}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {days.map((day) => (
                              <Chip key={day} label={day} size="small" variant="outlined" />
                            ))}
                          </Stack>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Shift Dialog */}
      <Dialog open={shiftDialogOpen} onClose={closeShiftDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingShift ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            margin="normal"
            label="Name"
            fullWidth
            value={shiftForm.name}
            onChange={(e) => handleShiftFieldChange('name', e.target.value)}
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Start Time"
              type="time"
              fullWidth
              value={shiftForm.start_time}
              onChange={(e) => handleShiftFieldChange('start_time', e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              required
            />
            <TextField
              label="End Time"
              type="time"
              fullWidth
              value={shiftForm.end_time}
              onChange={(e) => handleShiftFieldChange('end_time', e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              required
            />
          </Stack>
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
            <FormGroup row>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
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
        <DialogActions>
          <Button onClick={closeShiftDialog}>Cancel</Button>
          {canManageShifts && (
            <Button onClick={handleSubmitShift} variant="contained">
              {editingShift ? 'Save' : 'Create'}
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">Employee Shift Assignments</Typography>
                {activeEmployeeShiftFilterCount > 0 && (
                  <Chip 
                    label={`${activeEmployeeShiftFilterCount} active`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  endIcon={employeeShiftFilterExpanded ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setEmployeeShiftFilterExpanded(!employeeShiftFilterExpanded)}
                  size="small"
                >
                  Filter
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setEmployeeShiftDialogOpen(true)}
                  size="small"
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
                    sx={{ flexGrow: 1 }}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Shift</InputLabel>
                    <Select
                      value={employeeShiftFilters.shift}
                      label="Shift"
                      onChange={(e) => handleEmployeeShiftFilterChange('shift', e.target.value)}
                    >
                      <MenuItem value="">All Shifts</MenuItem>
                      {shifts.map((shift) => (
                        <MenuItem key={shift.id} value={shift.id}>
                          {shift.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
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
            ) : filteredEmployeeShifts.length === 0 ? (
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
                  Showing {filteredEmployeeShifts.length} of {enrichedEmployeeShifts.length} assignments
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Employee</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Employee Code</strong></TableCell>
                      <TableCell><strong>Shift</strong></TableCell>
                      <TableCell><strong>Shift Time</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEmployeeShifts.map((assignment) => (
                      <TableRow key={assignment.id} hover>
                        <TableCell>
                          {assignment.employee?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{assignment.employee?.user?.email || '-'}</TableCell>
                        <TableCell>{assignment.employee?.employee_code || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={assignment.shift?.name || 'Unknown'} 
                            size="small" 
                            variant="outlined" 
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          {assignment.shift ? `${assignment.shift.start_time} - ${assignment.shift.end_time}` : '-'}
                        </TableCell>
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
          <Button 
            onClick={handleAssignEmployeeShift} 
            variant="contained"
            disabled={!employeeShiftForm.employee || !employeeShiftForm.shift}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shifts;