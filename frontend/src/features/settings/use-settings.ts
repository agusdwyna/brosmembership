import { useEffect, useState } from 'react';
import { settingsApi } from './api';
import { useSettingsStore } from '@/stores/settings-store';
import { getErrorMessage } from '@/lib/error';
import { toast } from '@/components/ui/toast-store';
import type { UpdateSettingsInput } from './types';

/** Load settings once (shared store) and return them. */
export function useSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const loaded = useSettingsStore((s) => s.loaded);
  const load = useSettingsStore((s) => s.load);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return { settings, loaded };
}

/** Save a settings slice, sync the global store, and surface toasts. */
export function useSaveSettings() {
  const [saving, setSaving] = useState(false);

  const save = async (input: UpdateSettingsInput): Promise<boolean> => {
    setSaving(true);
    try {
      const { data } = await settingsApi.update(input);
      useSettingsStore.getState().set(data.data);
      toast.success('Pengaturan disimpan');
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan pengaturan'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}
