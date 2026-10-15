import { create } from 'zustand';
import { settingsApi } from '@/features/settings/api';
import type { AppSettings } from '@/features/settings/types';

const FALLBACK: AppSettings = {
  brandName: 'Bros Membership',
  defaultScannerMethod: 'MANUAL',
  memberNumberPrefix: '',
  memberNumberReset: 'MONTHLY',
  cardNumberPrefix: 'CARD-',
  cardNumberReset: 'GLOBAL',
  expiringSoonDays: '30',
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  /** Apply locally after a successful PATCH so consumers update without refetch. */
  set: (settings: AppSettings) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: FALLBACK,
  loaded: false,

  load: async () => {
    try {
      const { data } = await settingsApi.get();
      const settings = data.data;
      set({ settings, loaded: true });
      document.title = settings.brandName;
    } catch {
      set({ loaded: true });
    }
  },

  set: (settings) => {
    set({ settings, loaded: true });
    document.title = settings.brandName;
  },

  reset: () => set({ settings: FALLBACK, loaded: false }),
}));
