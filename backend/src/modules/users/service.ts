import bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { activityLogService } from '../activity-log/service';
import { LIST_LIMIT } from '../../lib/query';
import { ADMINISTRATIVE_PERMISSIONS } from '../../lib/permissions';
import type { CreateUserInput, ResetPasswordInput, UpdateUserInput } from './schema';

const SALT_ROUNDS = 10;

// Never select passwordHash.
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

class UserService {
  async list(filters?: { search?: string; role?: string; status?: string }) {
    const where: {
      role?: string;
      status?: string;
      OR?: {
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }[];
    } = {};

    if (filters?.role) where.role = filters.role;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });
    return user;
  }

  async create(input: CreateUserInput, performedBy: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw Object.assign(new Error('Email sudah terdaftar'), { status: 409 });

    await this.assertRoleExists(input.role);

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name, role: input.role },
      select: userSelect,
    });

    await activityLogService.log({
      action: 'CREATE_USER',
      description: `User ${user.email} (${user.role}) dibuat`,
      performedBy,
    });

    return user;
  }

  async update(id: string, input: UpdateUserInput, performedBy: string) {
    const current = await this.getById(id);

    let guardLastAdmin = false;
    if (input.role !== undefined && input.role !== current.role) {
      await this.assertRoleExists(input.role);

      // Demoting the last active admin into a non-admin role would lock everyone
      // out of user/role management.
      const wasAdmin = await this.roleIsAdministrative(current.role);
      const staysAdmin = await this.roleIsAdministrative(input.role);
      guardLastAdmin = current.status === 'ACTIVE' && wasAdmin && !staysAdmin;
    }

    if (input.email && input.email !== current.email) {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw Object.assign(new Error('Email sudah terdaftar'), { status: 409 });
    }

    // Count + write in one transaction so the guard can't race another demotion.
    const user = await prisma.$transaction(async (tx) => {
      if (guardLastAdmin) await this.assertNotLastAdmin(id, tx);
      return tx.user.update({ where: { id }, data: input, select: userSelect });
    });

    await activityLogService.log({
      action: 'UPDATE_USER',
      description: `User ${user.email} diperbarui`,
      oldValue: `${current.name} / ${current.role}`,
      newValue: `${user.name} / ${user.role}`,
      performedBy,
    });

    return user;
  }

  async deactivate(id: string, performedBy: string) {
    const current = await this.getById(id);
    const guard = current.status === 'ACTIVE' && (await this.roleIsAdministrative(current.role));

    // Count + write in one transaction so the guard can't race another demotion.
    const user = await prisma.$transaction(async (tx) => {
      if (guard) await this.assertNotLastAdmin(id, tx);
      return tx.user.update({
        where: { id },
        data: { status: 'INACTIVE' },
        select: userSelect,
      });
    });

    await activityLogService.log({
      action: 'DEACTIVATE_USER',
      description: `User ${user.email} dinonaktifkan`,
      performedBy,
    });

    return user;
  }

  async activate(id: string, performedBy: string) {
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: userSelect,
    });

    await activityLogService.log({
      action: 'ACTIVATE_USER',
      description: `User ${user.email} diaktifkan`,
      performedBy,
    });

    return user;
  }

  async resetPassword(id: string, input: ResetPasswordInput, performedBy: string) {
    const user = await this.getById(id);
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await activityLogService.log({
      action: 'RESET_PASSWORD',
      description: `Password user ${user.email} direset`,
      performedBy,
    });

    return { id: user.id, email: user.email };
  }

  /** True when the role grants any administrative (user/role) permission. */
  private async roleIsAdministrative(roleKey: string): Promise<boolean> {
    const role = await prisma.role.findUnique({
      where: { key: roleKey },
      select: { permissions: true },
    });
    return !!role && ADMINISTRATIVE_PERMISSIONS.some((p) => role.permissions.includes(p));
  }

  private async assertRoleExists(roleKey: string) {
    const role = await prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) throw Object.assign(new Error('Role tidak ditemukan'), { status: 400 });
  }

  /** Throws 400 when removing `id` would leave zero ACTIVE users who can manage users/roles. */
  private async assertNotLastAdmin(id: string, db: Prisma.TransactionClient = prisma) {
    const adminRoles = await db.role.findMany({
      where: { permissions: { hasSome: ADMINISTRATIVE_PERMISSIONS } },
      select: { key: true },
    });
    const remaining = await db.user.count({
      where: {
        role: { in: adminRoles.map((r) => r.key) },
        status: 'ACTIVE',
        id: { not: id },
      },
    });
    if (remaining === 0) {
      throw Object.assign(
        new Error('Tidak bisa menghapus admin aktif terakhir — sisakan minimal satu admin.'),
        { status: 400 },
      );
    }
  }
}

export const userService = new UserService();
