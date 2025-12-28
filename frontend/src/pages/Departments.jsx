// src/pages/Departments.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  IconButton,
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Tooltip,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit, Save, Cancel, Refresh, Delete, Add } from '@mui/icons-material';
import { api } from '../services/api.service.js';

const Departments = ({ onNotify }) => {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', is_active: true, managerId: '' });
  const [createForm, setCreateForm] = useState({ name: '', code: '', is_active: true, managerId: '' });
 
  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError('');
  
      const data = await api.get('/employees/departments/');
      const employeesRes = await api.get('/employees/employees/');
  
      const employeeMap = new Map();
      if (Array.isArray(employeesRes)) {
        employeesRes.forEach((e) => {
          employeeMap.set(e.id, e);
        });
      }
  
      const normalizedDepartments = Array.isArray(data)
        ? data.map((d) => ({
            ...d,
            manager: employeeMap.get(d.manager) || d.manager,
          }))
        : [];
  
      setDepartments(normalizedDepartments);
  
      if (Array.isArray(employeesRes)) {
        const managerEmployees = employeesRes.filter((e) => {
          const roles = e.user?.roles || [];
          const roleNames = roles
            .map((r) => (typeof r === 'string' ? r : r.name))
            .filter(Boolean)
            .map((r) => r.toUpperCase());
          return roleNames.includes('MANAGER');
        });
        setManagers(managerEmployees);
      }
    } catch (err) {
      console.error('Failed to load departments or managers:', err);
      setError('Unable to load departments. You might not have permission to view them.');
      setDepartments([]);
      onNotify?.('Failed to fetch departments from server.', 'error');
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    loadDepartments();
  }, []);

  const startEdit = (dept) => {
    setEditingId(dept.id);
    setEditForm({
      name: dept.name || '',
      code: dept.code || '',
      is_active: dept.is_active !== false,
      managerId: dept.manager?.id || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', code: '', is_active: true, managerId: '' });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingId) return;

    try {
      const payload = {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        is_active: editForm.is_active,
        manager: editForm.managerId || null,
      };

      const updated = await api.patch(`/employees/departments/${editingId}/`, payload);

      setDepartments((prev) =>
        prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d)),
      );

      onNotify?.('Department updated successfully.', 'success');
    } catch (err) {
      console.error('Failed to update department:', err);
      onNotify?.('Failed to update department.', 'error');
    } finally {
      cancelEdit();
    }
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const createDepartment = async (e) => {
    e?.preventDefault?.();

    const name = createForm.name.trim();
    const code = createForm.code.trim();
    if (!name || !code) {
      onNotify?.('Name and code are required to create a department.', 'warning');
      return;
    }

    try {
      const payload = {
        name,
        code,
        is_active: createForm.is_active,
        manager: createForm.managerId || null,
      };

      const created = await api.post('/employees/departments/', payload);
      setDepartments((prev) => [created, ...prev]);
      setCreateForm({ name: '', code: '', is_active: true });
      onNotify?.('Department created successfully.', 'success');
    } catch (err) {
      console.error('Failed to create department:', err);
      onNotify?.('Failed to create department.', 'error');
    }
  };

  const deleteDepartment = async (id) => {
    if (!window.confirm('Delete this department? This cannot be undone.')) return;

    try {
      await api.delete(`/employees/departments/${id}/`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      onNotify?.('Department deleted.', 'info');
    } catch (err) {
      console.error('Failed to delete department:', err);
      onNotify?.('Failed to delete department.', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', mx: 'auto' }}>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Departments"
          subheader="View and manage departments. Only Admin/HR/Managers with proper permissions can modify."
          action={
            <Tooltip title="Reload">
              <IconButton onClick={loadDepartments}>
                <Refresh />
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This list is powered by the backend endpoint <code>/api/employees/departments/</code>.
          </Typography>

          {/* Create new department */}
          <Box
            component="form"
            onSubmit={createDepartment}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', md: 'flex-end' },
              mt: 2,
            }}
          >
            <TextField
              label="Name"
              value={createForm.name}
              onChange={(e) => handleCreateChange('name', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Code"
              value={createForm.code}
              onChange={(e) => handleCreateChange('code', e.target.value)}
              size="small"
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel id="dept-manager-create-label">Manager</InputLabel>
              <Select
                labelId="dept-manager-create-label"
                label="Manager"
                value={createForm.managerId}
                onChange={(e) => handleCreateChange('managerId', e.target.value)}
              >
                <MenuItem value="">No manager</MenuItem>
                {managers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.full_name || m.user?.email || m.employee_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={createForm.is_active}
                  onChange={(e) => handleCreateChange('is_active', e.target.checked)}
                />
              }
              label={createForm.is_active ? 'Active' : 'Inactive'}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<Add />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add Department
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {departments.length === 0 ? (
            <Alert severity="info">No departments found.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Manager</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((dept) => {
                    const isEditing = editingId === dept.id;
                    return (
                      <TableRow key={dept.id} hover>
                        <TableCell>
                          {isEditing ? (
                            <TextField
                              value={editForm.name}
                              onChange={(e) => handleEditChange('name', e.target.value)}
                              size="small"
                              fullWidth
                            />
                          ) : (
                            dept.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <TextField
                              value={editForm.code}
                              onChange={(e) => handleEditChange('code', e.target.value)}
                              size="small"
                              fullWidth
                            />
                          ) : (
                            dept.code
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <FormControl size="small" fullWidth>
                              <InputLabel id={`dept-manager-edit-label-${dept.id}`}>
                                Manager
                              </InputLabel>
                              <Select
                                labelId={`dept-manager-edit-label-${dept.id}`}
                                label="Manager"
                                value={editForm.managerId}
                                onChange={(e) => handleEditChange('managerId', e.target.value)}
                              >
                                <MenuItem value="">No manager</MenuItem>
                                {managers.map((m) => (
                                  <MenuItem key={m.id} value={m.id}>
                                    {m.full_name || m.user?.email || m.employee_code}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            dept.manager?.full_name || dept.manager_name || '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={editForm.is_active}
                                  onChange={(e) => handleEditChange('is_active', e.target.checked)}
                                />
                              }
                              label={editForm.is_active ? 'Active' : 'Inactive'}
                            />
                          ) : (
                            <Chip
                              label={dept.is_active ? 'Active' : 'Inactive'}
                              color={dept.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {isEditing ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Cancel />}
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Save />}
                                onClick={saveEdit}
                              >
                                Save
                              </Button>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => startEdit(dept)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => deleteDepartment(dept.id)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Departments;
