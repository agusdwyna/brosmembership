import { prisma } from '../../config/database';
import type { CreateMembershipTypeInput, UpdateMembershipTypeInput } from './schema';
import { LIST_LIMIT } from '../../lib/query';

/**
 * The form sends '' when the template picker is cleared. Prisma needs null —
 * an empty string is not a valid foreign key. Anything else (including
 * undefined, meaning "leave unchanged" on update) passes through untouched.
 */
function normalizeTemplateId<T extends { defaultCardTemplateId?: string }>(
  input: T,
): Omit<T, 'defaultCardTemplateId'> & { defaultCardTemplateId?: string | null } {
  return input.defaultCardTemplateId === '' ? { ...input, defaultCardTemplateId: null } : input;
}

export class MembershipTypeService {
  async list() {
    return prisma.membershipType.findMany({
      include: { defaultCardTemplate: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async getById(id: string) {
    const item = await prisma.membershipType.findUnique({
      where: { id },
      include: { defaultCardTemplate: { select: { id: true, name: true } } },
    });
    if (!item) throw Object.assign(new Error('Membership type tidak ditemukan'), { status: 404 });
    return item;
  }

  async create(input: CreateMembershipTypeInput) {
    const existing = await prisma.membershipType.findUnique({ where: { code: input.code } });
    if (existing) throw Object.assign(new Error('Code sudah digunakan'), { status: 409 });

    return prisma.membershipType.create({ data: normalizeTemplateId(input) });
  }

  async update(id: string, input: UpdateMembershipTypeInput) {
    await this.getById(id);

    if (input.code) {
      const existing = await prisma.membershipType.findFirst({
        where: { code: input.code, id: { not: id } },
      });
      if (existing) throw Object.assign(new Error('Code sudah digunakan'), { status: 409 });
    }

    return prisma.membershipType.update({ where: { id }, data: normalizeTemplateId(input) });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.membershipType.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async activate(id: string) {
    await this.getById(id);
    return prisma.membershipType.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }
}

export const membershipTypeService = new MembershipTypeService();
