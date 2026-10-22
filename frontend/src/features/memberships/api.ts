import { api } from '@/lib/api';

export const membershipsApi = {
  changeType: (id: string, input: { membershipTypeId: string }) =>
    api.post(`/memberships/${id}/change-type`, input),

  renew: (id: string, input: { startDate: string }) => api.post(`/memberships/${id}/renew`, input),

  /**
   * Edit the period in place. `endDate` omitted means "start + type duration",
   * the same rule used at registration.
   */
  updateDates: (id: string, input: { startDate: string; endDate?: string }) =>
    api.patch(`/memberships/${id}/dates`, input),

  suspend: (id: string) => api.post(`/memberships/${id}/suspend`),

  cancel: (id: string) => api.post(`/memberships/${id}/cancel`),
};
