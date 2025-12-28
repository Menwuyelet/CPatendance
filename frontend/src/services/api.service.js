// src/services/api.service.js
// Base URL for Django backend APIs.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let accessToken = localStorage.getItem('accessToken') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;

function setTokens({ access, refresh }) {
  accessToken = access || null;
  refreshToken = refresh || null;
  if (access) localStorage.setItem('accessToken', access);
  else localStorage.removeItem('accessToken');
  if (refresh) localStorage.setItem('refreshToken', refresh);
  else localStorage.removeItem('refreshToken');
}

function authHeader() {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
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

  // Attempt refresh on 401
  if (response.status === 401 && refreshToken && !path.includes('/auth/refresh/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryConfig = {
        ...config,
        headers: {
          ...config.headers,
          ...authHeader(),
        },
      };
      response = await fetch(url, retryConfig);
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      // Handle Django REST Framework error format
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'object') {
        // Handle field-specific errors
        const fieldErrors = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
        if (fieldErrors) {
          errorMessage = fieldErrors;
        }
      }
    } catch (e) {
      // If JSON parsing fails, try text
      const text = await safeReadText(response);
      if (text) errorMessage = text;
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = { status: response.status };
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// REMOVED THE CACHE — it prevented new users from showing up!
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  // Post a FormData (multipart/form-data). `form` must be a FormData instance.
  postForm: async (path, form) => {
    const url = `${API_BASE_URL}${path}`;
    const config = {
      method: 'POST',
      credentials: 'include',
      headers: {
        // Do NOT set Content-Type; browser will set the multipart boundary
        ...authHeader(),
      },
      body: form,
    };

    let response = await fetch(url, config);

    if (response.status === 401 && refreshToken && !path.includes('/auth/refresh/')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryConfig = {
          ...config,
          headers: {
            ...config.headers,
            ...authHeader(),
          },
        };
        response = await fetch(url, retryConfig);
      }
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) errorMessage = errorData.detail;
        else if (typeof errorData === 'object') {
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          if (fieldErrors) errorMessage = fieldErrors;
        }
      } catch (e) {
        const text = await safeReadText(response);
        if (text) errorMessage = text;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
  },
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  login: async (email, password) => {
    const data = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (data && data.access && data.refresh) {
      setTokens({ access: data.access, refresh: data.refresh });
    }
    return data;
  },
  logout: () => setTokens({ access: null, refresh: null }),
  isAuthenticated: () => Boolean(accessToken),
};

async function refreshAccessToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.access) {
      setTokens({ access: data.access, refresh: refreshToken });
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (e) {
    return '';
  }
}