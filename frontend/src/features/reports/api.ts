import { api } from '@/lib/api';
import type { VerificationReport } from './types';

export const reportsApi = {
  getVerifications: (dateFrom: string, dateTo: string) =>
    api.get<{ data: VerificationReport }>('/reports/verifications', {
      params: { dateFrom, dateTo },
    }),
};
