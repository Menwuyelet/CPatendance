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
  // Validate path
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
      if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
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
        if (text?.trim()) errorMessage = text;
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

// Multipart form request
async function requestForm(path, formData, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const config = {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...authHeader(),
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
      if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (typeof errorData === 'object') {
        const fieldErrors = Object.entries(errorData || {})
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
  getCurrentUser: async () => {
    try {
      return await request('/accounts/users/me/', { method: 'GET' });
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  },

  getMyEmployee: async () => {
    try {
      const res = await request('/employees/employees/', { method: 'GET' });
      const list = Array.isArray(res) ? res : res?.results || [];
      return list[0] || null;
    } catch (error) {
      console.error('Failed to get employee data:', error);
      return null;
    }
  },

  getUserRole: (userData) => {
    if (!userData) return 'Employee'; // Default fallback
    
    console.log('User data from backend:', JSON.stringify(userData, null, 2));
    const rawRoles = userData?.roles || userData?.user?.roles || [];
    
    const roleNames = rawRoles
      .map((r) => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object' && r.name) return r.name;
        return null;
      })
      .filter(Boolean)
      .map((r) => r?.toUpperCase?.() || '')
      .filter(r => r);
   
    console.log('Processed role names:', roleNames);
    
    if (roleNames.length > 0) {
      if (roleNames.includes('ADMIN')) return 'Admin';
      if (roleNames.includes('HR')) return 'HR';
      if (roleNames.includes('MANAGER')) return 'Manager';
      if (roleNames.includes('EMPLOYEE')) return 'Employee';
    }
    
    if (userData?.role) {
      const role = String(userData.role).trim();
      if (['Admin', 'HR', 'Manager', 'Employee'].includes(role)) {
        return role;
      }
    }
    
    return 'Employee'; // Default
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
    
    if (filters?.from) params.append('date__gte', filters.from);
    if (filters?.to) params.append('date__lte', filters.to);
    if (filters?.employee_id) params.append('employee', filters.employee_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.mine) params.append('mine', 'true');
    if (filters?.session_id) params.append('session_id', filters.session_id);
    if (filters?.department_id) params.append('department_id', filters.department_id);
    
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

  deleteProfile: async (id) => {
    return await request(`/biometrics/profiles/${id}/`, { method: 'DELETE' });
  },

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

  // ============ LEAVES METHODS ============
  getMyLeaves: async () => {
    return await request('/leaves/my-leaves/', { method: 'GET' });
  },

  getAllLeaves: async () => {
    return await request('/leaves/leaves/', { method: 'GET' });
  },

  createLeave: async (leaveData) => {
    return await request('/leaves/leaves/', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  },

  updateLeaveStatus: async (leaveId, status) => {
    return await request(`/leaves/leaves/${leaveId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // ============ REPORTS METHODS ============
  getAttendanceReport: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.department_id) queryParams.append('department_id', params.department_id);
    
    const query = queryParams.toString();
    return await request(`/reports/attendance/${query ? `?${query}` : ''}`, { method: 'GET' });
  },

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
  }
};