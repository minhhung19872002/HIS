import axios from 'axios';
import { API_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login for actual auth failures (login/refresh endpoints)
      // Don't redirect for data API 401s that may just be permission issues
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/') || url.includes('/login');
      // /inspector-portal là cổng standalone (login riêng của giám định viên BHXH);
      // không redirect về /login chính kể cả khi call nền (notification poll) bị 401.
      const onInspectorPortal = window.location.pathname.startsWith('/inspector-portal');
      if ((isAuthEndpoint || !localStorage.getItem('token')) && !onInspectorPortal) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
