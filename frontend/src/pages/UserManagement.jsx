// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Avatar,
  Divider,
  InputAdornment,
  Tooltip,
  Alert,
  CircularProgress,
  TableContainer,
} from '@mui/material';
import {
  Edit,
  Delete,
  Search,
  PersonAdd,
  Clear,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';

const emptyForm = {
  id: null,
  name: '',
  email: '',
  role: 'EMPLOYEE',
  department: '',
  status: 'Active',
  password: '',
  employeeCode: '',
  departmentId: '',
};

const EMPLOYEE_ROLE_NAMES = ['EMPLOYEE', 'HR', 'MANAGER'];

const UserManagement = ({ scope = 'admin', onNotify }) => {
  const title = scope === 'hr' ? 'Employee Directory' : 'User & Access Management';
  const description =
    scope === 'hr'
      ? 'View and manage employee profiles, roles, and account status.'
      : 'Full control over user accounts, roles, and system access.';

  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const canDelete = scope === 'admin';
  const isEmployeeRole = EMPLOYEE_ROLE_NAMES.includes(form.role);

  // Load roles and users from backend
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load roles first
        const rolesRes = await api.get('/accounts/roles/');
        if (Array.isArray(rolesRes)) {
          setRoleOptions(rolesRes.map(r => ({ name: r.name, id: r.id })));
        }

        // Load users
        const usersRes = await api.get('/accounts/users/');
        if (Array.isArray(usersRes)) {
          const mapped = usersRes.map(u => {
            const primaryRole =
              u.roles?.[0]?.name ||
              (typeof u.roles?.[0] === 'string' ? u.roles[0] : 'EMPLOYEE');

            return {
              id: u.id,
              name: u.email?.split('@')[0] || 'User',
              email: u.email,
              role: primaryRole,
              // UserSerializer does not currently expose department; this will
              // be populated once the backend adds it.
              department: '',
              status: u.is_active ? 'Active' : 'Inactive',
            };
          });
          setUsers(mapped);
        }

        // Load departments for employee assignment
        const departmentsRes = await api.get('/employees/departments/');
        if (Array.isArray(departmentsRes)) {
          setDepartments(
            departmentsRes.map((d) => ({ id: d.id, name: d.name })),
          );
        }

        onNotify?.('Users, roles, and departments loaded successfully', 'success');
      } catch (err) {
        console.error('Failed to load data:', err);
        onNotify?.('Failed to load users or roles. Check server connection.', 'error');
        setUsers([]);
        setRoleOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [onNotify]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      onNotify?.('Name and email are required', 'error');
      return;
    }

    if (!isEditing && !form.password.trim()) {
      onNotify?.('Password is required for new users', 'error');
      return;
    }

    try {
      if (isEditing) {
        // Update user
        const payload = {
          is_active: form.status === 'Active',
        };

        const roleOption = roleOptions.find(r => r.name === form.role);
        if (roleOption) payload.roles = [roleOption.id];

        await api.patch(`/accounts/users/${form.id}/`, payload);

        // Update local list
        setUsers(prev => prev.map(u => 
          u.id === form.id 
            ? { ...u, role: form.role, status: form.status }
            : u
        ));

        onNotify?.('User updated successfully', 'success');
      } else {
        // Create new user
        const roleOption = roleOptions.find(r => r.name === form.role);
        if (!roleOption) {
          onNotify?.('Selected role not available', 'error');
          return;
        }

        const payload = {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          roles: [roleOption.id],
          ...(isEmployeeRole && {
            full_name: form.name.trim(),
            employee_code: form.employeeCode || undefined,
            department: form.departmentId ? Number(form.departmentId) : undefined,
          }),
        };

        const created = await api.post('/accounts/users/', payload);

        const newUser = {
          id: created.id,
          name: created.full_name || created.email.split('@')[0],
          email: created.email,
          role: form.role,
          department: created.department?.name || form.department || '',
          status: 'Active',
        };

        // Add to list immediately
        setUsers(prev => [newUser, ...prev]);
        onNotify?.('User created successfully', 'success');
      }
    } catch (err) {
      console.error('User operation failed:', err);
      onNotify?.('Failed to save user. Check fields and server.', 'error');
    }

    setForm(emptyForm);
    setIsEditing(false);
  };

  const handleEdit = (user) => {
    setForm({
      ...user,
      password: '', // Never show password
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;

    try {
      await api.delete(`/accounts/users/${id}/`);
      setUsers(prev => prev.filter(u => u.id !== id));
      onNotify?.('User deleted permanently', 'info');
    } catch (err) {
      onNotify?.('Failed to delete user', 'error');
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q);

      const matchesRole = filterRole === 'ALL' || u.role === filterRole.replace('_', ' ');
      const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, filterRole, filterStatus]);

  const activeCount = users.filter(u => u.status === 'Active').length;

  const getRoleLabel = (role) => {
    const map = {
      ADMIN: 'Admin',
      HR: 'HR',
      MANAGER: 'Manager',
      EMPLOYEE: 'Employee',
    };
    return map[role] || role;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'HR': return 'secondary';
      case 'MANAGER': return 'primary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 3 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading users and roles...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1600px', mx: 'auto' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left: Form */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 4 }}>
            <CardHeader
              title={
                <Typography variant="h6" fontWeight="medium">
                  {isEditing ? 'Edit User' : 'Add New User'}
                </Typography>
              }
              avatar={<PersonAdd color="primary" />}
            />
            <Divider />
            <CardContent>
              {roleOptions.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No roles found. Create roles (ADMIN, HR, MANAGER, EMPLOYEE) in Django Admin first.
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
                <TextField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required />

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select name="role" value={form.role} onChange={handleChange} label="Role">
                    <MenuItem value="EMPLOYEE">Employee</MenuItem>
                    <MenuItem value="MANAGER">Manager</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    {scope === 'admin' && <MenuItem value="ADMIN">Admin</MenuItem>}
                  </Select>
                </FormControl>

                {isEmployeeRole && (
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleChange}
                      label="Department"
                    >
                      <MenuItem value="">No department</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {!isEditing && (
                  <>
                    <TextField label="Password" name="password" type="password" value={form.password} onChange={handleChange} fullWidth required />
                    {isEmployeeRole && (
                      <>
                        <Typography variant="subtitle2" color="text.secondary">
                          Employee Details (link to existing records)
                        </Typography>
                        <TextField
                          label="Employee Code"
                          name="employeeCode"
                          value={form.employeeCode}
                          onChange={handleChange}
                          fullWidth
                        />
                      </>
                    )}
                  </>
                )}

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select name="status" value={form.status} onChange={handleChange}>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  {isEditing && (
                    <Button variant="outlined" startIcon={<Clear />} onClick={handleReset}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={isEditing ? <CheckCircle /> : <PersonAdd />}
                    disabled={roleOptions.length === 0}
                  >
                    {isEditing ? 'Save Changes' : 'Create User'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Users Table */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  fullWidth
                  placeholder="Search by name, email, department..."
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
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel>Role</InputLabel>
                  <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} label="Role">
                    <MenuItem value="ALL">All Roles</MenuItem>
                    <MenuItem value="Employee">Employee</MenuItem>
                    <MenuItem value="Manager">Manager</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardHeader
              title={<Typography variant="h6">All Users ({filteredUsers.length})</Typography>}
              subheader={
                <Stack direction="row" spacing={2} mt={1}>
                  <Chip label={`${activeCount} Active`} color="success" />
                  <Chip label={`${users.length - activeCount} Inactive`} variant="outlined" />
                </Stack>
              }
            />
            <Divider />
            <TableContainer>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary">
                          {search || filterRole !== 'ALL' || filterStatus !== 'ALL'
                            ? 'No users match your filters'
                            : 'No users yet. Create your first user using the form.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight="medium">
                              {user.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip label={getRoleLabel(user.role)} size="small" color={getRoleColor(user.role)} />
                        </TableCell>
                        <TableCell>{user.department || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.status}
                            size="small"
                            color={user.status === 'Active' ? 'success' : 'default'}
                            variant={user.status === 'Active' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(user)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canDelete && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserManagement;