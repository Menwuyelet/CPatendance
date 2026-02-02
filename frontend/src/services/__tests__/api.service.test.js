// API Service tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getUserRole', () => {
    it('should return Admin for ADMIN role', async () => {
      const { api } = await import('../api.service.js');
      const userData = { roles: [{ name: 'ADMIN' }] };
      expect(api.getUserRole(userData)).toBe('Admin');
    });

    it('should return HR for HR role', async () => {
      const { api } = await import('../api.service.js');
      const userData = { roles: [{ name: 'HR' }] };
      expect(api.getUserRole(userData)).toBe('HR');
    });

    it('should return Manager for MANAGER role', async () => {
      const { api } = await import('../api.service.js');
      const userData = { roles: [{ name: 'MANAGER' }] };
      expect(api.getUserRole(userData)).toBe('Manager');
    });

    it('should return Employee for EMPLOYEE role', async () => {
      const { api } = await import('../api.service.js');
      const userData = { roles: [{ name: 'EMPLOYEE' }] };
      expect(api.getUserRole(userData)).toBe('Employee');
    });

    it('should return Employee for null userData', async () => {
      const { api } = await import('../api.service.js');
      expect(api.getUserRole(null)).toBe('Employee');
    });

    it('should handle string roles', async () => {
      const { api } = await import('../api.service.js');
      const userData = { roles: ['ADMIN'] };
      expect(api.getUserRole(userData)).toBe('Admin');
    });

    it('should prioritize Admin role over others', async () => {
      const { api } = await import('../api.service.js');
      const userData = { roles: [{ name: 'EMPLOYEE' }, { name: 'ADMIN' }] };
      expect(api.getUserRole(userData)).toBe('Admin');
    });

    it('should fallback to role string if no matching roles', async () => {
      const { api } = await import('../api.service.js');
      const userData = { role: 'Admin' };
      expect(api.getUserRole(userData)).toBe('Admin');
    });
  });

  describe('getUserDisplayName', () => {
    it('should return full_name if available', async () => {
      const { api } = await import('../api.service.js');
      const userData = { full_name: 'John Doe' };
      expect(api.getUserDisplayName(userData)).toBe('John Doe');
    });

    it('should extract name from email if no full_name', async () => {
      const { api } = await import('../api.service.js');
      const userData = { email: 'john.doe@company.com' };
      expect(api.getUserDisplayName(userData)).toBe('john.doe');
    });

    it('should return User for null userData', async () => {
      const { api } = await import('../api.service.js');
      expect(api.getUserDisplayName(null)).toBe('User');
    });

    it('should handle first_name and last_name', async () => {
      const { api } = await import('../api.service.js');
      const userData = { first_name: 'John', last_name: 'Doe' };
      expect(api.getUserDisplayName(userData)).toBe('John Doe');
    });

    it('should prioritize full_name over email', async () => {
      const { api } = await import('../api.service.js');
      const userData = { full_name: 'John Doe', email: 'john.doe@company.com' };
      expect(api.getUserDisplayName(userData)).toBe('John Doe');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', async () => {
      localStorage.setItem('accessToken', 'test-token');
      const { api } = await import('../api.service.js');
      expect(api.isAuthenticated()).toBe(true);
    });

    it('should return false when no access token', async () => {
      localStorage.removeItem('accessToken');
      const { api } = await import('../api.service.js');
      expect(api.isAuthenticated()).toBe(false);
    });
  });

  describe('extractArray', () => {
    it('should extract array from response', async () => {
      const { api } = await import('../api.service.js');
      const response = [1, 2, 3];
      const result = api.extractArray(response);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should extract results from paginated response', async () => {
      const { api } = await import('../api.service.js');
      const response = { results: [1, 2, 3] };
      const result = api.extractArray(response);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return empty array for null', async () => {
      const { api } = await import('../api.service.js');
      const response = null;
      const result = api.extractArray(response);
      expect(result).toEqual([]);
    });
  });
});

describe('Token Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should set tokens correctly', async () => {
    const { setTokens } = await import('../api.service.js');
    
    setTokens({ access: 'test-access', refresh: 'test-refresh' });
    
    expect(localStorage.getItem('accessToken')).toBe('test-access');
    expect(localStorage.getItem('refreshToken')).toBe('test-refresh');
  });

  it('should clear tokens on logout', async () => {
    const { setTokens, logout } = await import('../api.service.js');
    
    setTokens({ access: 'test-access', refresh: 'test-refresh' });
    logout();
    
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockReset();
  });

  it('should handle 401 response', async () => {
    const mockResponse = new Response(null, { status: 401, statusText: 'Unauthorized' });
    fetch.mockResolvedValueOnce(mockResponse);

    const { api } = await import('../api.service.js');
    
    await expect(api.get('/test')).rejects.toThrow();
  });

  it('should handle 403 response', async () => {
    const mockResponse = new Response(JSON.stringify({ detail: 'Forbidden' }), { 
      status: 403, 
      statusText: 'Forbidden' 
    });
    fetch.mockResolvedValueOnce(mockResponse);

    const { api } = await import('../api.service.js');
    
    try {
      await api.get('/test');
    } catch (error) {
      expect(error.message).toContain('Forbidden');
    }
  });

  it('should handle 404 response', async () => {
    const mockResponse = new Response(JSON.stringify({ detail: 'Not Found' }), { 
      status: 404, 
      statusText: 'Not Found' 
    });
    fetch.mockResolvedValueOnce(mockResponse);

    const { api } = await import('../api.service.js');
    
    try {
      await api.get('/test');
    } catch (error) {
      expect(error.message).toContain('Not Found');
    }
  });
});
