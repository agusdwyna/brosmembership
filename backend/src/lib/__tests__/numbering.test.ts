import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../../modules/settings/service', () => ({
  settingsService: { getString: vi.fn() },
}));

import { settingsService } from '../../modules/settings/service';
import { retryOnUnique, generateMemberNumber, generateCardNumber } from '../numbering';

const db = (rows: { number: string }[]) => ({ $queryRawUnsafe: vi.fn().mockResolvedValue(rows) });

const uniqueError = (target: string[]) => {
  const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
  return err;
};

beforeEach(() => {
  vi.clearAllMocks();
  (settingsService.getString as any).mockImplementation(async (key: string) =>
    key === 'memberNumberPrefix'
      ? ''
      : key === 'memberNumberReset'
        ? 'GLOBAL'
        : key === 'cardNumberPrefix'
          ? 'CARD-'
          : 'GLOBAL',
  );
});

describe('generateMemberNumber', () => {
  it('starts at 000001 when no member exists', async () => {
    expect(await generateMemberNumber(db([]) as any)).toBe('000001');
  });

  it('continues after the highest issued number, not the row count', async () => {
    // Ten members were issued, one was hard-deleted: count() would say 9 and
    // hand out 000010, which still exists.
    const next = await generateMemberNumber(db([{ number: '000010' }]) as any);
    expect(next).toBe('000011');
  });

  it('keeps six digits when the sequence grows past 999999', async () => {
    expect(await generateMemberNumber(db([{ number: '1000000' }]) as any)).toBe('1000001');
  });
});

describe('generateCardNumber', () => {
  it('remembers the prefix when computing the next card number', async () => {
    const tx = db([{ number: 'CARD-000007' }]);
    expect(await generateCardNumber(tx as any)).toBe('CARD-000008');
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(expect.any(String), 'CARD-');
  });
});

describe('retryOnUnique', () => {
  it('retries a member/card number collision', async () => {
    let calls = 0;
    const result = await retryOnUnique(async () => {
      calls++;
      if (calls === 1) throw uniqueError(['memberNumber']);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry a duplicate NIK — re-running can never fix it', async () => {
    let calls = 0;
    await expect(
      retryOnUnique(async () => {
        calls++;
        throw uniqueError(['nikHash']);
      }),
    ).rejects.toThrow(/unique/i);
    expect(calls).toBe(1);
  });

  it('does not retry unrelated errors', async () => {
    let calls = 0;
    await expect(
      retryOnUnique(async () => {
        calls++;
        throw new Error('connection lost');
      }),
    ).rejects.toThrow('connection lost');
    expect(calls).toBe(1);
  });
});
