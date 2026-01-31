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

  // Initialize with empty strings to avoid undefined → controlled/uncontrolled issues
  const [editForm, setEditForm] = useState({ name: '', code: '', is_active: true, managerId: '' });
  const [createForm, setCreateForm] = useState({ name: '', code: '', is_active: true, managerId: '' });

  // Filter states
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterManager, setFilterManager] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Loading departments and employees...');

      const [data, employeesRes] = await Promise.all([
        api.getAllDepartments(), // Use dedicated method
        api.getAllEmployees(),    // Use dedicated method
      ]);
      
      console.log('✅ Raw data received:', { 
        departmentsType: typeof data,
        departmentsIsArray: Array.isArray(data),
        departmentsKeys: data ? Object.keys(data) : [],
        employeesType: typeof employeesRes,
        employeesIsArray: Array.isArray(employeesRes)
      });

      // Extract departments with multiple fallback strategies
      let departmentsList = [];
      if (Array.isArray(data)) {
        departmentsList = data;
      } else if (data?.results && Array.isArray(data.results)) {
        departmentsList = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        departmentsList = data.data;
      } else if (data) {
        console.warn('⚠️  Unexpected departments response format:', data);
      }

      console.log(`📦 Extracted ${departmentsList.length} departments`);

      // Extract employees with multiple fallback strategies
      const employeesList = Array.isArray(employeesRes)
        ? employeesRes
        : employeesRes?.results || employeesRes?.data || [];

      console.log(`👥 Extracted ${employeesList.length} employees`);
      setEmployees(employeesList);

      const employeeMap = new Map();
      employeesList.forEach((e) => {
        if (e.id) employeeMap.set(e.id, e);
      });

      const normalizedDepartments = departmentsList.map((d) => {
        const deptEmployees = employeesList.filter((e) => e.department?.id === d.id);
        return {
          ...d,
          manager: employeeMap.get(d.manager) || d.manager,
          employeeCount: deptEmployees.length,
        };
      });

      setDepartments(normalizedDepartments);
      console.log(`📁 Normalized ${normalizedDepartments.length} departments:`);
      normalizedDepartments.forEach(d => {
        console.log(`   - ${d.name} (${d.code}) - ${d.employeeCount} employees`);
      });

      const managerEmployees = employeesList.filter((e) => {
        const roles = e.user?.roles || [];
        const roleNames = roles
          .map((r) => (typeof r === 'string' ? r : r.name))
          .filter(Boolean)
          .map((r) => r.toUpperCase());
        return roleNames.includes('MANAGER');
      });
      setManagers(managerEmployees);
      console.log(`👤 Found ${managerEmployees.length} managers`);
      console.log('✅ Departments loaded successfully!');
      
      if (normalizedDepartments.length === 0) {
        console.warn('⚠️  No departments found. You may need to create some in Django admin or via the form.');
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

  const filteredDepartments = useMemo(() => {
    let filtered = departments.filter((dept) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        dept.name?.toLowerCase().includes(q) ||
        dept.code?.toLowerCase().includes(q) ||
        dept.manager?.full_name?.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'Active' && dept.is_active === true) ||
        (filterStatus === 'Inactive' && dept.is_active === false);

      const matchesManager =
        filterManager === 'ALL' ||
        (filterManager === 'NO_MANAGER' && !dept.manager) ||
        dept.manager?.id === filterManager;

      return matchesSearch && matchesStatus && matchesManager;
    });

    // Sort departments
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'code':
          aVal = a.code?.toLowerCase() || '';
          bVal = b.code?.toLowerCase() || '';
          break;
        case 'employees':
          aVal = a.employeeCount || 0;
          bVal = b.employeeCount || 0;
          break;
        case 'manager':
          aVal = a.manager?.full_name?.toLowerCase() || 'zzz';
          bVal = b.manager?.full_name?.toLowerCase() || 'zzz';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [departments, search, filterStatus, filterManager, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.is_active).length;
    const inactive = total - active;
    const totalEmployees = employees.length;

    return { total, active, inactive, totalEmployees };
  }, [departments, employees]);

  const startEdit = (dept) => {
    setEditingId(dept.id);
    setEditForm({
      name: dept.name || '',
      code: dept.code || '',
      is_active: dept.is_active !== false,
      managerId: dept.manager?.id || '', // safe string
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', code: '', is_active: true, managerId: '' });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
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
      console.log(`📝 Updating department ${editingId}...`);
      const updated = await api.updateDepartment(editingId, payload);
      setDepartments((prev) =>
        prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d))
      );
      onNotify?.('Department updated successfully.', 'success');
      console.log('✅ Department updated');
    } catch (err) {
      console.error('❌ Failed to update department:', err);
      onNotify?.('Failed to update department.', 'error');
    } finally {
      cancelEdit();
    }
  };

  const createDepartment = async (e) => {
    e?.preventDefault?.();
    const name = createForm.name.trim();
    const code = createForm.code.trim();
    if (!name || !code) {
      onNotify?.('Name and code are required.', 'warning');
      return;
    }
    try {
      const payload = {
        name,
        code,
        is_active: createForm.is_active,
        manager: createForm.managerId || null,
      };
      console.log('➕ Creating new department...');
      const created = await api.createDepartment(payload);
      setDepartments((prev) => [created, ...prev]);
      setCreateForm({ name: '', code: '', is_active: true, managerId: '' });
      onNotify?.('Department created successfully.', 'success');
      console.log('✅ Department created:', created);
    } catch (err) {
      console.error('❌ Failed to create department:', err);
      onNotify?.('Failed to create department.', 'error');
    }
  };

  const deleteDepartment = async (id) => {
    if (!window.confirm('Delete this department? This action cannot be undone.')) return;
    try {
      console.log(`🗑️ Deleting department ${id}...`);
      await api.deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      onNotify?.('Department deleted.', 'info');
      console.log('✅ Department deleted');
    } catch (err) {
      console.error('❌ Failed to delete department:', err);
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
    <Box >
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
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Statistics Cards - Enhanced */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card 
                sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: 3,
                  borderRadius: 3,
                  transition: '0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Total Departments</Typography>
                      <Typography variant="h3" fontWeight="bold">{stats.total}</Typography>
                    </Box>
                    <Business sx={{ fontSize: 50, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card 
                sx={{ 
                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  color: 'white',
                  boxShadow: 3,
                  borderRadius: 3,
                  transition: '0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Active Departments</Typography>
                      <Typography variant="h3" fontWeight="bold">{stats.active}</Typography>
                    </Box>
                    <Business sx={{ fontSize: 50, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card 
                sx={{ 
                  background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
                  color: 'white',
                  boxShadow: 3,
                  borderRadius: 3,
                  transition: '0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Inactive Departments</Typography>
                      <Typography variant="h3" fontWeight="bold">{stats.inactive}</Typography>
                    </Box>
                    <Business sx={{ fontSize: 50, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card 
                sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  boxShadow: 3,
                  borderRadius: 3,
                  transition: '0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 }
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>Total Employees</Typography>
                      <Typography variant="h3" fontWeight="bold">{stats.totalEmployees}</Typography>
                    </Box>
                    <People sx={{ fontSize: 50, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Create Form */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2, border: '2px dashed', borderColor: 'primary.main' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add /> Create New Department
            </Typography>
            <Box
              component="form"
              onSubmit={createDepartment}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                alignItems: { xs: 'stretch', md: 'flex-end' },
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
                value={createForm.managerId || ''}
                onChange={(e) => handleCreateChange('managerId', e.target.value)}
                displayEmpty
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
              <Button type="submit" variant="contained" color="primary" size="large" startIcon={<Add />} sx={{ whiteSpace: 'nowrap', minHeight: 40 }}>
                Add Department
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardHeader 
          title={<Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FilterList /> Filters & Sorting</Typography>}
          sx={{ pb: 1 }}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            {/* Search */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, code, or manager..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}><Clear /></IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Status Filter */}
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

            {/* Manager Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Manager</InputLabel>
                <Select value={filterManager} onChange={(e) => setFilterManager(e.target.value)} label="Manager">
                  <MenuItem value="ALL">All Managers</MenuItem>
                  <MenuItem value="NO_MANAGER">No Manager</MenuItem>
                  {managers.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.full_name || m.user?.email || m.employee_code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Sort By */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By" startAdornment={<Sort sx={{ mr: 1 }} />}>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="code">Code</MenuItem>
                  <MenuItem value="employees">Employee Count</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort Order */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} label="Order" startAdornment={<SwapVert sx={{ mr: 1 }} />}>
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {(search || filterStatus !== 'ALL' || filterManager !== 'ALL' || sortBy !== 'name') && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">Active filters:</Typography>
              {search && <Chip label={`Search: "${search}"`} onDelete={() => setSearch('')} size="small" color="primary" />}
              {filterStatus !== 'ALL' && <Chip label={`Status: ${filterStatus}`} onDelete={() => setFilterStatus('ALL')} size="small" color="success" />}
              {filterManager !== 'ALL' && (
                <Chip 
                  label={`Manager: ${filterManager === 'NO_MANAGER' ? 'None' : managers.find(m => m.id === filterManager)?.full_name || 'Unknown'}`} 
                  onDelete={() => setFilterManager('ALL')} 
                  size="small" 
                  color="info" 
                />
              )}
              {sortBy !== 'name' && <Chip label={`Sorted by: ${sortBy}`} size="small" color="secondary" variant="outlined" />}
              <Button 
                size="small" 
                onClick={() => {
                  setSearch('');
                  setFilterStatus('ALL');
                  setFilterManager('ALL');
                  setSortBy('name');
                  setSortOrder('asc');
                }}
                startIcon={<Clear />}
              >
                Clear All
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Departments Table */}
      <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
        <CardHeader 
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <Business color="primary" />
              <Typography variant="h6">Departments ({filteredDepartments.length})</Typography>
            </Stack>
          }
          subheader={`Showing ${filteredDepartments.length} of ${departments.length} total departments`}
        />
        <Divider />
        <CardContent>
          {departments.length === 0 ? (
            <Alert severity="info">No departments found.</Alert>
          ) : filteredDepartments.length === 0 ? (
            <Alert severity="warning">No departments match your filters.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Manager</strong></TableCell>
                    <TableCell><strong>Employees</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDepartments.map((dept) => {
                    const isEditing = editingId === dept.id;
                    return (
                      <TableRow key={dept.id} hover>
                        <TableCell>
                          {isEditing ? (
                            <TextField value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} size="small" fullWidth />
                          ) : (
                            dept.name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <TextField value={editForm.code} onChange={(e) => handleEditChange('code', e.target.value)} size="small" fullWidth />
                          ) : (
                            dept.code
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <FormControl size="small" fullWidth>
                              <InputLabel>Manager</InputLabel>
                              <Select
                                value={editForm.managerId || ''}
                                onChange={(e) => handleEditChange('managerId', e.target.value)}
                                label="Manager"
                                displayEmpty
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
                          <Chip icon={<People />} label={`${dept.employeeCount || 0} employees`} size="small" variant="outlined" color="primary" />
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <FormControlLabel
                              control={<Switch checked={editForm.is_active} onChange={(e) => handleEditChange('is_active', e.target.checked)} />}
                              label={editForm.is_active ? 'Active' : 'Inactive'}
                            />
                          ) : (
                            <Chip label={dept.is_active ? 'Active' : 'Inactive'} color={dept.is_active ? 'success' : 'default'} size="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {isEditing ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={cancelEdit}>Cancel</Button>
                              <Button size="small" variant="contained" startIcon={<Save />} onClick={saveEdit}>Save</Button>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => startEdit(dept)}><Edit fontSize="small" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => deleteDepartment(dept.id)}><Delete fontSize="small" /></IconButton>
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