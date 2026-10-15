import { api } from '@/lib/api';
import type { LoginResponse, User } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ data: LoginResponse }>('/auth/login', { email, password }),

  me: () => api.get<{ data: User }>('/auth/me'),

  updateMe: (input: { name?: string; email?: string }) =>
    api.patch<{ data: User }>('/auth/me', input),
};
