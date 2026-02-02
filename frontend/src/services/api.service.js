// src/services/api.service.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Token management
let accessToken = localStorage.getItem('accessToken') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;
let isRefreshing = false;
let refreshPromise = null;

/**
 * Set authentication tokens
 */
function setTokens({ access, refresh }) {
  accessToken = access ?? null;
  refreshToken = refresh ?? refreshToken; // Keep existing refresh if not provided

  access ? localStorage.setItem('accessToken', access) : localStorage.removeItem('accessToken');
  if (refresh !== undefined) {
    refresh ? localStorage.setItem('refreshToken', refresh) : localStorage.removeItem('refreshToken');
  }
}

/**
 * Get authorization header
 */
const authHeader = () => accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

/**
 * Normalize API path
 */
const normalizePath = (path) => {
  if (/^https?:\/\//i.test(path)) throw new Error('Invalid API path');
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Parse error response
 * Returns an error object that mimics axios error structure for compatibility
 */
async function parseErrorResponse(response) {
  let errorMessage = `Request failed with status ${response.status}`;
  let errorData = null;

  try {
    errorData = await response.clone().json();
    if (errorData?.detail) {
      errorMessage = errorData.detail;
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (errorData?.error) {
      errorMessage = errorData.error;
    } else if (typeof errorData === 'object' && errorData !== null) {
      const fieldErrors = Object.entries(errorData)
        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('; ');
      if (fieldErrors) errorMessage = fieldErrors;
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text?.trim()) errorMessage = text;
    } catch {}
  }

  const error = new Error(errorMessage);
  // Direct properties for simple access
  error.status = response.status;
  error.data = errorData;
  // Mimic axios-like response structure for compatibility with existing error handlers
  error.response = {
    status: response.status,
    data: errorData,
    statusText: response.statusText,
  };
  return error;
}

/**
 * Refresh the access token
 */
async function refreshAccessToken() {
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        setTokens({ access: null, refresh: null });
        return false;
      }

      const data = await response.json();
      if (data?.access) {
        setTokens({ access: data.access });
        return true;
      }
      return false;
    } catch {
      setTokens({ access: null, refresh: null });
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Check if request should attempt token refresh
 */
const shouldRefresh = (path) => 
  refreshToken && !path.includes('/auth/refresh/') && !path.includes('/auth/login/');

/**
 * Handle 401 response with token refresh
 */
async function handleUnauthorized(url, config, path) {
  if (!shouldRefresh(path)) return null;
  
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    setTokens({ access: null, refresh: null });
    return null;
  }
  
  return fetch(url, {
    ...config,
    headers: { ...config.headers, ...authHeader() },
  });
}

/**
 * Parse response body
 */
async function parseResponse(response) {
  if (response.status === 204 || response.status === 205) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Make JSON API request
 */
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${normalizePath(path)}`;
  
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

  // Handle 401 with token refresh
  if (response.status === 401) {
    const retryResponse = await handleUnauthorized(url, config, path);
    if (retryResponse) response = retryResponse;
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return parseResponse(response);
}

/**
 * Make multipart form request
 */
async function requestForm(path, formData, options = {}) {
  const url = `${API_BASE_URL}${normalizePath(path)}`;
  
  const config = {
    method: 'POST',
    credentials: 'include',
    headers: authHeader(),
    body: formData,
    ...options,
  };

  let response = await fetch(url, config);

  // Handle 401 with token refresh
  if (response.status === 401) {
    const retryResponse = await handleUnauthorized(url, config, path);
    if (retryResponse) response = retryResponse;
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return parseResponse(response);
}

export const api = {
  // ============ BASIC HTTP METHODS ============
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  
  post: (path, body, options) =>
    request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  
  put: (path, body, options) =>
    request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  
  patch: (path, body, options) =>
    request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),

  // ============ MULTIPART FORM DATA ============
  postForm: (path, formData, options) => requestForm(path, formData, options),

  // ============ AUTH METHODS ============
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
    window.location.href = '/login'; // Redirect to login page
  },

  isAuthenticated: () => Boolean(accessToken),

  getTokens: () => ({ accessToken, refreshToken }),

  // ============ USER METHODS ============
  getCurrentUser: () => request('/accounts/users/me/', { method: 'GET' }),

  updateCurrentUser: (userData) => request('/accounts/users/me/', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),

  updateUser: (userId, userData) => request(`/accounts/users/${userId}/`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),

  changePassword: (currentPassword, newPassword, passwordConfirmation) => request('/accounts/users/change_password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      password_confirmation: passwordConfirmation
    }),
  }),

  getMyEmployee: async () => {
    try {
      // Backend may return:
      // - only the current user's employee (then list.length === 1)
      // - all employees (then we must filter by current user id)
      const [user, res] = await Promise.all([
        request('/accounts/users/me/', { method: 'GET' }).catch(() => null),
        request('/employees/employees/', { method: 'GET' }).catch(() => null),
      ]);

      const list = Array.isArray(res) ? res : res?.results || [];
      if (list.length === 0) return null;
      if (list.length === 1) return list[0] || null;

      const userId = user?.id ?? user?.user?.id ?? null;
      if (!userId) return null;

      const match = list.find((emp) => {
        const empUserId = emp?.user?.id ?? emp?.user;
        return empUserId !== undefined && String(empUserId) === String(userId);
      });

      return match || null;
    } catch {
      return null;
    }
  },

  getUserRole: (userData) => {
    if (!userData) return 'Employee';
    
    const rawRoles = userData?.roles || userData?.user?.roles || [];
    const roleNames = rawRoles
      .map((r) => typeof r === 'string' ? r : r?.name)
      .filter(Boolean)
      .map((r) => r?.toUpperCase?.() || '')
      .filter(Boolean);
    
    if (roleNames.length > 0) {
      if (roleNames.includes('ADMIN')) return 'Admin';
      if (roleNames.includes('HR')) return 'HR';
      if (roleNames.includes('MANAGER')) return 'Manager';
      if (roleNames.includes('EMPLOYEE')) return 'Employee';
    }
    
    const role = String(userData?.role || '').trim();
    if (['Admin', 'HR', 'Manager', 'Employee'].includes(role)) return role;
    
    return 'Employee';
  },

  getUserDisplayName: (userData) => {
    if (!userData) return 'User';
    
    const name = userData?.full_name ||
                 userData?.name ||
                 (userData?.first_name && userData?.last_name
                   ? `${userData.first_name} ${userData.last_name}`.trim()
                   : '') ||
                 (userData?.email ? userData.email.split('@')[0] : '');
    
    return name || 'User';
  },

  // ============ ATTENDANCE METHODS ============
  getAttendance: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters?.date) params.append('date', filters.date);
    if (filters?.from && filters?.to) {
      // Backend expects single date, so we'll get all and filter locally
    }
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.shift_id) params.append('shift_id', filters.shift_id);
    
    const query = params.toString();
    return await request(`/attendance/attendance/${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getMyAttendance: async (from, to) => {
    const params = new URLSearchParams();
    if (from) params.append('date__gte', from);
    if (to) params.append('date__lte', to);
    params.append('mine', 'true');
    
    const query = params.toString();
    return await request(`/attendance/attendance/${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  checkInAttendance: async (imageFile, blinkCount = 0) => {
    const form = new FormData();
    form.append('image', imageFile);
    if (blinkCount > 0) {
      form.append('blink_count', blinkCount);
    }
    return await requestForm('/attendance/attendance-check-in/', form);
  },

  // ============ BIOMETRICS METHODS ============
  getAllProfiles: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters?.department_id) params.append('department_id', filters.department_id);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    
    const query = params.toString();
    return await request(`/biometrics/profiles/${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  enrollFace: async (data, blinkCount = 0) => {
    if (data instanceof FormData) {
      if (blinkCount > 0) {
        data.append('blink_count', blinkCount);
      }
      return await requestForm('/biometrics/face/enroll/', data);
    }
    const payload = typeof data === 'object' ? { ...data, blink_count: blinkCount } : { data, blink_count: blinkCount };
    return await request('/biometrics/face/enroll/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProfileStatus: async (id, isActive) => {
    return await request(`/biometrics/profiles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  // NOTE: deleteProfile removed - API only supports GET/PATCH on profiles
  // Use updateProfileStatus(id, false) to deactivate instead

  // ============ ATTENDANCE SESSIONS METHODS ============
  createAttendanceSession: async (shiftId) => {
    return await request('/attendance/attendance-sessions/', {
      method: 'POST',
      body: JSON.stringify({ shift_id: shiftId }),
    });
  },

  closeAttendanceSession: async (sessionId) => {
    return await request(`/attendance/attendance-sessions/${sessionId}/`, { method: 'DELETE' });
  },

  listAttendanceSessions: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) {
      params.append('active', String(filters.active));
    }
    if (filters?.shift_id) params.append('shift_id', filters.shift_id);
    
    const query = params.toString();
    return await request(`/attendance/attendance-manage-sessions/${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getAttendanceSession: async (sessionId) => {
    return await request(`/attendance/attendance-manage-sessions/${sessionId}/`, { method: 'GET' });
  },

  updateAttendanceSession: async (sessionId, data) => {
    return await request(`/attendance/attendance-manage-sessions/${sessionId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ============ SHIFTS METHODS ============
  getAllShifts: async () => {
    return await request('/attendance/shifts/', { method: 'GET' });
  },

  getShift: async (shiftId) => {
    return await request(`/attendance/shifts/${shiftId}/`, { method: 'GET' });
  },

  createShift: async (shiftData) => {
    return await request('/attendance/shifts/', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
  },

  updateShift: async (shiftId, shiftData) => {
    return await request(`/attendance/shifts/${shiftId}/`, {
      method: 'PATCH',
      body: JSON.stringify(shiftData),
    });
  },

  deleteShift: async (shiftId) => {
    return await request(`/attendance/shifts/${shiftId}/`, { method: 'DELETE' });
  },

  // ============ EMPLOYEE SHIFTS METHODS ============
  listEmployeeShifts: async (employeeId = null) => {
    const params = new URLSearchParams();
    if (employeeId) params.append('employee', employeeId);
    
    const query = params.toString();
    return await request(`/attendance/employee-shifts/${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  assignEmployeeShift: async (employeeId, shiftId) => {
    return await request('/attendance/employee-shifts/', {
      method: 'POST',
      body: JSON.stringify({ employee: employeeId, shift: shiftId }),
    });
  },

  removeEmployeeShift: async (assignmentId) => {
    return await request(`/attendance/employee-shifts/${assignmentId}/`, { method: 'DELETE' });
  },

  // ============ EMPLOYEES METHODS ============
  getAllEmployees: async () => {
    return await request('/employees/employees/', { method: 'GET' });
  },

  getEmployee: async (employeeId) => {
    return await request(`/employees/employees/${employeeId}/`, { method: 'GET' });
  },

  // ============ DEPARTMENTS/COMPANIES METHODS ============
  getAllDepartments: async () => {
    return await request('/employees/departments/', { method: 'GET' });
  },

  getDepartment: async (departmentId) => {
    return await request(`/employees/departments/${departmentId}/`, { method: 'GET' });
  },

  createDepartment: async (departmentData) => {
    return await request('/employees/departments/', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  },

  updateDepartment: async (departmentId, departmentData) => {
    return await request(`/employees/departments/${departmentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(departmentData),
    });
  },

  deleteDepartment: async (departmentId) => {
    return await request(`/employees/departments/${departmentId}/`, { method: 'DELETE' });
  },

  // NOTE: Leaves and Reports endpoints removed - not available in current API
  // If these features are added later, uncomment and update:
  // getMyLeaves, getAllLeaves, createLeave, updateLeaveStatus
  // getAttendanceReport

  // ============ HELPER METHODS ============
  extractArray: (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  },

  safeGet: (obj, path, defaultValue = null) => {
    if (!obj) return defaultValue;
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) return defaultValue;
      result = result[key];
    }
    
    return result === undefined ? defaultValue : result;
  },

  // ============ FILE DOWNLOAD ============
  downloadFile: async (path, filename = 'download') => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${API_BASE_URL}${normalizedPath}`;
    
    const response = await fetch(url, {
      headers: authHeader(),
    });
    
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // ============ UTILITY METHODS ============
  /**
   * Extract array from API response (handles both direct arrays and paginated responses)
   */
  extractArray: (response) => {
    return Array.isArray(response) ? response : response?.results || [];
  }
};