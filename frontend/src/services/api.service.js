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
    const message = await safeReadText(response);
    throw new Error(message || `Request failed with status ${response.status}`);
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