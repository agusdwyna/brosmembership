import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type { MembershipType, CreateMembershipTypeInput, UpdateMembershipTypeInput } from './types';

export const membershipTypesApi = {
  list: () => api.get<ListResponse<MembershipType>>('/membership-types'),
  getById: (id: string) => api.get<{ data: MembershipType }>(`/membership-types/${id}`),
  create: (input: CreateMembershipTypeInput) =>
    api.post<{ data: MembershipType }>('/membership-types', input),
  update: (id: string, input: UpdateMembershipTypeInput) =>
    api.put<{ data: MembershipType }>(`/membership-types/${id}`, input),
  deactivate: (id: string) => api.post(`/membership-types/${id}/deactivate`),
  activate: (id: string) => api.post(`/membership-types/${id}/activate`),
};
