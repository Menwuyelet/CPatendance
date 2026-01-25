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

// Base role names we always want to show.
// Real role IDs are loaded from the backend (/api/accounts/roles/).
const BASE_ROLE_NAMES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

const emptyForm = {
  id: null,
  name: '',
  email: '',
  role: 'EMPLOYEE',      // normalized uppercase role name
  roleId: '',            // numeric role id (1-4)
  department: '',        // department name (for display/filter)
  departmentId: '',      // department UUID (for API)
  status: 'Active',
  password: '',
  employeeCode: '',
  employeeId: '',        // employee UUID (for employee API updates)
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
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const canDelete = scope === 'admin';
  const isEmployeeRole = EMPLOYEE_ROLE_NAMES.includes(form.role);

  // Load roles and users from backend
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load roles (so we have correct DB IDs for create/update)
        let rolesList = [];
        try {
          const rolesRes = await api.get('/accounts/roles/');
          rolesList = Array.isArray(rolesRes)
            ? rolesRes
            : rolesRes?.results || rolesRes?.data || [];
        } catch (e) {
          // Fallback: if roles endpoint isn't available, we will try to infer roles from users.
          rolesList = [];
        }

        const usersRes = await api.get('/accounts/users/');
        const usersList = Array.isArray(usersRes)
          ? usersRes
          : usersRes?.results || usersRes?.data || [];

        const employeesRes = await api.get('/employees/employees/');
        const employeesList = Array.isArray(employeesRes)
          ? employeesRes
          : employeesRes?.results || employeesRes?.data || [];

        const employeeByUserId = new Map();
        if (Array.isArray(employeesList)) {
          employeesList.forEach((e) => {
            const userId = e.user?.id;
            if (!userId) return;
            employeeByUserId.set(userId, {
              id: e.id,
              fullName: e.full_name,
              departmentName: e.department?.name || '',
              departmentId: e.department?.id || '',
              employeeCode: e.employee_code || '',
            });
          });
        }

        if (Array.isArray(usersList)) {
          const roleMap = new Map();
          const mapped = usersList.map((u) => {
            const rawRoles = Array.isArray(u.roles) ? u.roles : [];
            const roleNames = rawRoles
              .map((r) => (typeof r === 'string' ? r : r.name))
              .filter(Boolean)
              .map((r) => r.toUpperCase());

            const emp = employeeByUserId.get(u.id);
            const deptName = emp?.departmentName || u.department?.name || '';
            const displayName =
              emp?.fullName || u.full_name || u.email?.split('@')[0] || 'User';

            rawRoles.forEach((r) => {
              const name = (typeof r === 'string' ? r : r.name) || '';
              const upper = name.toUpperCase();
              const id = typeof r === 'string' ? null : r.id;
              if (upper && id != null && !roleMap.has(upper)) {
                roleMap.set(upper, { name: upper, id });
              }
            });

            const primaryRole = roleNames[0] || 'EMPLOYEE';

            return {
              id: u.id,
              name: displayName,
              email: u.email,
              role: primaryRole,
              rolesList: roleNames,
              department: deptName,
              departmentId: emp?.departmentId || '',
              employeeCode: emp?.employeeCode || '',
              employeeId: emp?.id || '',
              status: u.is_active ? 'Active' : 'Inactive',
            };
          });

          setUsers(mapped);

          const merged = new Map();

          // 1) Roles from backend (authoritative IDs)
          if (Array.isArray(rolesList)) {
            rolesList.forEach((r) => {
              const name = (r?.name || '').toUpperCase();
              if (name && r?.id != null) merged.set(name, { id: r.id, name });
            });
          }

          // 2) Ensure base names exist (even if backend is empty)
          BASE_ROLE_NAMES.forEach((name) => {
            if (!merged.has(name)) merged.set(name, { id: null, name });
          });

          // 3) Also merge any roles discovered from existing users
          roleMap.forEach((val, key) => {
            if (!merged.has(key)) merged.set(key, val);
          });

          setRoleOptions(Array.from(merged.values()));
        }

        const departmentsRes = await api.get('/employees/departments/');
        const departmentsList = Array.isArray(departmentsRes)
          ? departmentsRes
          : departmentsRes?.results || departmentsRes?.data || [];

        if (Array.isArray(departmentsList)) {
          setDepartments(
            departmentsList.map((d) => ({ id: d.id, name: d.name })),
          );
        }

        onNotify?.('Users and departments loaded successfully', 'success');
      } catch (err) {
        console.error('Failed to load data:', err);
        onNotify?.('Failed to load users or departments. Check server connection.', 'error');
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

    if (name === 'roleId') {
      const selectedId = value;
      const selected = roleOptions.find((r) => String(r.id) === String(selectedId));
      const upperName = selected?.name || form.role;
      setForm((prev) => ({ ...prev, roleId: selectedId, role: upperName }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
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

    // NEW: Validate employee_code for Employee/HR/Manager roles when creating
    if (!isEditing && isEmployeeRole && !form.employeeCode?.trim()) {
      onNotify?.('Employee Code is required for Employee, HR, and Manager roles.', 'error');
      return;
    }

    try {
      if (isEditing) {
        const payload = {
          is_active: form.status === 'Active',
        };

        const roleOption =
          roleOptions.find((r) => String(r.id) === String(form.roleId)) ||
          roleOptions.find((r) => r.name === form.role.toUpperCase());

        if (!roleOption || roleOption.id == null) {
          onNotify?.('Roles not loaded correctly. Please refresh the page and try again.', 'error');
          return;
        }
        payload.roles = [roleOption.id];

        await api.patch(`/accounts/users/${form.id}/`, payload);

        if (isEmployeeRole && form.employeeId) {
          const empPayload = {
            full_name: form.name.trim(),
            employee_code: form.employeeCode || undefined,
            department: form.departmentId || undefined,
            is_active: form.status === 'Active',
          };
          await api.patch(`/employees/employees/${form.employeeId}/`, empPayload);
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.id === form.id
              ? {
                  ...u,
                  name: form.name,
                  role: roleOption?.name || form.role,
                  rolesList: [roleOption?.name || form.role],
                  department:
                    departments.find((d) => d.id === form.departmentId)?.name || u.department,
                  status: form.status,
                  employeeCode: form.employeeCode,
                  departmentId: form.departmentId,
                  employeeId: form.employeeId,
                }
              : u,
          ),
        );

        onNotify?.('User updated successfully', 'success');
      } else {
        // Create new user
        const roleOption =
          roleOptions.find((r) => String(r.id) === String(form.roleId)) ||
          roleOptions.find((r) => r.name === form.role.toUpperCase());

        if (!roleOption || roleOption.id == null) {
          onNotify?.('Roles not loaded correctly. Please refresh the page and try again.', 'error');
          return;
        }

        const payload = {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          roles: [roleOption.id],
        };

        // Only include employee-related fields if role requires it
        if (isEmployeeRole) {
          payload.full_name = form.name.trim();
          payload.employee_code = form.employeeCode.trim(); // Required & validated above
          if (form.departmentId) {
            payload.department = form.departmentId;
          }
        }

        const created = await api.post('/accounts/users/', payload);

        const newUser = {
          id: created.id,
          name: created.full_name || created.email.split('@')[0],
          email: created.email,
          role: roleOption.name || form.role,
          rolesList: [roleOption.name],
          department: created.department?.name || form.department || '',
          status: 'Active',
        };

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
      ...emptyForm,
      ...user,
      role: user.role,
      roleId: roleOptions.find((r) => r.name === user.role)?.id ?? '',
      password: '',
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
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q);

      const matchesRole =
        filterRole === 'ALL' ||
        (Array.isArray(u.rolesList) && u.rolesList.includes(filterRole));

      const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;
      const matchesDepartment =
        filterDepartment === 'ALL' ||
        (u.department || '') === filterDepartment;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [users, search, filterRole, filterStatus, filterDepartment]);

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
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
                <TextField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required />

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="roleId"
                    value={form.roleId}
                    onChange={handleChange}
                    label="Role"
                  >
                    {roleOptions.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {`${r.id} - ${r.name}`}
                      </MenuItem>
                    ))}
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
                    <TextField
                      label="Password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      fullWidth
                      required
                    />

                    {/* FIXED: Employee Code now required for Employee/HR/Manager when creating */}
                    {isEmployeeRole && (
                      <>
                        <Typography variant="subtitle2" color="text.secondary">
                          Employee Details
                        </Typography>
                        <TextField
                          label="Employee Code"
                          name="employeeCode"
                          value={form.employeeCode}
                          onChange={handleChange}
                          fullWidth
                          required
                          placeholder="e.g., EMP001"
                          helperText="Required for Employee, HR, and Manager roles"
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
                    <MenuItem value="EMPLOYEE">Employee</MenuItem>
                    <MenuItem value="MANAGER">Manager</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    label="Department"
                  >
                    <MenuItem value="ALL">All Departments</MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={d.name}>
                        {d.name}
                      </MenuItem>
                    ))}
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