// src/pages/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.service.js';
import { useNavigate, useLocation } from 'react-router-dom';

// Company logo
import companyLogo from '../asset/logo.jpg';

const Login = ({ onLogin, onNotify }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [shake, setShake] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const passwordRef = useRef(null);
  const submitRef = useRef(null);
  const emailRef = useRef(null);

  // Check for existing lock and remembered email
  useEffect(() => {
    const lockTime = localStorage.getItem('loginLockUntil');
    if (lockTime && Date.now() < parseInt(lockTime)) {
      setLockUntil(parseInt(lockTime));
    }
    
    // Load remembered email
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

  // Form validation
  useEffect(() => {
    const isValid = 
      formData.email.includes('@') && 
      formData.email.includes('.') && 
      formData.password.length >= 6;
    setFormValid(isValid);
  }, [formData]);

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (e.target.type === 'email') {
        passwordRef.current?.focus();
      } else if (e.target.type === 'password') {
        submitRef.current?.click();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if locked
    if (lockUntil) {
      const minutes = Math.ceil((lockUntil - Date.now()) / 60000);
      setError(`Account temporarily locked. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate network delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Real API call
      const response = await api.login(formData.email, formData.password);
      
      // Success - reset attempts
      localStorage.removeItem('failedAttempts');
      setAttempts(0);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Store session data
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userEmail', formData.email);
        sessionStorage.setItem('sessionStart', Date.now().toString());
      }
      
      // Success animation
      document.querySelector('.login-form').style.transform = 'scale(0.95)';
      setTimeout(() => {
        document.querySelector('.login-form').style.transform = 'scale(1)';
      }, 150);
      
      // Notify and navigate
      onNotify?.('Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        onLogin();
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }, 1000);
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Increment failed attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('failedAttempts', newAttempts.toString());
      
      // Handle lockout after 5 attempts
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 15 * 60 * 1000; // 15 minutes
        setLockUntil(lockTime);
        localStorage.setItem('loginLockUntil', lockTime.toString());
        setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        // Show specific errors
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
      
      // Error animation
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!formData.email) {
      emailRef.current?.focus();
      setError('Please enter your email first');
      return;
    }
    navigate(`/reset-password?email=${encodeURIComponent(formData.email)}`);
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Login Assistance Request');
    const body = encodeURIComponent(`I need help logging in. My email: ${formData.email || 'Not provided'}`);
    window.location.href = `mailto:support@company.com?subject=${subject}&body=${body}`;
  };

  const getRemainingTime = () => {
    if (!lockUntil) return '';
    const seconds = Math.ceil((lockUntil - Date.now()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 1) return { strength: 1, label: 'Weak', color: '#e53e3e' };
    if (strength <= 3) return { strength: 2, label: 'Medium', color: '#ed8936' };
    return { strength: 3, label: 'Strong', color: '#48bb78' };
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Animated background elements */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      
      <div 
        className="login-form"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          padding: '48px 40px',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
          transform: shake ? 'translateX(0)' : 'translateX(0)',
          animation: shake ? 'shake 0.5s ease-in-out' : 'none',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative corner */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, transparent 50%, #667eea 50%)',
          borderBottomLeftRadius: '24px',
        }} />
        
        {/* Logo/Header */}
        <div style={{ marginBottom: '40px', position: 'relative' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 12px 32px rgba(102, 126, 234, 0.35)',
            border: '4px solid #667eea',
          }}>
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
              }} 
            />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a202c',
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
            lineHeight: '1.3',
          }}>
            Welcome Back
          </h1>
          <p style={{
            color: '#718096',
            fontSize: '15px',
            margin: 0,
            lineHeight: '1.5',
          }}>
            Sign in to <strong style={{ color: '#667eea' }}>CP Attendance System</strong>
          </p>
        </div>

        {/* Lock timer */}
        {lockUntil && (
          <div style={{
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#e53e3e">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span style={{ color: '#c53030', fontWeight: '500' }}>
              Locked for {getRemainingTime()}
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '24px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#e53e3e">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <div style={{ color: '#c53030', fontWeight: '500', marginBottom: '4px' }}>
                {error}
              </div>
              {attempts > 0 && attempts < 5 && (
                <div style={{ color: '#718096', fontSize: '14px' }}>
                  {5 - attempts} attempt{attempts === 4 ? '' : 's'} remaining
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
          {/* Email field */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              position: 'relative',
              border: `2px solid ${focusedField === 'email' ? '#667eea' : '#e2e8f0'}`,
              borderRadius: '12px',
              backgroundColor: focusedField === 'email' ? '#f8fafc' : 'white',
              transition: 'all 0.2s',
            }}>
              <input
                ref={emailRef}
                type="email"
                placeholder="corporate@company.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onKeyPress={handleKeyPress}
                disabled={loading || lockUntil}
                required
                style={{
                  width: '100%',
                  padding: '20px 20px 20px 52px',
                  fontSize: '16px',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: '#1a202c',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: focusedField === 'email' ? '#667eea' : '#a0aec0',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              position: 'relative',
              border: `2px solid ${focusedField === 'password' ? '#667eea' : '#e2e8f0'}`,
              borderRadius: '12px',
              backgroundColor: focusedField === 'password' ? '#f8fafc' : 'white',
              transition: 'all 0.2s',
            }}>
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyPress={handleKeyPress}
                disabled={loading || lockUntil}
                required
                style={{
                  width: '100%',
                  padding: '20px 52px 20px 52px',
                  fontSize: '16px',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: '#1a202c',
                  letterSpacing: showPassword ? 'normal' : '2px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: focusedField === 'password' ? '#667eea' : '#a0aec0',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || lockUntil}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: loading || lockUntil ? 'not-allowed' : 'pointer',
                  color: '#a0aec0',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
            
            {/* Password strength indicator */}
            {formData.password && focusedField === 'password' && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}>
                <div style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(getPasswordStrength().strength / 3) * 100}%`,
                    backgroundColor: getPasswordStrength().color,
                    transition: 'all 0.3s ease',
                  }} />
                </div>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: getPasswordStrength().color,
                  minWidth: '60px',
                }}>
                  {getPasswordStrength().label}
                </span>
              </div>
            )}
          </div>

          {/* Remember me and Forgot password */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading || lockUntil ? 'not-allowed' : 'pointer',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading || lockUntil}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: loading || lockUntil ? 'not-allowed' : 'pointer',
                  accentColor: '#667eea',
                }}
              />
              <span style={{
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                Remember me
              </span>
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading || lockUntil}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading || lockUntil ? 'not-allowed' : 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#edf2f7'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit button */}
          <button
            ref={submitRef}
            type="submit"
            disabled={loading || lockUntil || !formValid}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '16px',
              fontWeight: '600',
              background: loading ? '#a0aec0' : (lockUntil || !formValid ? '#cbd5e0' : 'linear-gradient(135deg, #667eea, #764ba2)'),
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading || lockUntil || !formValid ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: loading || lockUntil || !formValid ? 'none' : '0 8px 24px rgba(102, 126, 234, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!loading && !lockUntil && formValid) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 28px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !lockUntil && formValid) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
              }
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Authenticating...
              </div>
            ) : lockUntil ? (
              `Locked (${getRemainingTime()})`
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Help section */}
        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid #e2e8f0',
        }}>
          <div style={{
            color: '#718096',
            fontSize: '14px',
            marginBottom: '16px',
          }}>
            Need help signing in?
          </div>
          <button
            type="button"
            onClick={handleContactSupport}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '500',
              background: 'transparent',
              color: '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#cbd5e0';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            Contact System Administrator
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          color: '#a0aec0',
          fontSize: '12px',
          lineHeight: '1.5',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#48bb78">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
              <span>Secure corporate portal • v2.4.0</span>
            </div>
          </div>
          <div>
            © {new Date().getFullYear()} Corporate Attendance System • All rights reserved
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .login-form {
          animation: fadeIn 0.4s ease-out;
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #1a202c;
          -webkit-box-shadow: 0 0 0px 1000px white inset;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        input:focus {
          outline: none;
        }
        
        button:focus {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }
        
        @media (max-width: 480px) {
          .login-form {
            padding: 32px 24px !important;
            margin: 0 16px;
            max-width: 100% !important;
          }
          
          .login-form h1 {
            font-size: 24px !important;
          }
          
          .login-form input {
            font-size: 16px !important;
            padding: 16px 16px 16px 48px !important;
          }
          
          .login-form button[type="submit"] {
            padding: 18px !important;
          }
        }
        
        @media (max-width: 380px) {
          .login-form {
            padding: 24px 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;