import bcrypt from 'bcrypt';
import { prisma } from '../../config/database';
import { activityLogService } from '../activity-log/service';
import { LIST_LIMIT } from '../../lib/query';
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

    // Demoting the last active admin would lock everyone out of user management.
    if (current.role === 'ADMIN' && current.status === 'ACTIVE' && input.role === 'OFFICER') {
      await this.assertNotLastActiveAdmin(id);
    }

    if (input.email && input.email !== current.email) {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw Object.assign(new Error('Email sudah terdaftar'), { status: 409 });
    }

    const user = await prisma.user.update({ where: { id }, data: input, select: userSelect });

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
    if (current.role === 'ADMIN') await this.assertNotLastActiveAdmin(id);

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: userSelect,
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

  /** Throws 400 when removing `id` would leave zero ACTIVE admins. */
  private async assertNotLastActiveAdmin(id: string) {
    const activeAdmins = await prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } },
    });
    if (activeAdmins === 0) {
      throw Object.assign(
        new Error('Tidak bisa menghapus admin aktif terakhir — sisakan minimal satu admin.'),
        { status: 400 },
      );
    }
  }
}

export const userService = new UserService();
