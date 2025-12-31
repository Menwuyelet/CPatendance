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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search, Clear } from '@mui/icons-material';
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
          api.get('/employees/employees/').catch(() => []),
          api.listEmployeeShifts(),
        ]);

        const employeesList = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
        const employeeShiftsList = Array.isArray(employeeShiftsData) ? employeeShiftsData : [];

        setEmployees(employeesList);
        setEmployeeShifts(employeeShiftsList);
      } catch (err) {
        console.error('Unable to load employee shifts:', err);
        setEmployeeShifts([]);
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

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">Shift List</Typography>
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

          {shiftError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setShiftError('')}>
              {shiftError}
            </Alert>
          )}

          {shiftsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : shifts.length === 0 ? (
            <Alert severity="info">No shifts defined yet.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Time</strong></TableCell>
                  <TableCell><strong>Days</strong></TableCell>
                  {canManageShifts && (
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {shifts.map((shift) => {
                  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                    .filter((d) => shift[d])
                    .map((d) => d.charAt(0).toUpperCase());
                  return (
                    <TableRow key={shift.id} hover>
                      <TableCell>{shift.name}</TableCell>
                      <TableCell>
                        {shift.start_time} – {shift.end_time}
                      </TableCell>
                      <TableCell>{days.length ? days.join(' ') : '–'}</TableCell>
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
          )}
        </CardContent>
      </Card>

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
              Days
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
              ) : employeeShifts.length === 0 ? (
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
                    {employeeShifts.map((assignment) => (
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
                >
                  {filteredEmployees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.full_name || emp.employee_code || 'Unknown'} ({emp.user?.email || 'No email'})
                    </MenuItem>
                  ))}
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
              <Button onClick={handleAssignEmployeeShift} variant="contained">
                Assign
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default Shifts;

