import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashNik } from '../../../lib/nik';

vi.mock('../../../config/database', () => ({
  prisma: {
    member: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../../../config/database';
import { publicCardService } from '../service';

const TOKEN = 'a'.repeat(64);

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

function fullMember(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Budi Santoso',
    memberNumber: 'M-000001',
    qrHash: TOKEN,
    photo: null,
    status: 'ACTIVE',
    memberships: [
      {
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        endDate: future,
        membershipType: { name: 'Gold Membership', status: 'ACTIVE' },
        cards: [
          {
            templateVersion: 2,
            cardTemplate: {
              name: 'Gold Card',
              sides: [
                {
                  id: 's1',
                  side: 'FRONT',
                  designUrl: '/uploads/bg.png',
                  elements: [
                    {
                      id: 'e1',
                      type: 'MEMBER_NAME',
                      x: 10,
                      y: 20,
                      width: 200,
                      height: 30,
                      fontSize: 16,
                      fontWeight: 'bold',
                      alignment: 'left',
                      color: null,
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

/** First query selects only the id; the second loads the full card. */
function primeMember(member: unknown) {
  (prisma.member.findFirst as any).mockImplementation((args: any) => {
    if (args?.select && args.select.id === true && !args.select.fullName) {
      return Promise.resolve(member ? { id: 'm1' } : null);
    }
    return Promise.resolve(member);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  primeMember(fullMember());
});

describe('PublicCardService', () => {
  it('resolves a raw token by qrHash', async () => {
    const result = await publicCardService.getByToken(TOKEN);

    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { qrHash: TOKEN, deletedAt: null } }),
    );
    expect(result.member.fullName).toBe('Budi Santoso');
    expect(result.membership.typeName).toBe('Gold Membership');
    expect(result.card.template.sides[0].elements[0].type).toBe('MEMBER_NAME');
  });

  it('extracts the token from a public card URL', async () => {
    await publicCardService.getByToken(`https://members.baliroyal.test/c/${TOKEN}`);

    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { qrHash: TOKEN, deletedAt: null } }),
    );
  });

  it('looks a NIK up by its HMAC, never in plaintext', async () => {
    const nik = '3201234567890123';
    await publicCardService.getByNik(nik);

    expect(prisma.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nikHash: hashNik(nik), deletedAt: null } }),
    );
    expect(JSON.stringify((prisma.member.findFirst as any).mock.calls)).not.toContain(nik);
  });

  it('404s generically for an unknown token', async () => {
    primeMember(null);

    await expect(publicCardService.getByToken(TOKEN)).rejects.toMatchObject({
      status: 404,
      message: 'Kartu tidak ditemukan',
    });
  });

  it('404s when the member has no card yet', async () => {
    primeMember(fullMember({ memberships: [] }));

    await expect(publicCardService.getByToken(TOKEN)).rejects.toMatchObject({ status: 404 });
  });

  it('reports an expired membership without mutating it', async () => {
    primeMember(
      fullMember({
        memberships: [
          {
            status: 'ACTIVE',
            startDate: past,
            endDate: past,
            membershipType: { name: 'Gold Membership', status: 'ACTIVE' },
            cards: fullMember().memberships[0].cards,
          },
        ],
      }),
    );

    const result = await publicCardService.getByToken(TOKEN);
    expect(result.validity).toBe('EXPIRED');
  });

  it('reports an inactive member', async () => {
    primeMember(fullMember({ status: 'INACTIVE' }));

    const result = await publicCardService.getByToken(TOKEN);
    expect(result.validity).toBe('INACTIVE');
  });

  it('never returns NIK or contact fields', async () => {
    const result = await publicCardService.getByToken(TOKEN);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('nikHash');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('address');
  });
});
