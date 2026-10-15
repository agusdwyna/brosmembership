import { prisma } from '../../config/database';
import type { CreateCompanyInput, UpdateCompanyInput } from './schema';
import { LIST_LIMIT } from '../../lib/query';

/**
 * The form sends '' when an optional text field is cleared. Store null instead
 * of an empty string so "not set" is represented consistently. Only `email` is
 * affected — `address`/`phone` are plain optional strings.
 */
function normalizeEmail<T extends { email?: string }>(
  input: T,
): Omit<T, 'email'> & { email?: string | null } {
  return input.email === '' ? { ...input, email: null } : input;
}

export class CompanyService {
  async list() {
    return prisma.company.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async getById(id: string) {
    const item = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!item) throw Object.assign(new Error('Company tidak ditemukan'), { status: 404 });
    return item;
  }

  async create(input: CreateCompanyInput) {
    const existing = await prisma.company.findUnique({ where: { code: input.code } });
    if (existing) throw Object.assign(new Error('Code sudah digunakan'), { status: 409 });

    return prisma.company.create({ data: normalizeEmail(input) });
  }

  async update(id: string, input: UpdateCompanyInput) {
    await this.getById(id);

    if (input.code) {
      const existing = await prisma.company.findFirst({
        where: { code: input.code, id: { not: id } },
      });
      if (existing) throw Object.assign(new Error('Code sudah digunakan'), { status: 409 });
    }

    return prisma.company.update({ where: { id }, data: normalizeEmail(input) });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.company.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async activate(id: string) {
    await this.getById(id);
    return prisma.company.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }
}

export const companyService = new CompanyService();
