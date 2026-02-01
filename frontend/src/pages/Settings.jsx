import React, { useState, useEffect } from 'react';
import { api } from '../services/api.service.js';
import '../styles/settings.css';

const Settings = ({ role, onNotify }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError('');
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error('Unable to load user data:', err);
        setError('Unable to load user data.');
        onNotify?.('Failed to fetch user data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [onNotify]);

  const handleUserChange = (field, value) => {
    setUser(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError('');
    setPasswordSuccess('');
    setPasswordError('');

    try {
      const result = await api.updateUser(user.id, {
        email: user.email,
      });

      setUser(result);
      onNotify?.('Settings saved successfully.', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings.');
      onNotify?.(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeSave = async () => {
    if (!user?.employee) return;

    setSaving(true);
    setError('');

    try {
      // Update employee information
      const employeeData = {
        full_name: user.employee.full_name,
        employee_code: user.employee.employee_code,
        department: user.employee.department?.id || null
      };

      await api.put(`/employees/employees/${user.employee.id}/`, employeeData);
      onNotify?.('Employee information saved successfully.', 'success');
    } catch (err) {
      console.error('Failed to save employee information:', err);
      setError(err.message || 'Failed to save employee information.');
      onNotify?.(err.message || 'Failed to save employee information.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCombinedSave = async () => {
    await handleSave();
    if (user?.employee) {
      await handleEmployeeSave();
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    try {
      await api.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      setPasswordSuccess('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onNotify?.('Password changed successfully.', 'success');
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.message || 'Failed to change password.');
      onNotify?.(err.message || 'Failed to change password.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="settings-container">
        <div className="alert alert-error">
          <span className="alert-icon">✗</span>
          {error}
          <button className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your personal information and security preferences</p>
      </div>

      {/* User Information Card */}
      <div className="settings-card">
        <div className="card-header">
          <h2>User Information</h2>
          <button
            className={`toggle-btn ${showPasswordForm ? 'active' : ''}`}
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? 'Hide' : 'Change Password'}
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input disabled"
              value={user?.full_name || ''}
              disabled
              placeholder="Full name cannot be changed"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              onChange={(e) => handleUserChange('email', e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              className="form-input disabled"
              value={role || ''}
              disabled
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error mt-4">
            <span className="alert-icon">✗</span>
            {error}
          </div>
        )}

        <div className="card-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner small"></span> Saving...
              </>
            ) : (
              'Save User Changes'
            )}
          </button>
        </div>
      </div>

      {/* Employee Information Card */}
      {user?.employee && (
        <div className="settings-card employee-card">
          <div className="card-header">
            <h2>Employee Information</h2>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee Code</label>
              <input
                type="text"
                className="form-input"
                value={user.employee.employee_code || ''}
                onChange={(e) => setUser(prev => ({
                  ...prev,
                  employee: { ...prev.employee, employee_code: e.target.value }
                }))}
                placeholder="Employee code"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-input"
                value={user.employee.department?.id || ''}
                onChange={(e) => setUser(prev => ({
                  ...prev,
                  employee: { ...prev.employee, department: { id: e.target.value } }
                }))}
              >
                <option value="">Select Department</option>
                {/* Note: In a real implementation, you'd fetch departments from API */}
                <option value="1">Engineering</option>
                <option value="2">Human Resources</option>
                <option value="3">Sales</option>
                <option value="4">Marketing</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <input
                type="text"
                className="form-input disabled"
                value={user.employee.is_active ? 'Active' : 'Inactive'}
                disabled
              />
            </div>
          </div>

          <div className="card-actions">
            <button
              className="btn btn-secondary"
              onClick={handleEmployeeSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner small"></span> Saving...
                </>
              ) : (
                'Save Employee Info'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Combined Actions Card */}
      <div className="settings-card actions-card">
        <div className="card-header">
          <h2>Quick Actions</h2>
        </div>

        <div className="actions-grid">
          <div className="action-item">
            <h3>Save All Changes</h3>
            <p>Save both user and employee information at once</p>
            <button
              className="btn btn-primary"
              onClick={handleCombinedSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner small"></span> Saving All...
                </>
              ) : (
                'Save All Changes'
              )}
            </button>
          </div>

          <div className="action-item">
            <h3>Security</h3>
            <p>Manage your password and security settings</p>
            <button
              className="btn btn-outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? 'Hide Password Form' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      {showPasswordForm && (
        <div className="settings-card password-card">
          <div className="card-header">
            <h2>Change Password</h2>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {passwordError && (
            <div className="alert alert-error">
              <span className="alert-icon">✗</span>
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="alert alert-success">
              <span className="alert-icon">✓</span>
              {passwordSuccess}
            </div>
          )}

          <div className="card-actions">
            <button className="btn btn-primary" onClick={handlePasswordChange}>
              Update Password
            </button>
          </div>
        </div>
      )}

      {/* Permissions Card */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Account Permissions</h2>
        </div>
        <div className="permissions-list">
          <div className="permission-item">
            <span className="permission-label">Current Role</span>
            <span className="permission-value badge">{role}</span>
          </div>
          <div className="permission-item">
            <span className="permission-label">Access Level</span>
            <span className="permission-value">
              {role === 'Admin' ? 'Full administrative access' :
               role === 'HR' ? 'Human Resources & employee management' :
               role === 'Manager' ? 'Team management & reporting' :
               'Standard employee access'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;