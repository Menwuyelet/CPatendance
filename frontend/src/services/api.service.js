// src/services/api.service.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let accessToken = localStorage.getItem('accessToken') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

function setTokens({ access, refresh }) {
  accessToken = access || null;
  refreshToken = refresh || null;

  if (access) {
    localStorage.setItem('accessToken', access);
  } else {
    localStorage.removeItem('accessToken');
  }

  if (refresh) {
    localStorage.setItem('refreshToken', refresh);
  } else {
    localStorage.removeItem('refreshToken');
  }
}

function authHeader() {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function refreshAccessToken() {
  // If already refreshing, wait for the existing promise
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed → likely invalid/expired refresh token
        setTokens({ access: null, refresh: null });
        return false;
      }

      const data = await response.json();
      if (data?.access) {
        setTokens({ access: data.access }); // Keep existing refresh token
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      setTokens({ access: null, refresh: null });
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request(path, options = {}) {
  if (/^https?:\/\//i.test(path)) {
    throw new Error('Invalid API path');
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {}),
    },
    ...options,
  };

  let response = await fetch(url, config);

  // Handle 401 with token refresh (but avoid loops)
  if (
    response.status === 401 &&
    refreshToken &&
    !path.includes('/auth/refresh/') &&
    !path.includes('/auth/login/')
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry with new access token
      response = await fetch(url, {
        ...config,
        headers: {
          ...config.headers,
          ...authHeader(), // Updated Authorization header
        },
      });
    } else {
      // Refresh failed → force logout
      setTokens({ access: null, refresh: null });
    }
  }

  // Handle error responses
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorData = null;

    try {
      errorData = await response.clone().json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'object' && errorData !== null) {
        const fieldErrors = Object.entries(errorData)
          .map(([field, errors]) =>
            `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
          )
          .join('; ');
        if (fieldErrors) errorMessage = fieldErrors;
      }
    } catch (e) {
      // Fallback to text if JSON fails
      try {
        const text = await response.clone().text();
        if (text.trim()) errorMessage = text;
      } catch (_) {}
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  // No content
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  // Parse JSON
  try {
    return await response.json();
  } catch (e) {
    return null; // In case of empty/invalid JSON
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options) =>
    request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body, options) =>
    request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),

  // For multipart/form-data (e.g. file uploads)
  postForm: async (path, formData, options = {}) => {
    if (/^https?:\/\//i.test(path)) {
      throw new Error('Invalid API path');
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${API_BASE_URL}${normalizedPath}`;

    const config = {
      method: 'POST',
      credentials: 'include',
      headers: {
        // Let browser set Content-Type with boundary
        ...authHeader(),
        ...(options.headers || {}),
      },
      body: formData,
      ...options,
    };

    let response = await fetch(url, config);

    if (
      response.status === 401 &&
      refreshToken &&
      !path.includes('/auth/refresh/')
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(url, {
          ...config,
          headers: {
            ...config.headers,
            ...authHeader(),
          },
        });
      }
    }

    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const errorData = await response.clone().json();
        if (errorData.detail) errorMessage = errorData.detail;
        else if (typeof errorData === 'object') {
          const fieldErrors = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('; ');
          if (fieldErrors) errorMessage = fieldErrors;
        }
      } catch (_) {
        const text = await response.clone().text();
        if (text) errorMessage = text;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  },

  // --- Auth Methods ---
  login: async (email, password) => {
    const data = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data?.access && data?.refresh) {
      setTokens({ access: data.access, refresh: data.refresh });
    }

    return data;
  },

  logout: () => {
    setTokens({ access: null, refresh: null });
  },

  isAuthenticated: () => Boolean(accessToken),

  // Optional: expose current tokens (for debugging or custom use)
  getTokens: () => ({ accessToken, refreshToken }),

  getCurrentUser: async () => {
    return await request('/accounts/users/me/', { method: 'GET' });
  },

  /**
   * Determine user role from user data
   * @param {Object} userData 
   * @returns {string} Role name (Admin, HR, Manager, Employee)
   */
  getUserRole: (userData) => {
    console.log('User data from backend:', JSON.stringify(userData, null, 2));
    const rawRoles = userData.roles || userData.user?.roles || [];
    
    const roleNames = rawRoles
      .map((r) => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object' && r.name) return r.name;
        return null;
      })
      .filter(Boolean)
      .map((r) => r.toUpperCase());
   
    console.log('Processed role names:', roleNames);
    
    if (roleNames.length > 0) {
      if (roleNames.includes('ADMIN')) return 'Admin';
      if (roleNames.includes('HR')) return 'HR';
      if (roleNames.includes('MANAGER')) return 'Manager';
      if (roleNames.includes('EMPLOYEE')) return 'Employee';
    }
    
    if (userData.role) {
      const role = String(userData.role).trim();
      if (['Admin', 'HR', 'Manager', 'Employee'].includes(role)) {
        return role;
      }
    }
    
    return 'Employee'; // Default
  },

  /**
   * Get display name from user data
   * @param {Object} userData 
   * @returns {string}
   */
  getUserDisplayName: (userData) => {
    return userData.full_name ||
           userData.name ||
           (userData.first_name && userData.last_name
             ? `${userData.first_name} ${userData.last_name}`
             : userData.email?.split('@')[0] || 'User');
  },

  // --- Biometrics Methods ---
  getAllProfiles: async () => {
    return await api.get('/biometrics/profiles/');
  },

  enrollFace: async (data) => {
    if (data instanceof FormData) {
      return await api.postForm('/biometrics/face/enroll/', data);
    }
    return await api.post('/biometrics/face/enroll/', data);
  },

  updateProfileStatus: async (id, isActive) => {
    return await api.patch(`/biometrics/profiles/${id}/`, {
      is_active: isActive,
    });
  },

  deleteProfile: async (id) => {
    return await api.delete(`/biometrics/profiles/${id}/`);
  },

  // --- Attendance Sessions Methods ---
  createAttendanceSession: async (shiftId) => {
    return await api.post('/attendance/attendance-sessions/', { shift_id: shiftId });
  },

  closeAttendanceSession: async (sessionId) => {
    return await api.delete(`/attendance/attendance-sessions/${sessionId}/`);
  },

  listAttendanceSessions: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.active !== undefined) params.append('active', filters.active);
    if (filters.shift_id) params.append('shift_id', filters.shift_id);
    const query = params.toString();
    return await api.get(`/attendance/attendance-manage-sessions${query ? `?${query}` : ''}`);
  },

  getAttendanceSession: async (sessionId) => {
    return await api.get(`/attendance/attendance-manage-sessions/${sessionId}/`);
  },

  updateAttendanceSession: async (sessionId, data) => {
    return await api.put(`/attendance/attendance-manage-sessions/${sessionId}/`, data);
  },

  // --- Employee Shifts Methods ---
  listEmployeeShifts: async (employeeId = null) => {
    const query = employeeId ? `?employee=${employeeId}` : '';
    return await api.get(`/attendance/employee-shifts${query}`);
  },

  assignEmployeeShift: async (employeeId, shiftId) => {
    return await api.post('/attendance/employee-shifts/', {
      employee: employeeId,
      shift: shiftId,
    });
  },

  removeEmployeeShift: async (assignmentId) => {
    return await api.delete(`/attendance/employee-shifts/${assignmentId}/`);
  },

  // --- Attendance Check-in Method ---
  checkInAttendance: async () => {
    return await api.post('/attendance/attendance-check-in/', {});
  },
};
