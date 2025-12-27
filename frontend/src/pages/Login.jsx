import { Box, Button, TextField, Typography, Paper } from '@mui/material';

const Login = ({ onLogin }) => {
  const handleLogin = (role) => {
    onLogin(role);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f0f2f5"
    >
      <Paper elevation={3} sx={{ p: 4, width: 400 }}>
        <Typography variant="h4" align="center" gutterBottom>
          CAMS Login
        </Typography>
        <Typography align="center" color="textSecondary" gutterBottom>
          Choose a role to test:
        </Typography>
        <Box mt={3} display="flex" flexDirection="column" gap={2}>
          <Button variant="contained" color="primary" onClick={() => handleLogin('Admin')}>
            Login as Admin
          </Button>
          <Button variant="contained" onClick={() => handleLogin('HR')}>
            Login as HR
          </Button>
          <Button variant="contained" color="success" onClick={() => handleLogin('Manager')}>
            Login as Manager
          </Button>
          <Button variant="outlined" onClick={() => handleLogin('Employee')}>
            Login as Employee
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;