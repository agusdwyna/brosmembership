import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  prisma: {
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: { count: vi.fn() },
  },
}));

vi.mock('../../activity-log/service', () => ({
  activityLogService: { log: vi.fn() },
}));

vi.mock('../../../middlewares/auth', () => ({
  clearRolePermissionCache: vi.fn(),
}));

import { prisma } from '../../../config/database';
import { roleService as service } from '../service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoleService.create', () => {
  it('rejects unknown permissions with 400', async () => {
    await expect(
      service.create(
        { key: 'SUP', label: 'Supervisor', permissions: ['member.view', 'bogus.permission'] },
        'admin1',
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.role.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate key with 409', async () => {
    (prisma.role.findUnique as any).mockResolvedValue({ id: 'existing', key: 'SUP' });

    await expect(
      service.create({ key: 'SUP', label: 'Supervisor', permissions: [] }, 'admin1'),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('RoleService.remove', () => {
  it('refuses to delete a system role', async () => {
    (prisma.role.findUnique as any).mockResolvedValue({
      id: 'r1',
      key: 'ADMIN',
      label: 'Administrator',
      isSystem: true,
    });

    await expect(service.remove('r1', 'admin1')).rejects.toMatchObject({ status: 400 });
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a role that is still assigned to users', async () => {
    (prisma.role.findUnique as any).mockResolvedValue({
      id: 'r1',
      key: 'SUP',
      label: 'Supervisor',
      isSystem: false,
    });
    (prisma.user.count as any).mockResolvedValue(2);

    await expect(service.remove('r1', 'admin1')).rejects.toMatchObject({ status: 400 });
  });
});

describe('RoleService.update', () => {
  it('keeps ADMIN able to manage users and roles', async () => {
    (prisma.role.findUnique as any).mockResolvedValue({
      id: 'r1',
      key: 'ADMIN',
      label: 'Administrator',
      isSystem: true,
      permissions: ['user.manage', 'role.manage'],
    });

    await expect(
      service.update('r1', { permissions: ['member.view'] }, 'admin1'),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.role.update).not.toHaveBeenCalled();
  });
});
