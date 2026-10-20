import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}));

vi.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../activity-log/service', () => ({
  activityLogService: { log: vi.fn() },
}));

import { prisma } from '../../../config/database';
import { activityLogService } from '../../activity-log/service';
import { userService as service } from '../service';

const adminActive = {
  id: 'u1',
  email: 'admin@bros.local',
  name: 'Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // The last-admin guard now runs count + update in one transaction.
  (prisma as any).$transaction = (callback: (tx: any) => any) => callback(prisma);
  // Roles are now looked up in the roles table: ADMIN carries admin permissions,
  // any other key resolves to a plain (non-admin) role.
  (prisma.role.findUnique as any).mockImplementation(({ where }: { where: { key: string } }) =>
    Promise.resolve(
      where.key === 'ADMIN'
        ? { key: 'ADMIN', permissions: ['user.manage', 'role.manage'] }
        : { key: where.key, permissions: [] },
    ),
  );
  (prisma.role.findMany as any).mockResolvedValue([{ key: 'ADMIN' }]);
});

describe('UserService.create', () => {
  it('rejects a duplicate email with 409', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        { email: 'a@b.co', password: 'secret1', name: 'A', role: 'OFFICER' },
        'admin1',
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('never returns passwordHash and records an audit entry', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      ...adminActive,
      role: 'OFFICER',
      email: 'officer@bros.local',
    });

    const result = await service.create(
      { email: 'officer@bros.local', password: 'secret1', name: 'O', role: 'OFFICER' },
      'admin1',
    );

    expect(result).not.toHaveProperty('passwordHash');
    expect(activityLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_USER', performedBy: 'admin1' }),
    );
  });
});

describe('UserService.deactivate', () => {
  it('refuses to deactivate the last active admin', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(adminActive);
    (prisma.user.count as any).mockResolvedValue(0);

    await expect(service.deactivate('u1', 'admin1')).rejects.toMatchObject({ status: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('deactivates an admin when another active admin remains', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(adminActive);
    (prisma.user.count as any).mockResolvedValue(1);
    (prisma.user.update as any).mockResolvedValue({ ...adminActive, status: 'INACTIVE' });

    const result = await service.deactivate('u1', 'admin1');

    expect(result.status).toBe('INACTIVE');
    expect(activityLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEACTIVATE_USER' }),
    );
  });
});

describe('UserService.update', () => {
  it('refuses to demote the last active admin to officer', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(adminActive);
    (prisma.user.count as any).mockResolvedValue(0);

    await expect(service.update('u1', { role: 'OFFICER' }, 'admin1')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rejects changing email to one already taken', async () => {
    // getById and the email-availability probe both go through findUnique;
    // a non-matching email therefore resolves to the (taken) admin row.
    (prisma.user.findUnique as any).mockResolvedValue(adminActive);

    await expect(
      service.update('u1', { email: 'taken@bros.local' }, 'admin1'),
    ).rejects.toMatchObject({ status: 409 });
  });
});
