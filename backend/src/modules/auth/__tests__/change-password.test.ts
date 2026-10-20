import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('new-hash'), compare: vi.fn() },
}));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn() } }));
vi.mock('../../../config/env', () => ({
  env: { JWT_SECRET: 'test', JWT_EXPIRES_IN: '1d', JWT_REFRESH_EXPIRES_IN: '7d' },
}));
vi.mock('../../../config/database', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('../../activity-log/service', () => ({
  activityLogService: { log: vi.fn() },
}));

import bcrypt from 'bcrypt';
import { prisma } from '../../../config/database';
import { authService } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.changePassword', () => {
  it('rejects when the current password is wrong', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      passwordHash: 'old-hash',
    });
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(
      authService.changePassword('u1', { currentPassword: 'wrong', newPassword: 'newpass1' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('hashes and stores the new password when the current one matches', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      passwordHash: 'old-hash',
    });
    (bcrypt.compare as any).mockResolvedValue(true);

    await authService.changePassword('u1', { currentPassword: 'good', newPassword: 'newpass1' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'new-hash' },
    });
  });
});
