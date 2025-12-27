// src/pages/LeaveRequest.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Button,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { api } from '../services/api.service.js';

const LeaveRequest = ({ role, onNotify }) => {
  const isEmployee = role === 'Employee';
  const isApprover = ['Manager', 'HR', 'Admin'].includes(role);

  const heading = isEmployee
    ? 'My Leave Requests'
    : isApprover
    ? 'Leave Approval Center'
    : 'Leave Management';

  const [form, setForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load leave requests once when this page mounts. Including `onNotify` in
  // the dependency array makes this refetch every time the parent updates the
  // toast callback, which can spam the API.
  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/leave/requests/');
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Unable to load leave requests.');
        setRequests([]);
        onNotify?.('Failed to fetch leave data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      onNotify?.('Please fill all fields.', 'warning');
      return;
    }

    const newRequest = {
      type: form.type,
      start_date: form.startDate,
      end_date: form.endDate,
      reason: form.reason,
      status: 'Pending',
      employee: 'Current User', // Will come from backend later
    };

    try {
      const saved = await api.post('/leave/requests/', newRequest);
      setRequests(prev => [saved || { ...newRequest, id: Date.now() }, ...prev]);
      onNotify?.('Leave request submitted successfully.', 'success');
    } catch (err) {
      setRequests(prev => [{ ...newRequest, id: Date.now() }, ...prev]);
      onNotify?.('Request saved locally (backend offline).', 'warning');
    }

    setForm({ type: 'Vacation', startDate: '', endDate: '', reason: '' });
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/leave/requests/${id}/`, { status });
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status } : r)
      );
      onNotify?.(`Leave request ${status.toLowerCase()}.`, 'success');
    } catch (err) {
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status } : r)
      );
      onNotify?.('Status updated locally.', 'warning');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        {heading}
      </Typography>

      <Grid container spacing={4}>
        {/* Leave Request Form - Only Employees */}
        {isEmployee && (
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Submit New Leave Request
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={form.type}
                      label="Type"
                      onChange={handleChange}
                    >
                      <MenuItem value="Vacation">Vacation</MenuItem>
                      <MenuItem value="Sick">Sick Leave</MenuItem>
                      <MenuItem value="Personal">Personal</MenuItem>
                      <MenuItem value="Bereavement">Bereavement</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Start Date"
                    type="date"
                    name="startDate"
                    fullWidth
                    sx={{ mb: 2 }}
                    value={form.startDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    required
                  />

                  <TextField
                    label="End Date"
                    type="date"
                    name="endDate"
                    fullWidth
                    sx={{ mb: 2 }}
                    value={form.endDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    required
                  />

                  <TextField
                    label="Reason"
                    name="reason"
                    multiline
                    rows={4}
                    fullWidth
                    sx={{ mb: 3 }}
                    value={form.reason}
                    onChange={handleChange}
                    required
                  />

                  <Button type="submit" variant="contained" size="large" fullWidth>
                    Submit Request
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Leave Requests Table */}
        <Grid item xs={12} md={isEmployee ? 7 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leave Requests
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              ) : requests.length === 0 ? (
                <Alert severity="info">No leave requests found.</Alert>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      {!isEmployee && <TableCell><strong>Employee</strong></TableCell>}
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Dates</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      {isApprover && <TableCell align="right"><strong>Actions</strong></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        {!isEmployee && <TableCell>{req.employee || req.user?.name || 'Unknown'}</TableCell>}
                        <TableCell>{req.type}</TableCell>
                        <TableCell>{req.dates || `${req.start_date} → ${req.end_date}`}</TableCell>
                        <TableCell>
                          <Chip
                            label={req.status}
                            color={
                              req.status === 'Approved' ? 'success' :
                              req.status === 'Rejected' ? 'error' :
                              'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        {isApprover && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {req.status === 'Pending' && (
                                <>
                                  <Button
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    onClick={() => handleStatusUpdate(req.id, 'Approved')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeaveRequest;