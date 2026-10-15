import { prisma } from '../../config/database';
import { activityLogService } from '../activity-log/service';
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  type SettingKey,
  type UpdateSettingsInput,
} from './schema';

export type SettingsMap = Record<SettingKey, string>;

class SettingsService {
  /** All settings, merged over defaults so every known key is always present. */
  async getAll(): Promise<SettingsMap> {
    const rows = await prisma.setting.findMany();
    const map = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (SETTING_KEYS.includes(row.key as SettingKey)) {
        map[row.key as SettingKey] = row.value;
      }
    }
    return map;
  }

  private async get(key: SettingKey): Promise<string> {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value ?? DEFAULT_SETTINGS[key];
  }

  async getNumber(key: SettingKey, fallback: number): Promise<number> {
    const parsed = Number(await this.get(key));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async getString(key: SettingKey): Promise<string> {
    return this.get(key);
  }

  /** Upsert each provided key. Returns the full, updated settings map. */
  async update(input: UpdateSettingsInput, performedBy: string): Promise<SettingsMap> {
    const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [
      SettingKey,
      string | number,
    ][];

    if (entries.length === 0) return this.getAll();

    const before = await this.getAll();

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        }),
      ),
    );

    const changed = entries
      .filter(([key, value]) => before[key] !== String(value))
      .map(([key]) => key);

    if (changed.length > 0) {
      await activityLogService.log({
        action: 'UPDATE_SETTINGS',
        description: `Pengaturan diubah: ${changed.join(', ')}`,
        performedBy,
      });
    }

    return this.getAll();
  }
}

export const settingsService = new SettingsService();
