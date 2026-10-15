import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  prisma: {
    membershipType: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../../config/database';
import { MembershipTypeService } from '../service';

const service = new MembershipTypeService();

const mockType = {
  id: 'mt1',
  code: 'GOLD',
  name: 'Gold Membership',
  description: 'Premium',
  duration: 365,
  status: 'ACTIVE',
  defaultCardTemplateId: 't1',
  defaultCardTemplate: { id: 't1', name: 'Default' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MembershipTypeService', () => {
  describe('getById', () => {
    it('returns membership type when found', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(mockType);
      const result = await service.getById('mt1');
      expect(result.code).toBe('GOLD');
    });

    it('throws 404 when not found', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('creates a new membership type', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(null);
      (prisma.membershipType.create as any).mockResolvedValue(mockType);

      const result = await service.create({
        code: 'GOLD',
        name: 'Gold Membership',
        description: 'Premium',
        duration: 365,
        status: 'ACTIVE',
      });

      expect(prisma.membershipType.create).toHaveBeenCalled();
      expect(result.code).toBe('GOLD');
    });

    it('rejects duplicate code', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(mockType);

      await expect(
        service.create({ code: 'GOLD', name: 'Gold', duration: 365, status: 'ACTIVE' }),
      ).rejects.toThrow('Code sudah digunakan');
    });
  });

  describe('update', () => {
    it('updates an existing membership type', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(mockType);
      (prisma.membershipType.findFirst as any).mockResolvedValue(null);
      (prisma.membershipType.update as any).mockResolvedValue({ ...mockType, name: 'Updated' });

      const result = await service.update('mt1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('rejects duplicate code on update', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(mockType);
      (prisma.membershipType.findFirst as any).mockResolvedValue({
        ...mockType,
        id: 'mt2',
      });

      await expect(service.update('mt1', { code: 'SILVER' })).rejects.toThrow(
        'Code sudah digunakan',
      );
    });

    it('allows keeping the same code on update', async () => {
      (prisma.membershipType.findUnique as any).mockResolvedValue(mockType);
      (prisma.membershipType.findFirst as any).mockResolvedValue(null);
      (prisma.membershipType.update as any).mockResolvedValue(mockType);

      const result = await service.update('mt1', { code: 'GOLD' });
      expect(result.code).toBe('GOLD');
    });
  });
});
