import { List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Dashboard, People, EventNote, Report, Settings, FaceRetouchingNatural } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Sidebar = ({ role }) => {
  const menu = {
    Admin: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Users', icon: <People />, path: '/users' },
      { text: 'Config', icon: <Settings />, path: '/config' },
      { text: 'Attendance', icon: <EventNote />, path: '/attendance' },
      { text: 'Biometrics', icon: <FaceRetouchingNatural />, path: '/biometrics' },
      { text: 'Reports', icon: <Report />, path: '/reports' },
    ],
    HR: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Employees', icon: <People />, path: '/employees' },
      { text: 'Attendance', icon: <EventNote />, path: '/attendance' },
      { text: 'Leaves', icon: <EventNote />, path: '/leaves' },n      { text: 'Reports', icon: <Report />, path: '/reports' },
    ],
    Manager: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Team', icon: <People />, path: '/team' },
      { text: 'Approvals', icon: <EventNote />, path: '/approvals' },
      { text: 'Reports', icon: <Report />, path: '/reports' },
    ],
    Employee: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'My Attendance', icon: <EventNote />, path: '/attendance' },
      { text: 'My Leaves', icon: <EventNote />, path: '/leaves' },
      { text: 'My Reports', icon: <Report />, path: '/reports' },
    ],
  };

  return (
    <div
      style={{
        width: 260,
        backgroundColor: '#ffffff',
        color: '#111827',
        padding: '16px',
        borderRight: '1px solid #e5e7eb',
      }}
    >
      <Typography variant="h6" align="center" gutterBottom color="primary">
        CAMS - {role}
      </Typography>
      <List>
        {menu[role].map((item) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            sx={{
              borderRadius: 2,
              mb: 1,
              '&:hover': { backgroundColor: '#f3f4f6' },
            }}
          >
            <ListItemIcon sx={{ color: '#4b5563' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default Sidebar;
