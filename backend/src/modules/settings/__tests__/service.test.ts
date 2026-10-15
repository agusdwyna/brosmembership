import { describe, it, expect, vi, beforeEach } from 'vitest';

const txUpsert = vi.fn();

vi.mock('../../../config/database', () => ({
  prisma: {
    setting: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));

vi.mock('../../activity-log/service', () => ({
  activityLogService: { log: vi.fn() },
}));

import { prisma } from '../../../config/database';
import { activityLogService } from '../../activity-log/service';
import { settingsService as service } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
  txUpsert.mockReset();
  (prisma.setting.upsert as any).mockImplementation(txUpsert);
  txUpsert.mockResolvedValue({});
});

describe('SettingsService.getAll', () => {
  it('merges stored rows over defaults', async () => {
    (prisma.setting.findMany as any).mockResolvedValue([{ key: 'brandName', value: 'RSIA' }]);

    const all = await service.getAll();

    expect(all.brandName).toBe('RSIA');
    // Untouched keys fall back to defaults.
    expect(all.expiringSoonDays).toBe('30');
  });
});

describe('SettingsService.getNumber', () => {
  it('parses a stored numeric string', async () => {
    (prisma.setting.findUnique as any).mockResolvedValue({ key: 'expiringSoonDays', value: '45' });
    expect(await service.getNumber('expiringSoonDays', 30)).toBe(45);
  });

  it('falls back when the stored value is not a number', async () => {
    (prisma.setting.findUnique as any).mockResolvedValue({ key: 'expiringSoonDays', value: 'abc' });
    expect(await service.getNumber('expiringSoonDays', 30)).toBe(30);
  });
});

describe('SettingsService.update', () => {
  it('upserts changed keys and writes one audit entry', async () => {
    (prisma.setting.findMany as any).mockResolvedValue([]);

    await service.update({ brandName: 'RSIA Bali Royal' }, 'admin1');

    expect(prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'brandName' },
        update: { value: 'RSIA Bali Royal' },
      }),
    );
    expect(activityLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE_SETTINGS', performedBy: 'admin1' }),
    );
  });

  it('writes no audit entry when the value is unchanged', async () => {
    (prisma.setting.findMany as any).mockResolvedValue([
      { key: 'brandName', value: 'Bros Membership' },
    ]);

    await service.update({ brandName: 'Bros Membership' }, 'admin1');

    expect(activityLogService.log).not.toHaveBeenCalled();
  });
});
