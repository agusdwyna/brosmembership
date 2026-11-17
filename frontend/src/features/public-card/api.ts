import { publicApi } from '@/lib/public-api';
import type { PublicCardResponse } from './types';

export const publicCardApi = {
  getByToken: (token: string) =>
    publicApi.get<{ data: PublicCardResponse }>(`/public/cards/${encodeURIComponent(token)}`),

  lookupByNik: (nik: string) =>
    publicApi.post<{ data: PublicCardResponse }>('/public/cards/lookup', { nik }),
};
