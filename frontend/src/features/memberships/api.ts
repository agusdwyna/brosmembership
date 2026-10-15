import { api } from '@/lib/api';

export const membershipsApi = {
  changeType: (id: string, input: { membershipTypeId: string }) =>
    api.post(`/memberships/${id}/change-type`, input),

  renew: (id: string, input: { startDate: string }) => api.post(`/memberships/${id}/renew`, input),

  suspend: (id: string) => api.post(`/memberships/${id}/suspend`),

  cancel: (id: string) => api.post(`/memberships/${id}/cancel`),
};
