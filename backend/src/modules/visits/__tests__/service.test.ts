import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  prisma: {
    visit: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    member: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../../../config/database';
import { visitService as service } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VisitService.record', () => {
  it('is idempotent per scan (returns the existing visit)', async () => {
    const existing = { id: 'v1' };
    (prisma.visit.findUnique as any).mockResolvedValue(existing);

    const result = await service.record({ memberId: 'm1', scanId: 's1' }, 'officer1');

    expect(result).toBe(existing);
    expect(prisma.visit.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown member with 404', async () => {
    (prisma.visit.findUnique as any).mockResolvedValue(null);
    (prisma.member.findFirst as any).mockResolvedValue(null);

    await expect(service.record({ memberId: 'missing' }, 'officer1')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('creates a visit for a known member', async () => {
    (prisma.visit.findUnique as any).mockResolvedValue(null);
    (prisma.member.findFirst as any).mockResolvedValue({ id: 'm1' });
    (prisma.visit.create as any).mockResolvedValue({ id: 'v2' });

    const result = await service.record({ memberId: 'm1', scanId: 's2' }, 'officer1');

    expect(result).toEqual({ id: 'v2' });
    expect(prisma.visit.create).toHaveBeenCalledWith({
      data: { memberId: 'm1', membershipId: null, scanId: 's2', officerId: 'officer1' },
    });
  });
});
