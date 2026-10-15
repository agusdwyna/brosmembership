import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from './types';

export const companiesApi = {
  list: () => api.get<ListResponse<Company>>('/companies'),
  getById: (id: string) => api.get<{ data: Company }>(`/companies/${id}`),
  create: (input: CreateCompanyInput) => api.post<{ data: Company }>('/companies', input),
  update: (id: string, input: UpdateCompanyInput) =>
    api.put<{ data: Company }>(`/companies/${id}`, input),
  deactivate: (id: string) => api.post(`/companies/${id}/deactivate`),
  activate: (id: string) => api.post(`/companies/${id}/activate`),
};
