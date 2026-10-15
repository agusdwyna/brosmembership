import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  prisma: {
    membershipCard: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../../config/database';
import { CardService } from '../service';

const service = new CardService();

const mockCard = {
  id: 'c1',
  cardNumber: 'CARD-000001',
  membershipId: 'ms1',
  cardTemplateId: 't1',
  templateVersion: 1,
  membership: {
    id: 'ms1',
    memberId: 'm1',
    member: { id: 'm1', fullName: 'Agus', memberNumber: '2608000001', nik: '1234567890123456' },
    membershipType: { id: 'mt1', name: 'Gold' },
  },
  cardTemplate: { id: 't1', name: 'Default', sides: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CardService', () => {
  describe('getById', () => {
    it('returns card when found', async () => {
      (prisma.membershipCard.findUnique as any).mockResolvedValue(mockCard);
      const result = await service.getById('c1');
      expect(result.id).toBe('c1');
    });

    it('throws 404 when card not found', async () => {
      (prisma.membershipCard.findUnique as any).mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow('Card not found');
    });
  });
});
