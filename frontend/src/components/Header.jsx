import { AppBar, Toolbar, Typography, IconButton, Avatar } from '@mui/material';
import { Notifications, Logout } from '@mui/icons-material';

const Header = ({ user, onLogout }) => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Company Attendance Management System
        </Typography>
        <IconButton><Notifications /></IconButton>
        <IconButton><Avatar>{user.role[0]}</Avatar></IconButton>
        <IconButton onClick={onLogout}><Logout /></IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;