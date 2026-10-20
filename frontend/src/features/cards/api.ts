import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type { MembershipCard } from './types';

export const cardsApi = {
  list: (search?: string) =>
    api.get<ListResponse<MembershipCard>>('/cards', { params: { search } }),

  getById: (id: string) => api.get<{ data: MembershipCard }>(`/cards/${id}`),

  getHistoryByMembership: (membershipId: string) =>
    api.get<{ data: MembershipCard[] }>(`/cards/membership/${membershipId}/history`),
};
