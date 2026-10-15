import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt', () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn() } }));
vi.mock('../../../config/env', () => ({
  env: { JWT_SECRET: 'test', JWT_EXPIRES_IN: '1d', JWT_REFRESH_EXPIRES_IN: '7d' },
}));

vi.mock('../../../config/database', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from '../../../config/database';
import { authService } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.updateMe', () => {
  it('rejects an email already used by another account', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({ id: 'other' });

    await expect(authService.updateMe('u1', { email: 'taken@bros.local' })).rejects.toMatchObject({
      status: 409,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates the profile and returns the auth user shape', async () => {
    (prisma.user.findFirst as any).mockResolvedValue(null);
    (prisma.user.update as any).mockResolvedValue({
      id: 'u1',
      email: 'new@bros.local',
      name: 'Nama Baru',
      role: 'ADMIN',
    });

    const result = await authService.updateMe('u1', { name: 'Nama Baru', email: 'new@bros.local' });

    expect(result).toEqual({
      id: 'u1',
      email: 'new@bros.local',
      name: 'Nama Baru',
      role: 'ADMIN',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
