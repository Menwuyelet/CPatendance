// src/pages/UserManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
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
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit,
  Delete,
  Search,
  PersonAdd,
  Clear,
  CheckCircle,
  Cancel,
  FilterList,
  Refresh,
  Sort,
  SwapVert,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import { useNotifications } from '../context/NotificationContext.jsx';

// Base roles and their fixed ids (1-4)
const BASE_ROLES = [
  { id: 1, name: 'ADMIN' },
  { id: 2, name: 'HR' },
  { id: 3, name: 'MANAGER' },
  { id: 4, name: 'EMPLOYEE' },
];

const emptyForm = {
  id: null,
  name: '',
  email: '',
  role: 'EMPLOYEE',
  roleId: '',
  department: '',
  departmentId: '',
  status: 'Active',
  password: '',
  employeeCode: '',
  employeeId: '',
};

const EMPLOYEE_ROLE_NAMES = ['EMPLOYEE', 'HR', 'MANAGER'];

// Keep User Management payload in module scope so route re-mounts don't re-fetch.
let userManagementDataCache = null;
let userManagementInFlightPromise = null;

const UserManagement = ({ scope = 'admin', onNotify }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const title = scope === 'hr' ? 'Employee Directory (Read-Only)' : 'User & Access Management';
  const description =
    scope === 'hr'
      ? 'View employee profiles, roles, and account status. Contact admin to make changes.'
      : 'Full control over user accounts, roles, and system access.';

  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const canDelete = scope === 'admin';
  const canEdit = scope === 'admin';
  const isEmployeeRole = EMPLOYEE_ROLE_NAMES.includes(form.role);

  // Use NotificationContext for global notifications
  const { addNotification } = useNotifications();

  // Local Snackbar state (visible fallback)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  const handleSnackClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnack(prev => ({ ...prev, open: false }));
  };

  const showMessage = (message, severity = 'info') => {
    // Use one notification channel only to avoid duplicate toasts.
    if (onNotify && typeof onNotify === 'function') {
      onNotify(message, severity);
      return;
    }

    if (addNotification && typeof addNotification === 'function') {
      addNotification(message, severity);
      return;
    }

    // Fallback when no global notification channel is available.
    setSnack({ open: true, message, severity });
  };

  const mapApiDataToUserManagementState = (usersRes, employeesRes, departmentsRes) => {
    const usersList = Array.isArray(usersRes) ? usersRes : usersRes?.results || usersRes?.data || [];
    const employeesList = Array.isArray(employeesRes)
      ? employeesRes
      : employeesRes?.results || employeesRes?.data || [];
    const departmentsList = Array.isArray(departmentsRes)
      ? departmentsRes
      : departmentsRes?.results || departmentsRes?.data || [];

    const employeeByUserId = new Map();
    employeesList.forEach((e) => {
      const userId = e.user?.id;
      if (userId) {
        employeeByUserId.set(userId, {
          id: e.id,
          fullName: e.full_name,
          departmentName: e.department?.name || '',
          departmentId: e.department?.id || '',
          employeeCode: e.employee_code || '',
        });
      }
    });

    const roleMap = new Map();
    const mappedUsers = (Array.isArray(usersList) ? usersList : []).map((u) => {
      const rawRoles = Array.isArray(u.roles) ? u.roles : [];
      const roleNames = rawRoles
        .map((r) => (typeof r === 'string' ? r : r.name))
        .filter(Boolean)
        .map((r) => r.toUpperCase());

      const emp = employeeByUserId.get(u.id);
      const deptName = emp?.departmentName || u.department?.name || '';
      const displayName = emp?.fullName || u.full_name || u.email?.split('@')[0] || 'User';

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

    const merged = new Map();
    BASE_ROLES.forEach((r) => merged.set(r.name, r));
    roleMap.forEach((val, key) => merged.set(key, val));

    return {
      users: mappedUsers,
      roleOptions: Array.from(merged.values()),
      departments: departmentsList.map((d) => ({ id: d.id, name: d.name })),
    };
  };

  const applyDataToState = (data) => {
    setUsers(data.users || []);
    setRoleOptions(data.roleOptions || []);
    setDepartments(data.departments || []);
  };

  const loadUserManagementData = async ({ force = false, notifyOnSuccess = false } = {}) => {
    try {
      setLoading(true);

      if (!force && userManagementDataCache) {
        applyDataToState(userManagementDataCache);
        return;
      }

      if (!force && userManagementInFlightPromise) {
        const sharedData = await userManagementInFlightPromise;
        applyDataToState(sharedData);
        return;
      }

      const requestPromise = (async () => {
        const [usersRes, employeesRes, departmentsRes] = await Promise.all([
          api.get('/accounts/users/'),
          api.get('/employees/employees/'),
          api.get('/employees/departments/'),
        ]);

        return mapApiDataToUserManagementState(usersRes, employeesRes, departmentsRes);
      })();

      userManagementInFlightPromise = requestPromise;

      const nextData = await requestPromise;
      userManagementDataCache = nextData;
      applyDataToState(nextData);

      if (notifyOnSuccess) {
        showMessage('Users and departments refreshed successfully', 'success');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      showMessage('Failed to load users or departments. Check server connection.', 'error');
      setUsers([]);
      setRoleOptions([]);
      setDepartments([]);
    } finally {
      if (userManagementInFlightPromise) {
        userManagementInFlightPromise = null;
      }
      setLoading(false);
    }
  };

  // Load data once
  useEffect(() => {
    loadUserManagementData({ force: false, notifyOnSuccess: false });
  }, []);

  // Keep cache in sync after local create/edit/delete operations.
  useEffect(() => {
    if (!loading) {
      userManagementDataCache = { users, roleOptions, departments };
    }
  }, [loading, users, roleOptions, departments]);

  const handleRefreshData = () => {
    loadUserManagementData({ force: true, notifyOnSuccess: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'roleId') {
      const selected = roleOptions.find((r) => String(r.id) === String(value));
      const upperName = selected?.name || form.role;
      setForm((prev) => ({ ...prev, roleId: value, role: upperName }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      showMessage('Please provide both name and email address', 'error');
      return;
    }

    if (!isEditing && !form.password.trim()) {
      showMessage('Password is required when creating a new user', 'error');
      return;
    }

    if (!isEditing && isEmployeeRole && !form.employeeCode?.trim()) {
      showMessage('Employee Code is required for Employee, HR, and Manager roles when creating new users', 'error');
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

        if (roleOption) payload.roles = [roleOption.id];

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

        showMessage(`User "${form.name}" has been updated successfully`, 'success');
      } else {
        const roleOption =
          roleOptions.find((r) => String(r.id) === String(form.roleId)) ||
          roleOptions.find((r) => r.name === form.role.toUpperCase());

        if (!roleOption) {
          showMessage('Selected role not available', 'error');
          return;
        }

        const payload = {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          roles: [roleOption.id],
        };

        if (isEmployeeRole) {
          payload.full_name = form.name.trim();
          payload.employee_code = form.employeeCode.trim();
          if (form.departmentId) {
            payload.department = form.departmentId;
          }
        }

        // console.log('Creating user with payload:', payload);

        const created = await api.post('/accounts/users/', payload);
        // console.log('User created successfully:', created);

        const newUser = {
          id: created.id,
          name: created.full_name || created.email.split('@')[0],
          email: created.email,
          role: roleOption.name || form.role,
          rolesList: [roleOption.name],
          department: created.department?.name || form.department || '',
          status: 'Active',
        };

        setUsers((prev) => [newUser, ...prev]);

        showMessage(`✓ User Created Successfully! "${form.name}" (${form.email}) has been added to the system.`, 'success');
      }
    } catch (err) {
      // console.error('User operation failed:', err);
      // console.log('Full error response:', err?.response?.data);

      let errorMsg = err?.message || 'Failed to save user. Please try again.';

      if (err?.response?.status === 400) {
        const data = err?.response?.data || {};

        if (data.email && (data.email.includes('already exists') || data.email.includes('unique'))) {
          errorMsg = `⚠ User Already Exists! A user with email "${form.email}" is already registered in the system.`;
        } else if (data.employee_code && (data.employee_code.includes('already exists') || data.employee_code.includes('unique'))) {
          errorMsg = `⚠ Employee Code Already Exists! The code "${form.employeeCode}" is already in use.`;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (typeof data === 'object') {
          const errors = Object.values(data).flat();
          errorMsg = errors.join('. ') || errorMsg;
        }
      } else if (err?.response?.status === 500) {
        errorMsg = 'Server error (500). Check backend logs — likely database constraint issue.';
      } else if (err?.response?.status === 403 || err?.response?.status === 401) {
        errorMsg = 'Permission denied. Are you logged in as admin?';
      }

      showMessage(errorMsg, 'error');
    }

    setForm(emptyForm);
    setIsEditing(false);
    setUserModalOpen(false);
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
    setUserModalOpen(true);
  };

  const handleDelete = async (user) => {
    if (!user?.id) {
      showMessage('Cannot delete: User ID is missing', 'error');
      return;
    }

    if (!window.confirm(`Delete user "${user.name}" permanently?`)) return;

    try {
      await api.delete(`/accounts/users/${user.id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showMessage(`User "${user.name}" deleted successfully`, 'info');
    } catch (err) {
      console.error('Delete failed:', err);
      showMessage('Failed to delete user — check console', 'error');
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setUserModalOpen(false);
  };

  const handleOpenAddModal = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setUserModalOpen(true);
  };

  const filteredUsers = useMemo(() => {
    let filtered = users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.employeeCode || '').toLowerCase().includes(q);

      const matchesRole =
        filterRole === 'ALL' ||
        (Array.isArray(u.rolesList) && u.rolesList.includes(filterRole));

      const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;
      const matchesDepartment = filterDepartment === 'ALL' || (u.department || '') === filterDepartment;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aVal = a.email?.toLowerCase() || '';
          bVal = b.email?.toLowerCase() || '';
          break;
        case 'role':
          aVal = a.role?.toLowerCase() || '';
          bVal = b.role?.toLowerCase() || '';
          break;
        case 'department':
          aVal = a.department?.toLowerCase() || 'zzz';
          bVal = b.department?.toLowerCase() || 'zzz';
          break;
        case 'status':
          aVal = a.status?.toLowerCase() || '';
          bVal = b.status?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0) : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
    });

    return filtered;
  }, [users, search, filterRole, filterStatus, filterDepartment, sortBy, sortOrder]);

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
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Table */}
        <Grid size={{ xs: 12, lg: 12 }}>
          {scope === 'admin' && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size={isMobile ? 'medium' : 'large'}
                startIcon={<Refresh />}
                onClick={handleRefreshData}
                disabled={loading}
                sx={{ borderRadius: 2.5, px: 2.5, py: 1.1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                size={isMobile ? 'medium' : 'large'}
                startIcon={<PersonAdd />}
                onClick={handleOpenAddModal}
                sx={{ borderRadius: 2.5, px: 2.5, py: 1.1, boxShadow: 3 }}
              >
                Add User
              </Button>
            </Box>
          )}
          {scope !== 'admin' && (
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                size={isMobile ? 'medium' : 'large'}
                startIcon={<Refresh />}
                onClick={handleRefreshData}
                disabled={loading}
                sx={{ borderRadius: 2.5, px: 2.5, py: 1.1 }}
              >
                Refresh
              </Button>
            </Box>
          )}

          {/* Filters */}
          <Card sx={{ mb: 2, borderRadius: 3, boxShadow: 3 }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterList /> Filters & Sorting
                </Typography>
              }
              subheader="Filter and sort users by multiple criteria"
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by name, email, department, code..."
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

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Role</InputLabel>
                    <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} label="Role">
                      <MenuItem value="ALL">All Roles</MenuItem>
                      <MenuItem value="EMPLOYEE">Employee</MenuItem>
                      <MenuItem value="MANAGER">Manager</MenuItem>
                      <MenuItem value="HR">HR</MenuItem>
                      <MenuItem value="ADMIN">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                      <MenuItem value="ALL">All Status</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Department</InputLabel>
                    <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} label="Department">
                      <MenuItem value="ALL">All Departments</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={d.name}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By">
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="email">Email</MenuItem>
                      <MenuItem value="role">Role</MenuItem>
                      <MenuItem value="department">Department</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Order</InputLabel>
                    <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} label="Order">
                      <MenuItem value="asc">Ascending (A-Z)</MenuItem>
                      <MenuItem value="desc">Descending (Z-A)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Active Filters Display */}
              {(search || filterRole !== 'ALL' || filterStatus !== 'ALL' || filterDepartment !== 'ALL' || sortBy !== 'name') && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Active filters:</Typography>
                  {search && <Chip label={`Search: "${search}"`} onDelete={() => setSearch('')} size="small" color="primary" />}
                  {filterRole !== 'ALL' && <Chip label={`Role: ${filterRole}`} onDelete={() => setFilterRole('ALL')} size="small" color="secondary" />}
                  {filterStatus !== 'ALL' && <Chip label={`Status: ${filterStatus}`} onDelete={() => setFilterStatus('ALL')} size="small" color="success" />}
                  {filterDepartment !== 'ALL' && <Chip label={`Dept: ${filterDepartment}`} onDelete={() => setFilterDepartment('ALL')} size="small" color="info" />}
                  {sortBy !== 'name' && <Chip label={`Sorted by: ${sortBy}`} size="small" variant="outlined" />}
                  <Button
                    size="small"
                    onClick={() => {
                      setSearch('');
                      setFilterRole('ALL');
                      setFilterStatus('ALL');
                      setFilterDepartment('ALL');
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

          {/* Users Table */}
          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardHeader
              title={<Typography variant="h6">All Users ({filteredUsers.length} of {users.length})</Typography>}
              subheader={
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={1}>
                  <Chip label={`Total: ${filteredUsers.length}`} size="small" color="primary" />
                  <Chip label={`Active: ${filteredUsers.filter(u => u.status === 'Active').length}`} size="small" color="success" />
                  <Chip label={`Inactive: ${filteredUsers.filter(u => u.status === 'Inactive').length}`} size="small" variant="outlined" />
                  <Chip label={`Admins: ${filteredUsers.filter(u => u.role === 'ADMIN').length}`} size="small" color="error" variant="outlined" />
                  <Chip label={`HR: ${filteredUsers.filter(u => u.role === 'HR').length}`} size="small" color="secondary" variant="outlined" />
                  <Chip label={`Managers: ${filteredUsers.filter(u => u.role === 'MANAGER').length}`} size="small" color="primary" variant="outlined" />
                  <Chip label={`Employees: ${filteredUsers.filter(u => u.role === 'EMPLOYEE').length}`} size="small" variant="outlined" />
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
                            : 'No users yet. Click "Add User" to create the first account.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <TableRow key={user.id || user.email || `user-${index}`} hover>
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
                          {canEdit ? (
                            <>
                              <Tooltip title="Edit User">
                                <IconButton size="small" onClick={() => handleEdit(user)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {canDelete && (
                                <Tooltip title="Delete User">
                                  <IconButton size="small" color="error" onClick={() => handleDelete(user)}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </>
                          ) : (
                            <Chip label="Read-Only" size="small" variant="outlined" color="default" />
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

      {scope === 'admin' && (
        <Dialog
          open={userModalOpen}
          onClose={handleReset}
          fullWidth
          maxWidth="sm"
          fullScreen={isMobile}
          aria-labelledby="user-modal-title"
        >
          <DialogTitle id="user-modal-title" sx={{ pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PersonAdd color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {isEditing ? 'Edit User' : 'Add New User'}
              </Typography>
            </Stack>
          </DialogTitle>

          <Box component="form" onSubmit={handleSubmit}>
            <DialogContent dividers sx={{ pt: 2 }}>
              <Stack spacing={2.25}>
                <TextField label="Full Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
                <TextField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required />

                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select name="roleId" value={form.roleId} onChange={handleChange} label="Role">
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
                    <Select name="departmentId" value={form.departmentId} onChange={handleChange} label="Department">
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
                  <Select name="status" value={form.status} onChange={handleChange} label="Status">
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<Clear />} onClick={handleReset}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={isEditing ? <CheckCircle /> : <PersonAdd />}
              >
                {isEditing ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      )}

      {/* Visible Snackbar for messages */}
      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ '& .MuiSnackbar-root': { position: 'fixed' } }}
      >
        <Alert 
          onClose={handleSnackClose} 
          severity={snack.severity} 
          variant="filled"
          sx={{ 
            width: '100%', 
            minWidth: '300px', 
            maxWidth: '500px', 
            boxShadow: 4,
            fontWeight: 'bold',
            fontSize: '14px',
            '& .MuiAlert-message': {
              fontWeight: 'bold',
            },
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;