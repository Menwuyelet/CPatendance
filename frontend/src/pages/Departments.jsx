// src/pages/Departments.jsx
import React, { useEffect, useState, useMemo } from 'react';
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
  InputAdornment,
  Grid,
} from '@mui/material';
import { Edit, Save, Cancel, Refresh, Delete, Add, Search, Clear, People, Business, FilterList, Sort, SwapVert } from '@mui/icons-material';
import { api } from '../services/api.service.js';

const Departments = ({ onNotify }) => {
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Forms
  const [editForm, setEditForm] = useState({ name: '', code: '', is_active: true, managerId: '' });
  const [createForm, setCreateForm] = useState({ name: '', code: '', is_active: true, managerId: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterManager, setFilterManager] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [data, employeesRes] = await Promise.all([
        api.getAllDepartments(),
        api.getAllEmployees(),
      ]);
      
      const departmentsList = Array.isArray(data) ? data : (data?.results || data?.data || []);
      const employeesList = Array.isArray(employeesRes) ? employeesRes : (employeesRes?.results || employeesRes?.data || []);
      setEmployees(employeesList);

      const employeeMap = new Map(employeesList.map(e => [e.id, e]));

      const normalizedDepartments = departmentsList.map((d) => {
        const deptEmployees = employeesList.filter((e) => e.department?.id === d.id);
        return {
          ...d,
          manager: employeeMap.get(d.manager) || d.manager,
          employeeCount: deptEmployees.length,
        };
      });

      setDepartments(normalizedDepartments);

      const managerEmployees = employeesList.filter((e) => {
        const roles = (e.user?.roles || []).map(r => (typeof r === 'string' ? r : r.name).toUpperCase());
        return roles.includes('MANAGER');
      });
      setManagers(managerEmployees);
      
    } catch (err) {
      setError('Unable to load departments.');
      onNotify?.('Failed to fetch departments from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Fixes Duplication: Single source of truth for Manager dropdowns
  const renderManagerOptions = () => [
    <MenuItem key="none" value="">No manager</MenuItem>,
    ...managers.map((m) => (
      <MenuItem key={m.id} value={m.id}>
        {m.full_name || m.user?.email || m.employee_code}
      </MenuItem>
    ))
  ];

  const filteredDepartments = useMemo(() => {
    return departments
      .filter((dept) => {
        const q = search.toLowerCase();
        const matchesSearch = !q || 
          dept.name?.toLowerCase().includes(q) || 
          dept.code?.toLowerCase().includes(q) || 
          dept.manager?.full_name?.toLowerCase().includes(q);

        const matchesStatus = filterStatus === 'ALL' || 
          (filterStatus === 'Active' ? dept.is_active : !dept.is_active);

        const matchesManager = filterManager === 'ALL' || 
          (filterManager === 'NO_MANAGER' ? !dept.manager : dept.manager?.id === filterManager);

        return matchesSearch && matchesStatus && matchesManager;
      })
      .sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'name': aVal = a.name?.toLowerCase() || ''; bVal = b.name?.toLowerCase() || ''; break;
          case 'code': aVal = a.code?.toLowerCase() || ''; bVal = b.code?.toLowerCase() || ''; break;
          case 'employees': aVal = a.employeeCount || 0; bVal = b.employeeCount || 0; break;
          case 'manager': aVal = a.manager?.full_name?.toLowerCase() || 'zzz'; bVal = b.manager?.full_name?.toLowerCase() || 'zzz'; break;
          default: return 0;
        }
        const factor = sortOrder === 'asc' ? 1 : -1;
        return aVal > bVal ? factor : aVal < bVal ? -factor : 0;
      });
  }, [departments, search, filterStatus, filterManager, sortBy, sortOrder]);

  const stats = useMemo(() => ({
    total: departments.length,
    active: departments.filter((d) => d.is_active).length,
    inactive: departments.length - departments.filter((d) => d.is_active).length,
    totalEmployees: employees.length
  }), [departments, employees]);

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

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const updated = await api.updateDepartment(editingId, {
        ...editForm,
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        manager: editForm.managerId || null,
      });
      setDepartments(prev => prev.map(d => d.id === editingId ? { ...d, ...updated } : d));
      onNotify?.('Department updated successfully.', 'success');
      cancelEdit();
    } catch (err) {
      onNotify?.('Failed to update department.', 'error');
    }
  };

  const createDepartment = async (e) => {
    e?.preventDefault?.();
    if (!createForm.name.trim() || !createForm.code.trim()) {
      onNotify?.('Name and code are required.', 'warning');
      return;
    }
    try {
      const created = await api.createDepartment({
        ...createForm,
        name: createForm.name.trim(),
        code: createForm.code.trim(),
        manager: createForm.managerId || null,
      });
      setDepartments(prev => [created, ...prev]);
      setCreateForm({ name: '', code: '', is_active: true, managerId: '' });
      onNotify?.('Department created successfully.', 'success');
    } catch (err) {
      onNotify?.('Failed to create department.', 'error');
    }
  };

  const deleteDepartment = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await api.deleteDepartment(id);
      setDepartments(prev => prev.filter(d => d.id !== id));
      onNotify?.('Department deleted.', 'info');
    } catch (err) {
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
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Departments"
          subheader="View and manage departments."
          action={<IconButton onClick={loadDepartments}><Refresh /></IconButton>}
        />
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Fixes Duplication: Stats mapped from array */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'Total Departments', val: stats.total, icon: <Business />, grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
              { label: 'Active Departments', val: stats.active, icon: <Business />, grad: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
              { label: 'Inactive Departments', val: stats.inactive, icon: <Business />, grad: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
              { label: 'Total Employees', val: stats.totalEmployees, icon: <People />, grad: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
            ].map((s, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ background: s.grad, color: 'white', borderRadius: 3, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>{s.label}</Typography>
                        <Typography variant="h3" fontWeight="bold">{s.val}</Typography>
                      </Box>
                      {React.cloneElement(s.icon, { sx: { fontSize: 50, opacity: 0.3 } })}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Create Form */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2, border: '2px dashed', borderColor: 'primary.main' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add /> Create New Department
            </Typography>
            <Box component="form" onSubmit={createDepartment} sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { xs: 'stretch', md: 'flex-end' } }}>
              <TextField label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} size="small" fullWidth />
              <TextField label="Code" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} size="small" fullWidth />
              <FormControl size="small" fullWidth>
                <InputLabel>Manager</InputLabel>
                <Select label="Manager" value={createForm.managerId} onChange={(e) => setCreateForm({ ...createForm, managerId: e.target.value })}>
                  {renderManagerOptions()}
                </Select>
              </FormControl>
              <FormControlLabel control={<Switch checked={createForm.is_active} onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })} />} label={createForm.is_active ? 'Active' : 'Inactive'} />
              <Button type="submit" variant="contained" startIcon={<Add />} sx={{ whiteSpace: 'nowrap', minHeight: 40 }}>Add</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField 
                fullWidth size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} 
                InputProps={{ 
                  startAdornment: <Search sx={{ mr: 1 }} />,
                  endAdornment: search && <IconButton size="small" onClick={() => setSearch('')}><Clear /></IconButton> 
                }} 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="Active">Active Only</MenuItem>
                  <MenuItem value="Inactive">Inactive Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Manager</InputLabel>
                <Select value={filterManager} onChange={(e) => setFilterManager(e.target.value)} label="Manager">
                  <MenuItem value="ALL">All Managers</MenuItem>
                  <MenuItem value="NO_MANAGER">No Manager</MenuItem>
                  {managers.map(m => <MenuItem key={m.id} value={m.id}>{m.full_name || m.employee_code}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort</InputLabel>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort">
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="code">Code</MenuItem>
                  <MenuItem value="employees">Employees</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} label="Order">
                  <MenuItem value="asc">Asc</MenuItem>
                  <MenuItem value="desc">Desc</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader title={<Typography variant="h6">Departments ({filteredDepartments.length})</Typography>} />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>Name</TableCell><TableCell>Code</TableCell><TableCell>Manager</TableCell><TableCell>Employees</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id} hover>
                  <TableCell>
                    {editingId === dept.id ? <TextField value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} size="small" /> : dept.name}
                  </TableCell>
                  <TableCell>
                    {editingId === dept.id ? <TextField value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} size="small" /> : dept.code}
                  </TableCell>
                  <TableCell>
                    {editingId === dept.id ? (
                      <FormControl size="small" fullWidth>
                        <Select value={editForm.managerId} onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}>
                          {renderManagerOptions()}
                        </Select>
                      </FormControl>
                    ) : (dept.manager?.full_name || '—')}
                  </TableCell>
                  <TableCell><Chip icon={<People />} label={dept.employeeCount} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    {editingId === dept.id ? <Switch checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} /> : <Chip label={dept.is_active ? 'Active' : 'Inactive'} color={dept.is_active ? 'success' : 'default'} size="small" />}
                  </TableCell>
                  <TableCell align="right">
                    {editingId === dept.id ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={cancelEdit}>Cancel</Button>
                        <Button size="small" variant="contained" onClick={saveEdit}>Save</Button>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => startEdit(dept)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => deleteDepartment(dept.id)}><Delete fontSize="small" /></IconButton>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Departments;