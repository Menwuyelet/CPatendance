import React, { useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
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
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';

const initialUsers = [
  { id: 1, name: 'John Doe',   email: 'john@example.com',       role: 'Employee', department: 'Sales',       status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com',       role: 'Manager',  department: 'Engineering', status: 'Active' },
  { id: 3, name: 'Alice HR',   email: 'alice.hr@example.com',   role: 'HR',       department: 'HR',          status: 'Active' },
];

const emptyForm = {
  id: null,
  name: '',
  email: '',
  role: 'Employee',
  department: '',
  status: 'Active',
};

const UserManagement = ({ scope = 'admin', onNotify }) => {
  const title =
    scope === 'hr' ? 'Employee Directory' : 'User & Access Management';
  const description =
    scope === 'hr'
      ? 'View and maintain employee profiles, roles, departments, and status.'
      : 'System-wide management of user accounts, roles, departments, and access.';

  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const canDelete = scope === 'admin';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.department.trim()) return;

    if (isEditing) {
      setUsers((prev) => prev.map((u) => (u.id === form.id ? { ...u, ...form } : u)));
      if (onNotify) onNotify('User updated (mock).');
    } else {
      const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      setUsers((prev) => [...prev, { ...form, id: nextId }]);
      if (onNotify) onNotify('User created (mock).');
    }

    setForm(emptyForm);
    setIsEditing(false);
  };

  const handleEdit = (user) => {
    setForm(user);
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    if (!canDelete) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (onNotify) onNotify('User removed (mock).', 'success');
    if (form.id === id) {
      setForm(emptyForm);
      setIsEditing(false);
    }
  };

  const handleResetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q);
      const matchesRole =
        filterRole === 'ALL' || u.role.toLowerCase() === filterRole.toLowerCase();
      const matchesStatus =
        filterStatus === 'ALL' ||
        u.status.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, filterRole, filterStatus]);

  const activeCount = users.filter((u) => u.status === 'Active').length;
  const inactiveCount = users.filter((u) => u.status === 'Inactive').length;

  const roleColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'error';
      case 'Manager':
        return 'primary';
      case 'HR':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const statusColor = (status) =>
    status === 'Active' ? 'success' : 'default';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        {description}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isEditing ? 'Edit user' : 'Add new user'}
              </Typography>
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}
              >
                <TextField
                  label="Full name"
                  name="name"
                  size="small"
                  value={form.name}
                  onChange={handleChange}
                  fullWidth
                />
                <TextField
                  label="Work email"
                  name="email"
                  type="email"
                  size="small"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                />
                <FormControl size="small" fullWidth>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select
                    labelId="role-label"
                    label="Role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <MenuItem value="Employee">Employee</MenuItem>
                    <MenuItem value="Manager">Manager</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Department"
                  name="department"
                  size="small"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Sales, Engineering"
                  fullWidth
                />
                <FormControl size="small" fullWidth>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={handleResetForm}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" variant="contained" size="small">
                    {isEditing ? 'Save changes' : 'Add user'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Search sx={{ color: 'action.active' }} />
                  <TextField
                    variant="standard"
                    placeholder="Search by name, email, department"
                    fullWidth
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Box>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="filter-role-label">Role</InputLabel>
                    <Select
                      labelId="filter-role-label"
                      label="Role"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <MenuItem value="ALL">All</MenuItem>
                      <MenuItem value="Employee">Employee</MenuItem>
                      <MenuItem value="Manager">Manager</MenuItem>
                      <MenuItem value="HR">HR</MenuItem>
                      <MenuItem value="Admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="filter-status-label">Status</InputLabel>
                    <Select
                      labelId="filter-status-label"
                      label="Status"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="ALL">All</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6">Users</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={`Active: ${activeCount}`} color="success" size="small" />
                  <Chip
                    label={`Inactive: ${inactiveCount}`}
                    variant="outlined"
                    size="small"
                  />
                </Stack>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          color={roleColor(user.role)}
                          variant={user.role === 'Employee' ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          size="small"
                          color={statusColor(user.status)}
                          variant={user.status === 'Active' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(user)}
                          sx={{ mr: 0.5 }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        {canDelete && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="textSecondary">
                          No users match the current filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserManagement;
