import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type { VisitItem } from './types';

export const visitsApi = {
  record: (input: { memberId: string; membershipId?: string | null; scanId?: string | null }) =>
    api.post<{ data: VisitItem }>('/visits', input),

  list: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<ListResponse<VisitItem>>('/visits', { params }),

  byMember: (memberId: string) => api.get<ListResponse<VisitItem>>(`/visits/member/${memberId}`),
};
