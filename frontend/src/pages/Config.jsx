import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  InputAdornment,
  Stack,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search,
  Clear,
} from '@mui/icons-material';

const Config = ({ onNotify, role }) => {
  const isAdmin = role === 'Admin';
  const isHR = role === 'HR';
  const canManageConfig = isAdmin || isHR;

  const [holidays, setHolidays] = useState([
    { id: 1, name: 'New Year', date: '2024-01-01', type: 'Public' },
    { id: 2, name: 'Independence Day', date: '2024-07-04', type: 'National' },
    { id: 3, name: 'Christmas', date: '2024-12-25', type: 'Public' },
    { id: 4, name: 'Company Day', date: '2024-05-15', type: 'Company' },
  ]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public' });

  // Filter holidays
  const filteredHolidays = holidays.filter(holiday => {
    const name = (holiday.name || '').toLowerCase();
    const date = (holiday.date || '').toLowerCase();
    const searchLower = search.toLowerCase();
    
    const matchesSearch = search === '' || 
      name.includes(searchLower) ||
      date.includes(searchLower);
    
    const matchesType = typeFilter === '' || holiday.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
  };

  // Add new holiday
  const handleAddHoliday = () => {
    if (!newHoliday.name || !newHoliday.date) {
      onNotify?.('Please fill in all fields', 'warning');
      return;
    }

    const newHolidayWithId = {
      ...newHoliday,
      id: holidays.length + 1,
    };

    setHolidays([...holidays, newHolidayWithId]);
    setNewHoliday({ name: '', date: '', type: 'Public' });
    setDialogOpen(false);
    onNotify?.('Holiday added successfully', 'success');
  };

  // Delete holiday
  const handleDeleteHoliday = (id) => {
    if (!canManageConfig) {
      onNotify?.('You do not have permission', 'warning');
      return;
    }

    const confirmed = window.confirm('Delete this holiday?');
    if (!confirmed) return;

    setHolidays(holidays.filter(h => h.id !== id));
    onNotify?.('Holiday deleted', 'success');
  };

  // Holiday types for dropdown
  const holidayTypes = ['Public', 'National', 'Company', 'Religious', 'Optional'];

  if (!canManageConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Admin/HR only.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Holiday Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Holiday
        </Button>
      </Stack>

      {/* Filter Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search holidays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                endAdornment: search && (
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <Clear />
                  </IconButton>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
            
            <TextField
              select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Types</MenuItem>
              {holidayTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>

            {(search || typeFilter) && (
              <Button onClick={clearFilters} startIcon={<Clear />}>
                Clear
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Holidays Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {filteredHolidays.length} holidays found
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHolidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No holidays found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHolidays.map(holiday => (
                    <TableRow key={holiday.id} hover>
                      <TableCell>{holiday.date}</TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={holiday.type} 
                          size="small" 
                          color={
                            holiday.type === 'Public' ? 'primary' :
                            holiday.type === 'National' ? 'secondary' :
                            holiday.type === 'Company' ? 'success' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteHoliday(holiday.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Settings Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SettingsIcon color="primary" />
            <Box>
              <Typography variant="subtitle1">System Settings</Typography>
              <Typography variant="body2" color="text.secondary">
                Contact system administrator for other settings
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              sx={{ ml: 'auto' }}
              onClick={() => onNotify?.('Settings panel coming soon', 'info')}
            >
              View Settings
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add New Holiday</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <TextField
              label="Holiday Name"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
              fullWidth
              required
            />
            <TextField
              label="Date"
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              select
              label="Type"
              value={newHoliday.type}
              onChange={(e) => setNewHoliday({...newHoliday, type: e.target.value})}
              fullWidth
            >
              {holidayTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddHoliday} variant="contained">
            Add Holiday
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Config;