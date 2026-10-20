import { prisma } from '../../config/database';
import { activityLogService } from '../activity-log/service';
import { clearRolePermissionCache } from '../../middlewares/auth';
import { ADMINISTRATIVE_PERMISSIONS, isPermission } from '../../lib/permissions';
import type { CreateRoleInput, UpdateRoleInput } from './schema';

// The ADMIN role must keep the permissions that let someone manage users/roles,
// otherwise an admin could lock the whole system out of role management.
const PROTECTED_ROLE_KEY = 'ADMIN';

class RoleService {
  async list() {
    return prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { label: 'asc' }],
    });
  }

  async getById(id: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw Object.assign(new Error('Role tidak ditemukan'), { status: 404 });
    return role;
  }

  async create(input: CreateRoleInput, performedBy: string) {
    this.assertKnownPermissions(input.permissions);

    const existing = await prisma.role.findUnique({ where: { key: input.key } });
    if (existing) throw Object.assign(new Error('Kode role sudah dipakai'), { status: 409 });

    const role = await prisma.role.create({
      data: {
        key: input.key,
        label: input.label,
        description: input.description,
        permissions: input.permissions,
      },
    });
    clearRolePermissionCache();

    await activityLogService.log({
      action: 'CREATE_ROLE',
      description: `Role ${role.key} dibuat`,
      newValue: `${role.label} (${role.permissions.length} permission)`,
      performedBy,
    });

    return role;
  }

  async update(id: string, input: UpdateRoleInput, performedBy: string) {
    const current = await this.getById(id);

    if (input.permissions) {
      this.assertKnownPermissions(input.permissions);
      if (
        current.key === PROTECTED_ROLE_KEY &&
        !ADMINISTRATIVE_PERMISSIONS.every((p) => input.permissions!.includes(p))
      ) {
        throw Object.assign(
          new Error('Role ADMIN harus tetap punya permission kelola user dan role.'),
          { status: 400 },
        );
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        label: input.label,
        description: input.description,
        permissions: input.permissions,
      },
    });
    clearRolePermissionCache();

    await activityLogService.log({
      action: 'UPDATE_ROLE',
      description: `Role ${role.key} diperbarui`,
      oldValue: `${current.label} (${current.permissions.length} permission)`,
      newValue: `${role.label} (${role.permissions.length} permission)`,
      performedBy,
    });

    return role;
  }

  async remove(id: string, performedBy: string) {
    const role = await this.getById(id);

    if (role.isSystem) {
      throw Object.assign(new Error('Role bawaan tidak bisa dihapus.'), { status: 400 });
    }

    const usersWithRole = await prisma.user.count({ where: { role: role.key } });
    if (usersWithRole > 0) {
      throw Object.assign(
        new Error(`Role masih dipakai oleh ${usersWithRole} user. Pindahkan dulu user tersebut.`),
        { status: 400 },
      );
    }

    await prisma.role.delete({ where: { id } });
    clearRolePermissionCache();

    await activityLogService.log({
      action: 'DELETE_ROLE',
      description: `Role ${role.key} dihapus`,
      oldValue: `${role.label}`,
      performedBy,
    });

    return { id: role.id };
  }

  private assertKnownPermissions(permissions: string[]) {
    const unknown = permissions.filter((p) => !isPermission(p));
    if (unknown.length > 0) {
      throw Object.assign(new Error(`Permission tidak dikenal: ${unknown.join(', ')}`), {
        status: 400,
      });
    }
  }
}

export const roleService = new RoleService();
