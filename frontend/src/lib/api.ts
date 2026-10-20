import axios from 'axios';
import { toast } from '@/components/ui/toast-store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && !error.config.url?.includes('/auth/login')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // A permission denial is a domain event, not a generic network failure —
    // surface it instead of leaving the caller with an opaque error.
    if (status === 403) {
      toast.error('Anda tidak punya akses untuk aksi ini.');
    }
    return Promise.reject(error);
  },
);

export { api };
