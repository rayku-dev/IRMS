import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  const csrfToken = sessionStorage.getItem('csrfToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops if refresh fails, or if login fails
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const res = await api.post('/auth/refresh');
        if (res.data.accessToken) {
          sessionStorage.setItem('token', res.data.accessToken);
          if (res.data.csrfToken) {
            sessionStorage.setItem('csrfToken', res.data.csrfToken);
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('csrfToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
