import { api } from '@/lib/api';
import type { ActivityLogItem } from './types';

export const activityLogApi = {
  getByMemberId: (memberId: string) =>
    api.get<{ data: ActivityLogItem[] }>(`/activity-logs/member/${memberId}`),
};
