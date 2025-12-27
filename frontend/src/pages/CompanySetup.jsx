// src/pages/CompanySetup.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from '@mui/material';
import { api } from '../services/api.service.js';

// Admin page to create and list companies.
// Uses real backend endpoints under /api/employees/companies/.

const CompanySetup = ({ onNotify }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    timezone: 'UTC',
  });

  // Load companies directly from backend API
  const loadCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/employees/companies/');
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load companies', err);
      setError('Failed to load companies from server.');
      onNotify?.('Failed to load companies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      onNotify?.('Company name is required', 'error');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await api.post('/employees/companies/', {
        name: form.name,
        timezone: form.timezone,
      });
      setCompanies((prev) => [...prev, created]);
      setForm({ name: '', timezone: 'UTC' });
      onNotify?.('Company created successfully', 'success');
    } catch (err) {
      console.error('Failed to create company', err);
      setError('Failed to create company.');
      onNotify?.('Failed to create company', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', mx: 'auto' }}>
      <Typography variant="h3" fontWeight="bold" gutterBottom>
        Company Setup
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create and manage companies. Use the Company ID shown here when creating
        employees in the User Management page.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        {/* Left: Create company */}
        <Box flex={1}>
          <Card>
            <CardHeader title="Add New Company" />
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <TextField
                  label="Company Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  fullWidth
                  required
                />
                <TextField
                  label="Timezone"
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  fullWidth
                  helperText="e.g. Africa/Addis_Ababa or UTC"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Create Company'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right: Company list */}
        <Box flex={1}>
          <Card>
            <CardHeader title="Existing Companies" />
            <CardContent>
              {loading ? (
                <Typography>Loading...</Typography>
              ) : companies.length === 0 ? (
                <Alert severity="info">No companies yet. Create one using the form.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>ID</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Timezone</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Created At</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {companies.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.id}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.timezone}</TableCell>
                        <TableCell>{c.created_at}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};

export default CompanySetup;
