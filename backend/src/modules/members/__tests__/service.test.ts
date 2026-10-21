import { describe, it, expect, vi, beforeEach } from 'vitest';

const txMock = {
  member: { create: vi.fn(), count: vi.fn() },
  membership: { create: vi.fn() },
  membershipCard: { create: vi.fn(), count: vi.fn() },
};

vi.mock('../../../config/database', () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    membershipType: { findUnique: vi.fn() },
    membershipCard: { count: vi.fn(), create: vi.fn() },
    cardTemplate: { findFirst: vi.fn() },
    // Numbering reads configurable prefixes; null row → built-in defaults.
    setting: { findUnique: vi.fn() },
    $transaction: vi.fn((callback: any) => callback(txMock)),
  },
}));

vi.mock('../../../modules/activity-log/service', () => ({
  activityLogService: { log: vi.fn() },
}));

import { prisma } from '../../../config/database';
import { memberService as service } from '../service';

const baseInput = {
  fullName: 'Agus',
  nik: '3201234567890123',
  membershipTypeId: 'mt1',
  startDate: new Date('2025-01-01'),
};

function primeHappyPath() {
  (prisma.member.count as any).mockResolvedValue(0);
  (prisma.membershipCard.count as any).mockResolvedValue(0);
  // Numbering now runs inside the transaction (tx.member/tx.membershipCard).
  (txMock.member.count as any).mockResolvedValue(0);
  (txMock.membershipCard.count as any).mockResolvedValue(0);
  (prisma.member.findUnique as any).mockResolvedValue({ id: 'm1' });
  (txMock.member.create as any).mockResolvedValue({ id: 'm1', memberNumber: 'M-000001' });
  (txMock.membership.create as any).mockResolvedValue({ id: 'ms1' });
  (txMock.membershipCard.create as any).mockResolvedValue({ id: 'c1' });
}

/** The cardTemplateId the freshly created card was attached to. */
function createdCardTemplateId() {
  return (txMock.membershipCard.create as any).mock.calls[0][0].data.cardTemplateId;
}

beforeEach(() => {
  vi.clearAllMocks();
  primeHappyPath();
});

