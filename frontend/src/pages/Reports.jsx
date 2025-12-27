import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';

const scopeConfig = {
  personal: {
    title: 'My Attendance Reports',
    description: 'Download and review your personal attendance and leave history.',
  },
  department: {
    title: 'Department Reports',
    description:
      'View team attendance, overtime, and leave summaries for your department.',
  },
  hr: {
    title: 'Payroll & Compliance Reports',
    description:
      'Organization-wide reports for payroll export and working hours compliance.',
  },
  system: {
    title: 'Global System Reports',
    description:
      'System-wide attendance, leave, and compliance analytics.',
  },
};

const Reports = ({ scope = 'personal' }) => {
  const { title, description } = scopeConfig[scope] || scopeConfig.personal;

  const [from, setFrom] = useState('2025-12-01');
  const [to, setTo] = useState('2025-12-31');
  const [type, setType] = useState('summary');
  const [rows, setRows] = useState([
    { period: '2025-12-01 → 2025-12-31', present: 20, absent: 1, overtime: 5 },
  ]);

  const handleGenerate = () => {
    const period = `${from} → ${to}`;

    // Very simple mocked logic just to show different shapes per report type
    if (type === 'summary') {
      setRows([
        { period, present: 20, absent: 1, overtime: 5 },
      ]);
    } else if (type === 'overtime') {
      setRows([
        { period, present: 0, absent: 0, overtime: 12 },
      ]);
    } else if (type === 'leave') {
      setRows([
        { period, present: 18, absent: 3, overtime: 0 },
      ]);
    } else if (type === 'payroll') {
      setRows([
        { period, present: 20, absent: 1, overtime: 0 },
      ]);
    }
  };

  const csvData = useMemo(() => {
    if (!rows.length) return '';
    const header = 'Period,Present days,Absent days,Overtime hours';
    const body = rows
      .map((r) => `${r.period},${r.present},${r.absent},${r.overtime}`)
      .join('\n');
    return `${header}\n${body}`;
  }, [rows]);

  const handleDownloadCsv = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reports-${scope}-${from}-to-${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        {description}
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={4}>
              <TextField
                label="From"
                type="date"
                size="small"
                fullWidth
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="To"
                type="date"
                size="small"
                fullWidth
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel id="report-type-label">Report type</InputLabel>
                <Select
                  labelId="report-type-label"
                  label="Report type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <MenuItem value="summary">Attendance summary</MenuItem>
                  <MenuItem value="overtime">Overtime</MenuItem>
                  <MenuItem value="leave">Leave balances</MenuItem>
                  <MenuItem value="payroll">Payroll export</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            size="small"
            sx={{ mt: 2, mr: 1 }}
            onClick={handleGenerate}
          >
            Generate report
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
            onClick={handleDownloadCsv}
            disabled={!rows.length}
          >
            Download CSV
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Preview (example only)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Present days</TableCell>
                <TableCell>Absent days</TableCell>
                <TableCell>Overtime hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{row.present}</TableCell>
                  <TableCell>{row.absent}</TableCell>
                  <TableCell>{row.overtime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
