import { api } from '@/lib/api';
import type { ScannerMethod, VerifyResponse } from './types';

export const scannerApi = {
  verify: (token: string, scannerMethod: ScannerMethod) =>
    api.post<{ data: VerifyResponse }>('/scanner/verify', { token, scannerMethod }),
};