describe('MemberService', () => {
  describe('create — linking membership to a card template', () => {
    it("uses the membership type's default template when it is active", async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue({
        id: 'mt1',
        name: 'Gold',
        duration: 365,
        status: 'ACTIVE',
        defaultCardTemplateId: 'tpl-gold',
        defaultCardTemplate: { id: 'tpl-gold', status: 'ACTIVE' },
      });

      await service.create(baseInput as any, 'officer1');

      expect(createdCardTemplateId()).toBe('tpl-gold');
      // No fallback lookup should happen when the default is usable.
      expect(prisma.cardTemplate.findFirst).not.toHaveBeenCalled();
    });

    it('ignores a deactivated default and falls back to the oldest active template', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue({
        id: 'mt1',
        name: 'Gold',
        duration: 365,
        status: 'ACTIVE',
        defaultCardTemplateId: 'tpl-retired',
        defaultCardTemplate: { id: 'tpl-retired', status: 'INACTIVE' },
      });
      (prisma.cardTemplate.findFirst as any).mockResolvedValue({ id: 'tpl-active' });

      await service.create(baseInput as any, 'officer1');

      expect(createdCardTemplateId()).toBe('tpl-active');
      expect(prisma.cardTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'ACTIVE' } }),
      );
    });

    it('falls back when the type has no default template', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue({
        id: 'mt1',
        name: 'Gold',
        duration: 365,
        status: 'ACTIVE',
        defaultCardTemplateId: null,
        defaultCardTemplate: null,
      });
      (prisma.cardTemplate.findFirst as any).mockResolvedValue({ id: 'tpl-active' });

      await service.create(baseInput as any, 'officer1');

      expect(createdCardTemplateId()).toBe('tpl-active');
    });

    it('refuses to issue a card when no active template exists', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue({
        id: 'mt1',
        name: 'Gold',
        duration: 365,
        status: 'ACTIVE',
        defaultCardTemplateId: null,
        defaultCardTemplate: null,
      });
      (prisma.cardTemplate.findFirst as any).mockResolvedValue(null);

      await expect(service.create(baseInput as any, 'officer1')).rejects.toThrow(
        /template kartu aktif/i,
      );
      expect(txMock.membershipCard.create).not.toHaveBeenCalled();
    });
  });

  describe('importMany — per-row outcomes', () => {
    const row = (rowNumber: number, nik: string) => ({
      rowNumber,
      fullName: 'Agus',
      nik,
      membershipTypeId: 'mt1',
      startDate: new Date('2025-01-01'),
    });

    function primeImport() {
      (prisma.membershipType.findUnique as any).mockResolvedValue({
        id: 'mt1',
        name: 'Gold',
        duration: 365,
        status: 'ACTIVE',
        defaultCardTemplateId: 'tpl-gold',
        defaultCardTemplate: { id: 'tpl-gold', status: 'ACTIVE' },
      });
      (prisma.member.findMany as any).mockResolvedValue([]);
      (prisma.member.findUnique as any).mockResolvedValue({ id: 'm1' });
    }

    it('creates every valid row and reports none as failed', async () => {
      primeImport();

      const result = await service.importMany(
        [row(2, '3201234567890123'), row(3, '3201234567890124')],
        'officer1',
      );

      expect(result.created).toBe(2);
      expect(result.failed).toEqual([]);
    });

    it('skips NIKs that already exist in the database but still creates the rest', async () => {
      primeImport();
      (prisma.member.findMany as any).mockResolvedValue([{ nik: '3201234567890123' }]);

      const result = await service.importMany(
        [row(2, '3201234567890123'), row(3, '3201234567890124')],
        'officer1',
      );

      expect(result.created).toBe(1);
      expect(result.failed).toEqual([
        { rowNumber: 2, message: 'NIK 3201234567890123 sudah terdaftar' },
      ]);
    });

    it('rejects NIKs repeated inside the file with both row numbers', async () => {
      primeImport();

      const result = await service.importMany(
        [row(2, '3201234567890123'), row(3, '3201234567890123')],
        'officer1',
      );

      expect(result.created).toBe(0);
      expect(result.failed.map((f) => f.rowNumber)).toEqual([2, 3]);
      // Neither duplicate reaches create(), so no membership is written.
      expect(txMock.membership.create).not.toHaveBeenCalled();
    });

    it('does not re-read full member detail for each row', async () => {
      primeImport();

      await service.importMany(
        [row(2, '3201234567890123'), row(3, '3201234567890124')],
        'officer1',
      );

      // getById is the only member.findUnique caller; running it per row would
      // pull every membership, card, template element and scan for nothing.
      expect(prisma.member.findUnique).not.toHaveBeenCalled();
    });

    it('keeps creating after a row throws (e.g. inactive membership type)', async () => {
      primeImport();
      (prisma.membershipType.findUnique as any)
        .mockResolvedValueOnce({
          id: 'mt1',
          name: 'Gold',
          duration: 365,
          status: 'INACTIVE',
          defaultCardTemplateId: null,
          defaultCardTemplate: null,
        })
        .mockResolvedValue({
          id: 'mt1',
          name: 'Gold',
          duration: 365,
          status: 'ACTIVE',
          defaultCardTemplateId: 'tpl-gold',
          defaultCardTemplate: { id: 'tpl-gold', status: 'ACTIVE' },
        });

      const result = await service.importMany(
        [row(2, '3201234567890123'), row(3, '3201234567890124')],
        'officer1',
      );

      expect(result.created).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].rowNumber).toBe(2);
    });
  });

  describe('list — template data reaches the client', () => {
    it('includes the card template with sides and elements', async () => {
      (prisma.member.findMany as any).mockResolvedValue([]);

      await service.list();

      // Without cardTemplate here the PDF export silently finds no cards,
      // because the frontend skips any card whose cardTemplate is missing.
      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            memberships: expect.objectContaining({
              include: expect.objectContaining({
                cards: expect.objectContaining({
                  include: expect.objectContaining({
                    cardTemplate: expect.objectContaining({
                      include: expect.objectContaining({
                        sides: expect.objectContaining({
                          include: expect.objectContaining({ elements: true }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      );
    });
  });
});
