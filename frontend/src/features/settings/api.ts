import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type {
  ActivityLogEntry,
  AppSettings,
  AppUser,
  CreateUserInput,
  Role,
  SystemInfo,
  UpdateSettingsInput,
  UpdateUserInput,
} from './types';

export const settingsApi = {
  get: () => api.get<{ data: AppSettings }>('/settings'),
  update: (input: UpdateSettingsInput) => api.patch<{ data: AppSettings }>('/settings', input),
  systemInfo: () => api.get<SystemInfo>('/health'),
};

export const usersApi = {
  list: (params?: { search?: string; role?: string; status?: string }) =>
    api.get<ListResponse<AppUser>>('/users', { params }),

  create: (input: CreateUserInput) => api.post<{ data: AppUser }>('/users', input),

  update: (id: string, input: UpdateUserInput) => api.put<{ data: AppUser }>(`/users/${id}`, input),

  activate: (id: string) => api.post<{ data: AppUser }>(`/users/${id}/activate`),

  deactivate: (id: string) => api.post<{ data: AppUser }>(`/users/${id}/deactivate`),

  resetPassword: (id: string, password: string) =>
    api.post<{ data: { id: string; email: string } }>(`/users/${id}/reset-password`, { password }),
};

export const activityLogApi = {
  list: (params?: { search?: string; action?: string }) =>
    api.get<ListResponse<ActivityLogEntry>>('/activity-logs', { params }),
};

export const rolesApi = {
  list: () => api.get<{ data: Role[] }>('/roles'),

  create: (input: { key: string; label: string; description?: string; permissions: string[] }) =>
    api.post<{ data: Role }>('/roles', input),

  update: (id: string, input: { label?: string; description?: string; permissions?: string[] }) =>
    api.put<{ data: Role }>(`/roles/${id}`, input),

  remove: (id: string) => api.delete<{ data: { id: string } }>(`/roles/${id}`),
};
