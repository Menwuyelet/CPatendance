// src/main.jsx  (or index.jsx — whichever one renders your root)
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';
import './styles/global.css';

// Get initial theme from localStorage or default to dark
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme;
  }
  // Default to dark mode
  return 'dark';
};

// Create MUI theme based on current mode
const getMuiTheme = (mode) => createTheme({
  palette: {
    mode: mode,
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: mode === 'dark' ? '#0a0a0a' : '#f5f5f5',
      paper: mode === 'dark' ? '#141414' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
      secondary: mode === 'dark' ? '#a0a0a0' : '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
            '& input': {
              color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#2a2a2a' : '#d0d0d0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#3a3a3a' : '#999999',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
          '&::placeholder': {
            color: mode === 'dark' ? '#666666' : '#6b6b6b',
            opacity: 1,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: mode === 'dark' ? '#141414' : '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#141414' : '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#141414' : '#ffffff',
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'dark' ? '#141414' : '#ffffff',
          borderRight: mode === 'dark' ? '1px solid #2a2a2a' : '1px solid #e0e0e0',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: mode === 'dark' ? '#141414' : '#ffffff',
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
          '&:hover': {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#f0f0f0',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'dark' ? '1px solid #2a2a2a' : '1px solid #e0e0e0',
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
        },
        head: {
          backgroundColor: mode === 'dark' ? '#141414' : '#f8f8f8',
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#141414' : '#ffffff',
          '&:hover': {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1a1a1a' : '#f0f0f0',
          color: mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
        },
      },
    },
  },
});

// Theme context for app-wide theme management
export const ThemeContext = React.createContext({
  mode: 'dark',
  toggleTheme: () => {},
});

const AppWithTheme = () => {
  const [mode, setMode] = useState(getInitialTheme);

  useEffect(() => {
    // Apply theme mode to document, body, and localStorage
    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={getMuiTheme(mode)}>
        <CssBaseline />
        <NotificationProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>
);
