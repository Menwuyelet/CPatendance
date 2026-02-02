// src/pages/Login.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../services/api.service.js';
import { useNavigate, useLocation } from 'react-router-dom';

// Company logo
import companyLogo from '../asset/logo.jpg';

// Dark theme colors
const colors = {
  background: '#0a0a0a',
  card: '#141414',
  cardBorder: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  primary: '#cc0000',
  primaryHover: '#dd3333',
  inputBg: '#1a1a1a',
  inputBorder: '#333333',
  inputBorderFocus: '#cc0000',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  success: '#22c55e',
};

// Inline styles for better performance
const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    backgroundImage: 'linear-gradient(135deg, #000000 0%, #1a0000 50%, #cc0000 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: 'border-box',
  },
  formCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    padding: '40px 32px',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    position: 'relative',
  },
  logoContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    border: `2px solid ${colors.primary}`,
    background: 'linear-gradient(135deg, #000000 0%, #cc0000 100%)',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: colors.text,
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: colors.textSecondary,
    margin: 0,
    lineHeight: '1.5',
  },
  subtitleHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: '8px',
    textAlign: 'left',
  },
  inputWrapper: {
    position: 'relative',
    borderRadius: '10px',
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    transition: 'all 0.2s ease',
  },
  input: {
    width: '100%',
    padding: '14px 16px 14px 48px',
    fontSize: '15px',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: colors.text,
    boxSizing: 'border-box',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.textSecondary,
  },
  passwordInput: {
    width: '100%',
    padding: '14px 48px 14px 48px',
    fontSize: '15px',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: colors.text,
    letterSpacing: '2px',
    boxSizing: 'border-box',
  },
  togglePassword: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.textSecondary,
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: `linear-gradient(135deg, ${colors.primary} 0%, #990000 100%)`,
    boxShadow: '0 4px 15px rgba(204, 0, 0, 0.3)',
    marginTop: '8px',
  },
  helpButton: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '500',
    background: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '12px',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.cardBorder}`,
  },
  copyright: {
    fontSize: '12px',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: '1.6',
  },
  copyrightHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  version: {
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
  },
  errorContainer: {
    backgroundColor: colors.errorBg,
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '24px',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  lockContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  errorText: {
    color: colors.error,
    fontWeight: '500',
    fontSize: '14px',
    marginBottom: '4px',
  },
  errorSubtext: {
    color: colors.textSecondary,
    fontSize: '12px',
  },
  lockText: {
    color: colors.error,
    fontWeight: '500',
    fontSize: '14px',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  logoPlaceholder: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
};

// Helper function to get input border color
const getInputBorderColor = (focused, error) => {
  if (error) return colors.error;
  if (focused) return colors.inputBorderFocus;
  return colors.inputBorder;
};

const Login = ({ onLogin, onNotify }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);

  // Memoized form validation
  const formValid = useMemo(() => {
    const { email, password } = formData;
    return email.includes('@') && email.includes('.') && password.length >= 6;
  }, [formData]);

  // Memoized remaining time
  const remainingTime = useMemo(() => {
    if (!lockUntil) return '';
    const seconds = Math.ceil((lockUntil - Date.now()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, [lockUntil]);

  // Load lock and remembered email
  useEffect(() => {
    const lockTime = localStorage.getItem('loginLockUntil');
    if (lockTime && Date.now() < parseInt(lockTime, 10)) {
      setLockUntil(parseInt(lockTime, 10));
    }
    
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Check session expiry
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired')) {
      setError('Session expired. Please login again.');
      onNotify?.('Your session has expired', 'warning');
    }
  }, [location, onNotify]);

  // Handle lock countdown
  useEffect(() => {
    if (!lockUntil) return;
    
    const interval = setInterval(() => {
      const remaining = lockUntil - Date.now();
      if (remaining <= 0) {
        setLockUntil(null);
        localStorage.removeItem('loginLockUntil');
        localStorage.removeItem('failedAttempts');
        setAttempts(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockUntil]);

  // Handle input change
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  }, [error]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      if (e.target.type === 'email') {
        document.querySelector('[type="password"]')?.focus();
      } else if (e.target.type === 'password') {
        document.querySelector('[type="submit"]')?.click();
      }
    }
  }, []);

  // Handle success animation
  const triggerSuccessAnimation = useCallback(() => {
    if (formRef.current) {
      formRef.current.style.transform = 'scale(0.98)';
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.style.transform = 'scale(1)';
        }
      }, 150);
    }
  }, []);

  // Handle error animation
  const triggerErrorAnimation = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (lockUntil) {
      const minutes = Math.ceil((lockUntil - Date.now()) / 60000);
      setError(`Account temporarily locked. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      triggerErrorAnimation();
      return;
    }

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      triggerErrorAnimation();
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      triggerErrorAnimation();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.login(formData.email, formData.password);
      
      localStorage.removeItem('failedAttempts');
      setAttempts(0);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userEmail', formData.email);
        sessionStorage.setItem('sessionStart', Date.now().toString());
      }
      
      triggerSuccessAnimation();
      onNotify?.('Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        onLogin();
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }, 1000);
      
    } catch (err) {
      console.error('Login error:', err);
      
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('failedAttempts', newAttempts.toString());
      
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 15 * 60 * 1000;
        setLockUntil(lockTime);
        localStorage.setItem('loginLockUntil', lockTime.toString());
        setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        let errorMsg = 'Login failed';
        if (err.response?.status === 401) {
          errorMsg = 'Invalid email or password';
        } else if (err.response?.status === 403) {
          errorMsg = 'Account is locked or disabled';
        } else if (err.response?.status === 429) {
          errorMsg = 'Too many requests. Please wait.';
        } else if (!navigator.onLine) {
          errorMsg = 'No internet connection';
        } else if (err.message.includes('Network')) {
          errorMsg = 'Cannot connect to server';
        }
        
        setError(errorMsg);
        onNotify?.(errorMsg, 'error');
      }
      
      triggerErrorAnimation();
      
    } finally {
      setLoading(false);
    }
  }, [lockUntil, formData, attempts, rememberMe, navigate, location, onLogin, onNotify, triggerSuccessAnimation, triggerErrorAnimation]);

  // Dynamic styles based on state
  const getSubmitButtonStyle = () => ({
    ...styles.submitButton,
    opacity: loading || lockUntil || !formValid ? 0.6 : 1,
    cursor: loading || lockUntil || !formValid ? 'not-allowed' : 'pointer',
  });

  const getInputWrapperStyle = (field) => ({
    ...styles.inputWrapper,
    border: `1px solid ${getInputBorderColor(focusedField === field, false)}`,
  });

  return (
    <div style={styles.container}>
      <div 
        ref={formRef}
        className="login-form"
        style={{
          ...styles.formCard,
          animation: shake ? 'shake 0.5s ease-in-out' : 'fadeIn 0.4s ease-out',
        }}
      >
        {/* Logo */}
        <div style={styles.logoContainer}>
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              style={styles.logoImage}
            />
          ) : (
            <span style={styles.logoPlaceholder}>C</span>
          )}
        </div>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>
            Sign in to <strong style={styles.subtitleHighlight}>CP Attendance</strong>
          </p>
        </div>

        {/* Lock timer */}
        {lockUntil && (
          <div style={styles.lockContainer}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={colors.error}>
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <span style={styles.lockText}>Locked for {remainingTime}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={styles.errorContainer}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={colors.error}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <div style={styles.errorText}>{error}</div>
              {attempts > 0 && attempts < 5 && (
                <div style={styles.errorSubtext}>{5 - attempts} attempt{attempts === 4 ? '' : 's'} remaining</div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email field */}
          <div style={styles.formGroup}>
            <div style={getInputWrapperStyle('email')}>
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onKeyPress={handleKeyPress}
                disabled={loading || lockUntil}
                required
                style={styles.input}
              />
              <div style={{
                ...styles.inputIcon,
                color: focusedField === 'email' ? colors.primary : colors.textSecondary
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Password field */}
          <div style={styles.formGroup}>
            <div style={getInputWrapperStyle('password')}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyPress={handleKeyPress}
                disabled={loading || lockUntil}
                required
                style={{
                  ...styles.passwordInput,
                  letterSpacing: showPassword ? 'normal' : '2px'
                }}
              />
              <div style={{
                ...styles.inputIcon,
                color: focusedField === 'password' ? colors.primary : colors.textSecondary
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || lockUntil}
                style={{
                  ...styles.togglePassword,
                  color: showPassword ? colors.primary : colors.textSecondary,
                  cursor: loading || lockUntil ? 'not-allowed' : 'pointer'
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || lockUntil || !formValid}
            style={getSubmitButtonStyle()}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Help button */}
          <button
            type="button"
            onClick={() => navigate('/help')}
            style={styles.helpButton}
          >
            Need Help?
          </button>
        </form>

        {/* Copyright Footer */}
        <div style={styles.footer}>
          <div style={styles.copyright}>
            © {new Date().getFullYear()} <span style={styles.copyrightHighlight}>AMN System</span> - Smart solutions that make your work easier.
          </div>
          <div style={styles.version}>Version 1.0.0</div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-form {
          animation: fadeIn 0.4s ease-out;
        }
        input::placeholder {
          color: #666;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0px 1000px #1a1a1a inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
};

export default Login;
