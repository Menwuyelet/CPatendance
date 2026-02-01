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
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/* good practice in development */}
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* resets browser defaults */}
      <NotificationProvider> {/* ← this makes notify() available everywhere */}
        <BrowserRouter 
          future={{ 
            v7_startTransition: true, 
            v7_relativeSplatPath: true 
          }}
        >
          <App />
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>
);