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
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

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
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

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
};