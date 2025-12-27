// src/pages/Login.jsx
import React, { useState } from 'react';
import { api } from '../services/api.service.js';

const Login = ({ onLogin, onNotify }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(email, password);
      onLogin(); // Success → App will fetch user data
    } catch (err) {
      setError('Invalid email or password');
      onNotify?.('Login failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '50px 60px',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          width: '440px',
          maxWidth: '100%',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#1a1a1a' }}>
          CAMS Login
        </h1>
        <p style={{ color: '#666', marginBottom: '40px', fontSize: '15px' }}>
          Welcome back! Please login to your account.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                borderRadius: '10px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password Field with Show/Hide */}
          <div style={{ marginBottom: '12px', position: 'relative', textAlign: 'left' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px 50px 16px 16px',
                fontSize: '16px',
                borderRadius: '10px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#666',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNotify?.('Forgot password feature coming soon!', 'info');
              }}
              style={{ color: '#1976d2', fontSize: '14px', textDecoration: 'none' }}
            >
              Forgot Password?
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <p style={{ color: '#d32f2f', margin: '10px 0 20px', fontWeight: '500' }}>
              {error}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              fontWeight: '600',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '30px 0',
            color: '#aaa',
            fontSize: '14px',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
          <span style={{ padding: '0 15px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
        </div>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Google Login */}
          <button
            type="button"
            onClick={() => onNotify?.('Google login coming soon!', 'info')}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <img src="https://www.google.com/favicon.ico" alt="G" width="20" />
            Login with Google
          </button>

          {/* Microsoft Login */}
          <button
            type="button"
            onClick={() => onNotify?.('Microsoft login coming soon!', 'info')}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              backgroundColor: '#2f2f2f',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <img src="https://www.microsoft.com/favicon.ico" alt="M" width="20" />
            Login with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;