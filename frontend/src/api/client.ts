import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinestar_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('cinestar_refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const newToken = response.data.token;
          localStorage.setItem('cinestar_token', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        } catch (refreshError) {
          localStorage.removeItem('cinestar_token');
          localStorage.removeItem('cinestar_refresh_token');
          localStorage.removeItem('cinestar_user');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('cinestar_token');
        localStorage.removeItem('cinestar_refresh_token');
        localStorage.removeItem('cinestar_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
