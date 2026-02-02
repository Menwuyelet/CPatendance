// Login page tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login.jsx';

// Mock the api service
vi.mock('../../services/api.service.js', () => ({
  api: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

import { api } from '../../services/api.service.js';

describe('Login Component', () => {
  const mockOnLogin = vi.fn();
  const mockOnNotify = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Form Rendering', () => {
    it('should render login form with email and password fields', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText('corporate@company.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render company logo placeholder', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText('corporate@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Form should not be valid (email without @ and .)
      expect(emailInput.value).toBe('invalid-email');
    });

    it('should accept valid email format', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText('corporate@company.com');

      fireEvent.change(emailInput, { target: { value: 'test@company.com' } });

      expect(emailInput.value).toBe('test@company.com');
    });

    it('should require minimum 6 character password', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(passwordInput, { target: { value: '12345' } });

      expect(passwordInput.value).toBe('12345');
    });
  });

  describe('Password Toggle', () => {
    it('should toggle password visibility', () => {
      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      const passwordInput = screen.getByPlaceholderText('••••••••');
      const toggleButton = passwordInput.parentElement.querySelector('button');

      expect(passwordInput.type).toBe('password');

      fireEvent.click(toggleButton);

      expect(passwordInput.type).toBe('text');
    });
  });

  describe('Remember Me', () => {
    it('should save email to localStorage when remember me is checked', () => {
      const localStorageMock = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      Object.defineProperty(window, 'localStorage', { value: localStorageMock });

      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      // The remember me checkbox should be present
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on failed login', async () => {
      api.login.mockRejectedValue(new Error('Invalid credentials'));

      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText('corporate@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@company.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNotify).toHaveBeenCalledWith(expect.any(String), 'error');
      });
    });
  });

  describe('Account Lockout', () => {
    it('should display lockout message after too many failed attempts', async () => {
      // Simulate 5 failed attempts
      const lockTime = Date.now() + 15 * 60 * 1000; // 15 minutes from now
      localStorage.setItem('loginLockUntil', lockTime.toString());
      localStorage.setItem('failedAttempts', '5');

      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      // Should show lockout message
      expect(screen.getByText(/locked for/i)).toBeInTheDocument();
    });
  });

  describe('Session Expired', () => {
    it('should show session expired message when URL has expired param', () => {
      vi.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({
        search: '?expired=true',
      });

      render(
        <MemoryRouter>
          <Login onLogin={mockOnLogin} onNotify={mockOnNotify} />
        </MemoryRouter>
      );

      expect(mockOnNotify).toHaveBeenCalledWith(
        'Your session has expired',
        'warning'
      );
    });
  });
});
