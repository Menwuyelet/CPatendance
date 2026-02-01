// src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Download,
  FileDownload,
  Assessment,
  People,
  TrendingUp,
  FilterList,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../services/api.service.js';
import { format, subDays } from 'date-fns';
import { DashboardPage } from '../components/dashboard';

const getStatusColor = (status) => {
  if (!status) return 'default';
  const s = status.toUpperCase();
  if (['PRESENT', 'LATE'].includes(s)) return 'success';
  if (['ABSENT'].includes(s)) return 'error';
  if (['ON_LEAVE', 'PENDING'].includes(s)) return 'warning';
  return 'default';
};

const Reports = ({ onNotify }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('attendance');
  const [dateRangeValue, setDateRangeValue] = useState('7');
  const [department, setDepartment] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/employees/departments/').catch(() => ({ results: [] }));
      const list = Array.isArray(res) ? res : res?.results || [];
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      setReportData(null);
      setError('');

      // Calculate date range
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRangeValue));

      // Fetch attendance data
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const [attendanceRes, employeesRes] = await Promise.all([
        api.get(`/attendance/attendance/?start_date=${startStr}&end_date=${endStr}`).catch(() => ({ results: [] })),
        api.get('/employees/employees/').catch(() => ({ results: [] })),
      ]);

      const attendanceList = Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.results || [];
      const employeesList = Array.isArray(employeesRes) ? employeesRes : employeesRes?.results || [];

      // Filter by department if selected
      const filteredEmployees = department === 'all'
        ? employeesList
        : employeesList.filter(e => String(e.department?.id) === department);

      const employeeIds = filteredEmployees.map(e => e.id);
      const filteredAttendance = attendanceList.filter(a => {
        const empId = a.employee?.id || a.employee;
        return employeeIds.includes(empId);
      });

      // Calculate statistics
      const totalEmployees = filteredEmployees.length;
      const totalDays = parseInt(dateRangeValue);
      const expectedRecords = totalEmployees * totalDays;
      const presentCount = filteredAttendance.filter(a => 
        ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())
      ).length;
      const absentCount = filteredAttendance.filter(a => 
        a.status?.toUpperCase() === 'ABSENT'
      ).length;
      const leaveCount = filteredAttendance.filter(a => 
        a.status?.toUpperCase() === 'ON_LEAVE'
      ).length;
      const attendanceRate = expectedRecords > 0 ? Math.round((presentCount / expectedRecords) * 100) : 0;

      // Employee-wise attendance
      const employeeStats = filteredEmployees.map(emp => {
        const empAttendance = filteredAttendance.filter(a => 
          String(a.employee?.id || a.employee) === String(emp.id)
        );
        const present = empAttendance.filter(a => ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())).length;
        const rate = empAttendance.length > 0 ? Math.round((present / empAttendance.length) * 100) : 0;
        
        return {
          id: emp.id,
          name: emp.full_name || emp.user?.email?.split('@')[0] || 'Unknown',
          email: emp.user?.email || '',
          department: emp.department?.name || 'N/A',
          total: empAttendance.length,
          present,
          absent: empAttendance.filter(a => a.status?.toUpperCase() === 'ABSENT').length,
          leave: empAttendance.filter(a => a.status?.toUpperCase() === 'ON_LEAVE').length,
          attendanceRate: rate,
        };
      });

      setReportData({
        summary: {
          totalEmployees,
          totalDays,
          presentCount,
          absentCount,
          leaveCount,
          attendanceRate,
        },
        employeeStats,
        dateRange: { start: startStr, end: endStr },
      });

      onNotify?.('Report generated successfully', 'success');
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report: ' + (err.message || 'Unknown error'));
      onNotify?.('Failed to generate report: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = ['Name', 'Email', 'Department', 'Total Days', 'Present', 'Absent', 'On Leave', 'Attendance Rate (%)'];
    const rows = reportData.employeeStats.map(e => [
      e.name,
      e.email,
      e.department,
      e.total,
      e.present,
      e.absent,
      e.leave,
      e.attendanceRate,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${reportData.dateRange.start}_to_${reportData.dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    onNotify?.('Report exported to CSV', 'success');
  };

  const handleRefresh = () => {
    fetchDepartments();
    if (reportData) {
      generateReport();
    }
  };

  return (
    <DashboardPage
      title="Reports & Analytics"
      subtitle="Generate and export attendance reports"
      actions={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={generating}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Download />}
            onClick={exportToCSV}
            disabled={!reportData}
          >
            Export CSV
          </Button>
        </Stack>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Report Configuration */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Report Configuration
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRangeValue}
                  onChange={(e) => setDateRangeValue(e.target.value)}
                  label="Date Range"
                >
                  <MenuItem value="7">Last 7 Days</MenuItem>
                  <MenuItem value="14">Last 14 Days</MenuItem>
                  <MenuItem value="30">Last 30 Days</MenuItem>
                  <MenuItem value="90">Last 3 Months</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  label="Department"
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="Report Type"
                >
                  <MenuItem value="attendance">Attendance Report</MenuItem>
                  <MenuItem value="payroll">Payroll Report</MenuItem>
                  <MenuItem value="compliance">Compliance Report</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={generateReport}
                disabled={generating}
                startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <Assessment />}
                sx={{ height: 40 }}
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {generating && <LinearProgress sx={{ mb: 3 }} />}

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <People sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">{reportData.summary.totalEmployees}</Typography>
                      <Typography variant="body2">Total Employees</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <TrendingUp sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight="bold">{reportData.summary.presentCount}</Typography>
                      <Typography variant="body2">Present Days</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">{reportData.summary.absentCount}</Typography>
                      <Typography variant="body2">Absent Days</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">{reportData.summary.attendanceRate}%</Typography>
                      <Typography variant="body2">Attendance Rate</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Export Card */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold">Export Report</Typography>
                <Typography variant="body2" color="text.secondary">
                  Download attendance report as CSV for {reportData.dateRange.start} to {reportData.dateRange.end}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<FileDownload />}
                onClick={exportToCSV}
              >
                Export to CSV
              </Button>
            </CardContent>
          </Card>

          {/* Employee Details Table */}
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Employee Attendance Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {reportData.employeeStats.length === 0 ? (
                <Alert severity="info">No employee data found for the selected filters.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.light' }}>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell><strong>Department</strong></TableCell>
                        <TableCell align="center"><strong>Total</strong></TableCell>
                        <TableCell align="center"><strong>Present</strong></TableCell>
                        <TableCell align="center"><strong>Absent</strong></TableCell>
                        <TableCell align="center"><strong>Leave</strong></TableCell>
                        <TableCell align="center"><strong>Rate</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.employeeStats.map((emp) => (
                        <TableRow key={emp.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">{emp.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{emp.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{emp.department}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">{emp.total}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={emp.present} color="success" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={emp.absent} color="error" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={emp.leave} color="warning" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${emp.attendanceRate}%`} 
                              color={emp.attendanceRate >= 80 ? 'success' : emp.attendanceRate >= 50 ? 'warning' : 'error'}
                              size="small"
                              sx={{ fontWeight: 'medium' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!reportData && !generating && (
        <Card sx={{ textAlign: 'center', py: 8, borderRadius: 2, boxShadow: 3 }}>
          <Assessment sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Generate Attendance Report
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
            Select your report options above and click "Generate Report" to view attendance analytics.
          </Typography>
        </Card>
      )}
    </DashboardPage>
  );
};

export default Reports;
