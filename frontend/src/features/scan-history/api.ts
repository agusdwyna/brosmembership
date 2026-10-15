import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type { ScanHistoryItem } from './types';

export const scanHistoryApi = {
  list: (params?: { dateFrom?: string; dateTo?: string; result?: string }) =>
    api.get<ListResponse<ScanHistoryItem>>('/scan-history', { params }),
};
