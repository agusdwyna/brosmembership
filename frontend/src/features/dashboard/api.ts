import { api } from '@/lib/api';
import type { DashboardSummary } from './types';

export const dashboardApi = {
  getSummary: () => api.get<{ data: DashboardSummary }>('/dashboard'),
};
