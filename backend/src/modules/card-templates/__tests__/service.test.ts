import { describe, it, expect, vi, beforeEach } from 'vitest';

const tx = {
  cardTemplateSide: { deleteMany: vi.fn() },
  cardTemplate: { update: vi.fn() },
};

vi.mock('../../../config/database', () => ({
  prisma: {
    cardTemplate: { findUnique: vi.fn(), update: vi.fn() },
    cardTemplateSide: { upsert: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../../../config/database';
import { cardTemplateService } from '../service';

const existing = { id: 'tpl1', name: 'Gold', version: 3, sides: [], status: 'ACTIVE' };

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.cardTemplate.findUnique as any).mockResolvedValue(existing);
  (prisma.$transaction as any).mockImplementation((fn: any) => fn(tx));
  (tx.cardTemplate.update as any).mockResolvedValue({ ...existing, version: 4 });
});

describe('CardTemplateService.update', () => {
  it('replaces sides and bumps the version atomically', async () => {
    await cardTemplateService.update('tpl1', {
      sides: [{ side: 'FRONT', elements: [] }],
    } as any);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.cardTemplateSide.deleteMany).toHaveBeenCalledWith({
      where: { cardTemplateId: 'tpl1' },
    });
    const data = (tx.cardTemplate.update as any).mock.calls[0][0].data;
    expect(data.version).toEqual({ increment: 1 });
  });

  it('does not bump the version on a rename', async () => {
    await cardTemplateService.update('tpl1', { name: 'Gold v2' } as any);

    const data = (tx.cardTemplate.update as any).mock.calls[0][0].data;
    expect(data.name).toBe('Gold v2');
    expect(data.version).toBeUndefined();
    expect(tx.cardTemplateSide.deleteMany).not.toHaveBeenCalled();
  });

  it('a failed write leaves no partially deleted layout (transaction, not two steps)', async () => {
    (tx.cardTemplate.update as any).mockRejectedValue(new Error('boom'));

    await expect(
      cardTemplateService.update('tpl1', { sides: [{ side: 'FRONT', elements: [] }] } as any),
    ).rejects.toThrow('boom');

    // The delete happened inside the transaction that then rolled back.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
