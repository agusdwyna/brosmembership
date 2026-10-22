import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { HISTORY_LIMIT } from '../../lib/query';
import type { CreateVisitInput } from './schema';

class VisitService {
  /**
   * Record that a validated member continued to SIMRS registration. Recording is
   * idempotent per scan: pressing the button twice (or a retry) returns the
   * existing visit instead of creating a duplicate.
   */
  async record(input: CreateVisitInput, officerId: string) {
    if (input.scanId) {
      const existing = await prisma.visit.findUnique({ where: { scanId: input.scanId } });
      if (existing) return existing;
    }

    const member = await prisma.member.findFirst({
      where: { id: input.memberId, deletedAt: null },
    });
    if (!member) throw Object.assign(new Error('Member tidak ditemukan'), { status: 404 });

    // The membership id comes from the client, so it must be proven to belong
    // to this member — otherwise a visit could be filed against someone else's
    // membership and skew their history.
    if (input.membershipId) {
      const membership = await prisma.membership.findFirst({
        where: { id: input.membershipId, memberId: input.memberId },
        select: { id: true },
      });
      if (!membership) {
        throw Object.assign(new Error('Membership tidak sesuai dengan member'), { status: 400 });
      }
    }

    try {
      return await prisma.visit.create({
        data: {
          memberId: input.memberId,
          membershipId: input.membershipId || null,
          scanId: input.scanId || null,
          officerId,
        },
      });
    } catch (err) {
      // A concurrent retry for the same scan trips the unique scanId. Return the
      // row the other request just created instead of surfacing a 409/500.
      if (
        input.scanId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await prisma.visit.findUnique({ where: { scanId: input.scanId } });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async list(filters?: { dateFrom?: Date; dateTo?: Date; memberId?: string }) {
    const where: {
      memberId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters?.memberId) where.memberId = filters.memberId;

    return prisma.visit.findMany({
      where,
      include: {
        member: { select: { id: true, memberNumber: true, nikLast4: true, fullName: true } },
        membership: { select: { id: true, status: true } },
        officer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
  }
}

export const visitService = new VisitService();
