// src/main.jsx  (or index.jsx — whichever one renders your root)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import { NotificationProvider } from './context/NotificationContext'; // ← added for real notifications
import './index.css';
import './styles/global.css';

// # Uncomment the following lines for HTTPS redirect in production
// const isLocalhost = window.location.hostname === 'localhost' || 
//                     window.location.hostname === '127.0.0.1' ||
//                     window.location.hostname.startsWith('192.168.') ||
//                     window.location.hostname.startsWith('10.');
// 
// if (typeof window !== 'undefined' && 
//     window.location.protocol === 'http:' && 
//     !isLocalhost) {
//   window.location.href = window.location.href.replace('http:', 'https:');
// }

// Optional: you can customize theme further
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    // Optional: add secondary, error, warning, info, success, etc.
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    // Optional: global component overrides
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // nicer buttons
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // rounded corners
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
