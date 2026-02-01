import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem as SelectMenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip as MuiChip,
  LinearProgress,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  CardHeader,
  CardMedia,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  RadioGroup,
  Radio,
  FormControlLabel as RadioFormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel,
  Autocomplete,
  Chip as AutoCompleteChip,
  Pagination,
  Breadcrumbs,
  Link,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Fab,
  Zoom,
  Fade,
  Slide,
  Grow,
  Collapse,
  Skeleton,
  Rating,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  OutlinedInput,
  FormHelperText
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  ExitToApp as ExitToAppIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  CalendarToday as CalendarTodayIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  LineStyle as LineStyleIcon,
  LocationOn as LocationOnIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Help as HelpIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

const ResponsiveDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // State management
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [userAnchorEl, setUserAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  // Sample data
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
  const employees = [
    { id: 1, name: 'John Doe', department: 'Engineering', position: 'Senior Developer', status: 'Active', avatar: 'JD' },
    { id: 2, name: 'Jane Smith', department: 'Marketing', position: 'Marketing Manager', status: 'Active', avatar: 'JS' },
    { id: 3, name: 'Bob Johnson', department: 'Sales', position: 'Sales Rep', status: 'Inactive', avatar: 'BJ' },
    { id: 4, name: 'Alice Brown', department: 'HR', position: 'HR Specialist', status: 'Active', avatar: 'AB' },
    { id: 5, name: 'Charlie Wilson', department: 'Finance', position: 'Accountant', status: 'Active', avatar: 'CW' }
  ];

  const stats = [
    { title: 'Total Employees', value: '1,234', change: '+12%', icon: <PeopleIcon />, color: '#2196f3' },
    { title: 'Active Users', value: '987', change: '+8%', icon: <VisibilityIcon />, color: '#4caf50' },
    { title: 'Departments', value: '15', change: '+2', icon: <BusinessIcon />, color: '#ff9800' },
    { title: 'Today\'s Attendance', value: '94%', change: '+3%', icon: <CalendarTodayIcon />, color: '#9c27b0' }
  ];

  const chartData = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 },
    { name: 'Jun', value: 700 }
  ];

  const pieData = [
    { name: 'Engineering', value: 40, color: '#2196f3' },
    { name: 'Marketing', value: 25, color: '#4caf50' },
    { name: 'Sales', value: 20, color: '#ff9800' },
    { name: 'HR', value: 10, color: '#9c27b0' },
    { name: 'Finance', value: 5, color: '#f44336' }
  ];

  // Effects
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Prevent zoom changes from affecting layout
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Handlers
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
    showSnackbar('Theme changed successfully!', 'info');
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(zoomLevel + 10);
      document.body.style.zoom = `${zoomLevel + 10}%`;
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(zoomLevel - 10);
      document.body.style.zoom = `${zoomLevel - 10}%`;
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    document.body.style.zoom = '100%';
  };

  const handleSearch = () => {
    showSnackbar(`Searching for: ${searchQuery}`, 'info');
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
    showSnackbar(`Filtering by: ${event.target.value}`, 'info');
  };

  const handleNextStep = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleResetSteps = () => {
    setActiveStep(0);
  };

  const handleDialogOpen = (employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleAccordionToggle = (panel) => {
    setExpandedAccordion(expandedAccordion === panel ? false : panel);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  // Render functions
  const renderAppBar = () => (
    <AppBar position="sticky" elevation={isMobile ? 1 : 3}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Responsive Dashboard
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Zoom In">
            <IconButton color="inherit" onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out">
            <IconButton color="inherit" onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset Zoom">
            <IconButton color="inherit" onClick={handleResetZoom}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton color="inherit" onClick={handleFullscreenToggle}>
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
            <IconButton color="inherit" onClick={handleDarkModeToggle}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
          <IconButton color="inherit" onClick={handleNotificationsOpen}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleUserMenuOpen}
            aria-controls="user-menu"
            aria-haspopup="true"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>U</Avatar>
          </IconButton>
        </Box>
      </Toolbar>

      <Menu
        id="user-menu"
        anchorEl={userAnchorEl}
        open={Boolean(userAnchorEl)}
        onClose={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleUserMenuClose}>
          <Avatar /> Profile
        </MenuItem>
        <MenuItem onClick={handleUserMenuClose}>
          <AccountCircleIcon sx={{ mr: 1 }} /> Account Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleUserMenuClose}>
          <ExitToAppIcon sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={handleNotificationsClose}
      >
        <MenuItem>Notification 1</MenuItem>
        <MenuItem>Notification 2</MenuItem>
        <MenuItem>Notification 3</MenuItem>
      </Menu>
    </AppBar>
  );

  const renderSidebar = () => (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={drawerOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        width: drawerOpen ? 240 : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: darkMode ? '#121212' : '#ffffff',
          borderRight: '1px solid',
          borderColor: darkMode ? 'divider' : 'divider',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
        <DashboardIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" noWrap>
          Navigation
        </Typography>
      </Box>
      
      <Divider />
      
      <List>
        {[
          { text: 'Dashboard', icon: <DashboardIcon /> },
          { text: 'Employees', icon: <PeopleIcon /> },
          { text: 'Departments', icon: <BusinessIcon /> },
          { text: 'Settings', icon: <SettingsIcon /> }
        ].map((item, index) => (
          <ListItem button key={item.text} selected={index === currentTab}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );

  const renderStatsGrid = () => (
    <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Zoom in={true} timeout={500 + (index * 100)}>
            <Card 
              sx={{ 
                height: '100%',
                backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
                boxShadow: darkMode ? 3 : 1,
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: darkMode ? 6 : 3,
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                    {stat.icon}
                  </Avatar>
                  <Chip 
                    label={stat.change} 
                    color={stat.change.startsWith('+') ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>
      ))}
    </Grid>
  );

  const renderCharts = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={8}>
        <Card sx={{ height: isMobile ? 300 : 400 }}>
          <CardHeader title="Performance Metrics" />
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card sx={{ height: isMobile ? 300 : 400 }}>
          <CardHeader title="Department Distribution" />
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEmployeeTable = () => (
    <Card sx={{ mb: 4 }}>
      <CardHeader 
        title="Employee Directory"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                label="Department"
                onChange={handleDepartmentChange}
              >
                <SelectMenuItem value="">All Departments</SelectMenuItem>
                {departments.map((dept) => (
                  <SelectMenuItem key={dept} value={dept}>{dept}</SelectMenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        }
      />
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Avatar</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>{employee.avatar}</Avatar>
                  </TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Chip 
                      label={employee.status} 
                      color={employee.status === 'Active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleDialogOpen(employee)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderStepper = () => (
    <Card sx={{ mb: 4 }}>
      <CardHeader title="Onboarding Process" />
      <CardContent>
        <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
          <Step>
            <StepLabel>Application Review</StepLabel>
            <StepContent>
              <Typography>Review the candidate's application and resume.</Typography>
              <Box sx={{ mb: 2, mt: 2 }}>
                <Button variant="contained" onClick={handleNextStep}>
                  Continue
                </Button>
              </Box>
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Interview Process</StepLabel>
            <StepContent>
              <Typography>Schedule and conduct interviews with the candidate.</Typography>
              <Box sx={{ mb: 2, mt: 2 }}>
                <Button variant="contained" onClick={handleNextStep}>
                  Continue
                </Button>
                <Button onClick={handleBackStep} sx={{ ml: 1 }}>
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Offer & Acceptance</StepLabel>
            <StepContent>
              <Typography>Send offer letter and await acceptance.</Typography>
              <Box sx={{ mb: 2, mt: 2 }}>
                <Button variant="contained" onClick={handleNextStep}>
                  Finish
                </Button>
                <Button onClick={handleBackStep} sx={{ ml: 1 }}>
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
        {activeStep === 3 && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - you're done!</Typography>
            <Button onClick={handleResetSteps} sx={{ mt: 1, mr: 1 }}>
              Reset
            </Button>
          </Paper>
        )}
      </CardContent>
    </Card>
  );

  const renderAccordions = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Accordion 
          expanded={expandedAccordion === 'panel1'} 
          onChange={() => handleAccordionToggle('panel1')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Company Overview</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Our company is dedicated to providing excellent services and products to our customers.
              We strive for innovation and quality in everything we do.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Accordion 
          expanded={expandedAccordion === 'panel2'} 
          onChange={() => handleAccordionToggle('panel2')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Team Structure</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Our team is organized into various departments, each specializing in different aspects
              of our business operations.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );

  const renderDialog = () => (
    <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Employee Details
        <IconButton
          aria-label="close"
          onClick={handleDialogClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {selectedEmployee && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
                {selectedEmployee.avatar}
              </Avatar>
              <Box>
                <Typography variant="h6">{selectedEmployee.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEmployee.position}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Department</Typography>
                <Typography>{selectedEmployee.department}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Chip 
                  label={selectedEmployee.status} 
                  color={selectedEmployee.status === 'Active' ? 'success' : 'default'}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>Close</Button>
        <Button variant="contained" onClick={() => showSnackbar('Action completed!', 'success')}>
          Take Action
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderSpeedDial = () => (
    <SpeedDial
      ariaLabel="Quick Actions"
      sx={{ position: 'fixed', bottom: 16, right: 16 }}
      icon={<SpeedDialIcon />}
      onClose={() => {}}
      onOpen={() => {}}
    >
      {[
        { icon: <AddIcon />, name: 'Add Employee' },
        { icon: <EditIcon />, name: 'Edit' },
        { icon: <DeleteIcon />, name: 'Delete' },
        { icon: <RefreshIcon />, name: 'Refresh' }
      ].map((action) => (
        <SpeedDialAction
          key={action.name}
          icon={action.icon}
          tooltipTitle={action.name}
          onClick={() => showSnackbar(`${action.name} clicked`, 'info')}
        />
      ))}
    </SpeedDial>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: darkMode ? '#121212' : '#f5f5f5' }}>
      {renderAppBar()}
      {renderSidebar()}
      
      <Box component="main" sx={{ flexGrow: 1, p: isMobile ? 2 : 3, ml: isMobile ? 0 : drawerOpen ? 30 : 0 }}>
        <Container maxWidth="xl">
          {/* Breadcrumbs */}
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
            <Link underline="hover" color="inherit" href="/">
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Home
            </Link>
            <Typography color="text.primary">Dashboard</Typography>
          </Breadcrumbs>

          {/* Welcome Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant={isMobile ? "h4" : "h3"} component="h1" gutterBottom>
              Welcome to Your Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This responsive dashboard adapts perfectly to all screen sizes and maintains functionality at any zoom level.
            </Typography>
          </Box>

          {/* Stats Grid */}
          {renderStatsGrid()}

          {/* Charts */}
          {renderCharts()}

          {/* Employee Table */}
          {renderEmployeeTable()}

          {/* Stepper */}
          {renderStepper()}

          {/* Accordions */}
          {renderAccordions()}

          {/* Additional Features */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Quick Actions" />
                <CardContent>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button variant="contained" startIcon={<AddIcon />}>
                      Add Employee
                    </Button>
                    <Button variant="outlined" startIcon={<EditIcon />}>
                      Edit
                    </Button>
                    <Button variant="text" startIcon={<DeleteIcon />}>
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Settings" />
                <CardContent>
                  <FormGroup>
                    <FormControlLabel
                      control={<Switch checked={darkMode} onChange={handleDarkModeToggle} />}
                      label="Dark Mode"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Notifications"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Auto-save"
                    />
                  </FormGroup>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Zoom Information */}
          <Box sx={{ mt: 4, p: 2, backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current Zoom Level: {zoomLevel}% | Fullscreen: {fullscreen ? 'Yes' : 'No'} | 
              Theme: {darkMode ? 'Dark' : 'Light'} | Device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
            </Typography>
          </Box>
        </Container>
      </Box>

      {renderDialog()}
      {renderSpeedDial()}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ResponsiveDashboard;