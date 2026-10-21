import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock must be before imports that use the mocked module
vi.mock('../../../config/database', () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    scanHistory: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../modules/activity-log/service', () => ({
  activityLogService: {
    log: vi.fn(),
  },
}));

import { prisma } from '../../../config/database';
import { hashNik } from '../../../lib/nik';
import { ScannerService } from '../service';

const service = new ScannerService();

const mockMember = {
  id: 'm1',
  memberNumber: 'MB-001',
  nikLast4: '0123',
  qrHash: 'tok_xxx',
  fullName: 'Agus',
  status: 'ACTIVE',
};
const mockTemplate = {
  id: 't1',
  name: 'Default',
  sides: [
    { id: 's1', side: 'FRONT', designUrl: null, elements: [] },
    { id: 's2', side: 'BACK', designUrl: null, elements: [] },
  ],
};

/**
 * The service resolves a member first, then its latest membership (with the
 * newest card + template). Build that shape.
 */
function makeMembership(overrides: Record<string, any> = {}) {
  return {
    id: 'ms1',
    memberId: 'm1',
    status: 'ACTIVE',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2099-12-31'),
    membershipType: { id: 'mt1', name: 'Gold', status: 'ACTIVE' },
    cards: [
      {
        id: 'c1',
        cardNumber: 'CARD-000001',
        cardTemplate: mockTemplate,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.member.findUnique as any).mockResolvedValue(mockMember);
  (prisma.membership.findFirst as any).mockResolvedValue(makeMembership());
  // recordScan now returns the created row's id (used to link a follow-up visit).
  (prisma.scanHistory.create as any).mockResolvedValue({ id: 'scan-1' });
});

describe('ScannerService.verify', () => {
  it('returns NOT_FOUND when member does not exist', async () => {
    (prisma.member.findUnique as any).mockResolvedValue(null);

    const result = await service.verify({ token: 'unknown', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.result).toBe('NOT_FOUND');
    expect(prisma.scanHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ result: 'NOT_FOUND' }),
      }),
    );
  });

  it('returns NOT_FOUND when member has no membership', async () => {
    (prisma.membership.findFirst as any).mockResolvedValue(null);

    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.result).toBe('NOT_FOUND');
    expect(result.member?.fullName).toBe('Agus');
  });

  it('returns SUSPENDED when membership is suspended', async () => {
    (prisma.membership.findFirst as any).mockResolvedValue(makeMembership({ status: 'SUSPENDED' }));

    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'CAMERA' }, 'officer1');

    expect(result.result).toBe('SUSPENDED');
    expect(result.member?.fullName).toBe('Agus');
  });

  it('returns CANCELLED when membership is cancelled', async () => {
    (prisma.membership.findFirst as any).mockResolvedValue(makeMembership({ status: 'CANCELLED' }));

    const result = await service.verify(
      { token: 'tok_xxx', scannerMethod: 'PHYSICAL_READER' },
      'officer1',
    );

    expect(result.result).toBe('CANCELLED');
  });

  it('returns EXPIRED when membership end date has passed', async () => {
    (prisma.membership.findFirst as any).mockResolvedValue(
      makeMembership({ endDate: new Date('2020-01-01') }),
    );

    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.result).toBe('EXPIRED');
    expect(prisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'EXPIRED' },
      }),
    );
  });

  it('returns INACTIVE when the member is deactivated', async () => {
    (prisma.member.findUnique as any).mockResolvedValue({ ...mockMember, status: 'INACTIVE' });

    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.result).toBe('INACTIVE');
    expect(result.reason).toBe('Member tidak aktif');
  });

  it('returns INACTIVE when the membership type is inactive', async () => {
    (prisma.membership.findFirst as any).mockResolvedValue(
      makeMembership({ membershipType: { id: 'mt1', name: 'Gold', status: 'INACTIVE' } }),
    );

    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.result).toBe('INACTIVE');
    expect(result.reason).toBe('Tipe membership tidak aktif');
  });

  it('returns VALID when membership is active and not expired', async () => {
    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.result).toBe('VALID');
    expect(result.member?.fullName).toBe('Agus');
    expect(result.membership?.typeName).toBe('Gold');
    expect(result.card?.template?.name).toBe('Default');
    expect(result.scanId).toBe('scan-1');
  });

  it('records scan history for every verification', async () => {
    (prisma.member.findUnique as any).mockResolvedValue(null);

    await service.verify({ token: 'tok', scannerMethod: 'MANUAL' }, 'officer1');

    expect(prisma.scanHistory.create).toHaveBeenCalledTimes(1);
    expect(prisma.scanHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          officerId: 'officer1',
          scannerMethod: 'MANUAL',
        }),
      }),
    );
  });

  it('looks the member up by qrHash first, then memberNumber, then NIK', async () => {
    await service.verify({ token: 'MB-001', scannerMethod: 'MANUAL' }, 'officer1');

    // qrHash is tried first; when it misses the token flow continues in
    // findMember, so asserting the call shape here documents the order.
    expect(prisma.member.findUnique).toHaveBeenCalledWith({
      where: { qrHash: 'MB-001' },
    });
  });

  it('resolves a typed NIK through its HMAC, never the plaintext', async () => {
    // Earlier lookups miss so the NIK branch runs.
    (prisma.member.findUnique as any)
      .mockResolvedValueOnce(null) // qrHash
      .mockResolvedValueOnce(null) // memberNumber
      .mockResolvedValueOnce(mockMember); // nikHash

    await service.verify({ token: '3201234567890123', scannerMethod: 'MANUAL' }, 'officer1');

    expect(prisma.member.findUnique).toHaveBeenLastCalledWith({
      where: { nikHash: hashNik('3201234567890123') },
    });
  });

  it('never returns the full NIK, only the masked form', async () => {
    const result = await service.verify({ token: 'tok_xxx', scannerMethod: 'MANUAL' }, 'officer1');

    expect(result.member?.nikMasked).toBe('••••••••••••0123');
    expect(result.member).not.toHaveProperty('nik');
  });
});
