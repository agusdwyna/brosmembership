import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type { Member, CreateMemberInput, UpdateMemberInput } from './types';

export const membersApi = {
  list: (search?: string) => api.get<ListResponse<Member>>('/members', { params: { search } }),

  getById: (id: string) => api.get<{ data: Member }>(`/members/${id}`),

  create: (input: CreateMemberInput) => api.post<{ data: Member }>('/members', input),

  update: (id: string, input: UpdateMemberInput) =>
    api.put<{ data: Member }>(`/members/${id}`, input),

  deactivate: (id: string) => api.post<{ data: Member }>(`/members/${id}/deactivate`),

  activate: (id: string) => api.post<{ data: Member }>(`/members/${id}/activate`),
};
