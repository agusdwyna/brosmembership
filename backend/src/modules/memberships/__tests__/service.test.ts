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

  describe('updateDates', () => {
    const active = () => {
      (prisma.membership.findUnique as any).mockResolvedValue({
        ...mockMembership,
        membershipType: { ...mockMembership.membershipType, defaultCardTemplate: null },
      });
      (prisma.membership.update as any).mockImplementation(({ data }: any) => ({
        ...mockMembership,
        ...data,
      }));
    };

    it('uses an explicit end date, so a promo can be shorter than the type duration', async () => {
      active();

      await service.updateDates(
        'ms1',
        { startDate: new Date('2026-01-20'), endDate: new Date('2026-02-10') },
        'officer1',
      );

      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ms1' },
          data: { startDate: new Date('2026-01-20'), endDate: new Date('2026-02-10') },
        }),
      );
    });

    it('defaults the end to start + type duration when no end date is given', async () => {
      active();

      await service.updateDates('ms1', { startDate: new Date('2026-01-20') }, 'officer1');

      const { endDate } = (prisma.membership.update as any).mock.calls[0][0].data;
      // 365 days after 20 Jan 2026.
      expect(endDate.toISOString().slice(0, 10)).toBe('2027-01-20');
    });

    it('rejects an end date that is not after the start date', async () => {
      active();

      await expect(
        service.updateDates(
          'ms1',
          { startDate: new Date('2026-02-10'), endDate: new Date('2026-02-10') },
          'officer1',
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.membership.update).not.toHaveBeenCalled();
    });

    it('refuses to edit a cancelled membership', async () => {
      (prisma.membership.findUnique as any).mockResolvedValue({
        ...mockMembership,
        status: 'CANCELLED',
        membershipType: { ...mockMembership.membershipType, defaultCardTemplate: null },
      });

      await expect(
        service.updateDates('ms1', { startDate: new Date('2026-01-20') }, 'officer1'),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('logs the change with the old and new period', async () => {
      active();
      const { activityLogService } = await import('../../activity-log/service');

      await service.updateDates(
        'ms1',
        { startDate: new Date('2026-01-20'), endDate: new Date('2026-02-10') },
        'officer1',
      );

      expect(activityLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_DATES',
          oldValue: '01/01/2025 — 31/12/2025',
          newValue: '20/01/2026 — 10/02/2026',
        }),
      );
    });
  });
});
