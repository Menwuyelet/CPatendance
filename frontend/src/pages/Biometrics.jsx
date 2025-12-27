// src/pages/Biometrics.jsx
import React, { useState, useEffect } from 'react';
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
  Avatar,
  Stack,
  Divider,
  Alert,
  Paper,
  CircularProgress,
  TableContainer,
} from '@mui/material';
import {
  Delete,
  CameraAlt,
  Fingerprint,
  CheckCircle,
  Visibility,
  Security,
  PersonAdd,
  HowToReg,
  Cancel,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';

const Biometrics = ({ onNotify }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Load all biometric enrollments from backend when component mounts
  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        setLoading(true);
        // Note: This endpoint doesn't exist yet in your Django backend
        // You need to create it in Django first
        const data = await api.get('/biometrics/enrollments/');
        
        // Handle both array and paginated response
        const list = Array.isArray(data) 
          ? data 
          : data.results || [];

        // Map to frontend format
        const mapped = list.map(item => ({
          id: item.id,
          employeeId: item.employee_id || item.employee?.employee_code || 'Unknown',
          name: item.employee?.full_name || item.employee_name || `Employee ${item.employee_id}`,
          method: item.method || 'Face',
          status: item.is_active !== false ? 'Enrolled' : 'Revoked',
          lastSeen: item.last_used 
            ? new Date(item.last_used).toLocaleString() 
            : 'Never used',
          enrolledAt: item.created_at 
            ? new Date(item.created_at).toLocaleDateString() 
            : 'Unknown',
        }));

        setEnrollments(mapped);
      } catch (err) {
        console.error('Failed to load biometric enrollments:', err);
        onNotify?.('Could not load biometric data. Server may be offline or endpoint not implemented.', 'error');
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [onNotify]);

  // Enroll new employee
  const handleEnroll = async () => {
    if (!employeeId.trim()) {
      onNotify?.('Please enter a valid Employee ID', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        employee_id: employeeId.trim().toUpperCase(),
        method: 'FACE',
      };

      // Note: This endpoint doesn't exist yet in your Django backend
      const response = await api.post('/biometrics/enroll/', payload);

      const newEnrollment = {
        id: response.id,
        employeeId: response.employee_id || employeeId.trim().toUpperCase(),
        name: response.employee_name || response.employee?.full_name || `Employee ${employeeId.trim().toUpperCase()}`,
        method: response.method || 'Face',
        status: 'Enrolled',
        lastSeen: 'Just enrolled',
        enrolledAt: new Date().toLocaleDateString(),
      };

      // Add to top of list
      setEnrollments(prev => [newEnrollment, ...prev]);
      setEmployeeId('');
      onNotify?.(`Successfully enrolled ${newEnrollment.employeeId}`, 'success');
    } catch (err) {
      console.error('Enrollment failed:', err);
      onNotify?.('Enrollment failed. Biometric endpoints may not be implemented yet.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Remove/Revoke enrollment
  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this biometric enrollment? The employee will need to re-enroll.')) {
      return;
    }

    try {
      // Note: This endpoint doesn't exist yet in your Django backend
      await api.delete(`/biometrics/enrollments/${id}/`);
      setEnrollments(prev => prev.filter(e => e.id !== id));
      onNotify?.('Biometric access revoked', 'info');
    } catch (err) {
      onNotify?.('Failed to revoke enrollment', 'error');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Fingerprint sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" fontWeight="bold">
            Biometric Enrollment Management
          </Typography>
          <Chip label="Optional Feature" color="info" size="small" sx={{ ml: 2 }} />
        </Stack>
        <Typography variant="body1" color="text.secondary">
          Secure facial recognition for contactless clock-in. Templates are encrypted and never store raw images.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left: Privacy & Process */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Alert
            severity="info"
            icon={<Security />}
            sx={{ mb: 4, borderRadius: 2, bgcolor: 'info.light' }}
          >
            <Typography variant="subtitle2" fontWeight="medium">
              Privacy-First Biometrics
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Raw images are discarded immediately. Only irreversible mathematical templates are stored, encrypted at rest.
            </Typography>
          </Alert>

          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardHeader
              title={<Typography variant="h6">Enrollment Process</Typography>}
              avatar={<HowToReg color="success" />}
            />
            <Divider />
            <CardContent>
              <Stack spacing={3}>
                {[
                  'Employee enters their unique ID',
                  'System verifies identity via existing record',
                  'Camera captures face (live feed)',
                  'AI generates encrypted template on secure server',
                  'Raw image deleted instantly',
                  'Template saved — ready for clock-in',
                ].map((step, i) => (
                  <Stack direction="row" spacing={2} key={i}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {i + 1}
                    </Avatar>
                    <Typography variant="body2" sx={{ pt: 0.8 }}>{step}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Controls & List */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 4 }}>
            <CardHeader
              title={<Typography variant="h6">Enroll New Employee</Typography>}
              subheader="Only employees already registered in the system can be enrolled"
            />
            <Divider />
            <CardContent>
              <Stack spacing={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    height: 320,
                    bgcolor: 'grey.100',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderStyle: 'dashed',
                    borderRadius: 2,
                  }}
                >
                  <CameraAlt sx={{ fontSize: 70, color: 'grey.500', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Camera Feed (Production)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center', px: 4 }}>
                    Live video stream will appear here during real enrollment
                  </Typography>
                </Paper>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="end">
                  <TextField
                    label="Employee ID"
                    placeholder="e.g. EMP-001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    fullWidth
                    disabled={processing}
                    InputProps={{
                      startAdornment: <PersonAdd sx={{ color: 'action.active', mr: 1 }} />,
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={processing ? <CircularProgress size={20} /> : <Fingerprint />}
                    onClick={handleEnroll}
                    disabled={!employeeId.trim() || processing}
                    sx={{ px: 5, py: 1.8 }}
                  >
                    {processing ? 'Enrolling...' : 'Enroll Face'}
                  </Button>
                </Stack>

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button variant="outlined" startIcon={<CameraAlt />} disabled>
                    Start Camera
                  </Button>
                  <Button variant="outlined" startIcon={<Visibility />} disabled>
                    Test Verification
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Enrolled List */}
          <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
            <CardHeader
              title={<Typography variant="h6">Enrolled Employees ({enrollments.length})</Typography>}
              subheader="Employees with active biometric access"
            />
            <Divider />
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Employee</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Enrolled On</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Loading enrollments...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                        <Stack spacing={2} alignItems="center">
                          <Fingerprint sx={{ fontSize: 60, color: 'grey.400' }} />
                          <Typography variant="h6" color="text.secondary">
                            No Biometric Enrollments Yet
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, textAlign: 'center' }}>
                            Enroll your first employee by entering their Employee ID above and clicking "Enroll Face".
                            Only registered employees can be enrolled.
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrollments.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {e.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {e.name}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip label={e.employeeId} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={e.method} color="primary" variant="outlined" size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{e.enrolledAt}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{e.lastSeen}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={e.status}
                            color={e.status === 'Enrolled' ? 'success' : 'default'}
                            icon={e.status === 'Enrolled' ? <CheckCircle /> : <Cancel />}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRevoke(e.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
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

export default Biometrics;