import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  prisma: {
    membership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    membershipType: {
      findUnique: vi.fn(),
    },
    membershipCard: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback: any) =>
      callback({
        membership: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        membershipType: {
          findUnique: vi.fn(),
        },
        membershipCard: {
          create: vi.fn(),
          update: vi.fn(),
        },
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
      }),
    ),
  },
}));

vi.mock('../../../modules/activity-log/service', () => ({
  activityLogService: {
    log: vi.fn(),
  },
}));

import { prisma } from '../../../config/database';
import { MembershipService } from '../service';

const service = new MembershipService();

const mockMembership = {
  id: 'ms1',
  memberId: 'm1',
  membershipTypeId: 'mt1',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  status: 'ACTIVE',
  member: { id: 'm1', memberNumber: 'MB-001', fullName: 'Agus' },
  membershipType: { id: 'mt1', name: 'Gold', duration: 365, status: 'ACTIVE' },
  cards: [{ id: 'c1', cardNumber: 'CARD-000001', status: 'ACTIVE', cardTemplateId: 't1' }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MembershipService', () => {
  describe('suspend', () => {
    it('suspends an active membership', async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({
        ...mockMembership,
        cards: [],
        membershipType: { ...mockMembership.membershipType, defaultCardTemplate: null },
      });
      (prisma.membership.update as any).mockResolvedValue({
        ...mockMembership,
        status: 'SUSPENDED',
      });

      await service.suspend('ms1', 'officer1');

      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUSPENDED' } }),
      );
    });

    it('rejects suspending a non-active membership', async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({
        ...mockMembership,
        status: 'EXPIRED',
        cards: [],
        membershipType: { ...mockMembership.membershipType, defaultCardTemplate: null },
      });

      await expect(service.suspend('ms1', 'officer1')).rejects.toThrow();
    });
  });

  describe('cancel', () => {
    it('cancels an active membership', async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({
        ...mockMembership,
        cards: [],
        membershipType: { ...mockMembership.membershipType, defaultCardTemplate: null },
      });
      (prisma.membership.update as any).mockResolvedValue({
        ...mockMembership,
        status: 'CANCELLED',
      });

      await service.cancel('ms1', 'officer1');

      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it('rejects cancelling an already cancelled membership', async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({
        ...mockMembership,
        status: 'CANCELLED',
        cards: [],
        membershipType: { ...mockMembership.membershipType, defaultCardTemplate: null },
      });

      await expect(service.cancel('ms1', 'officer1')).rejects.toThrow();
    });
  });
});
