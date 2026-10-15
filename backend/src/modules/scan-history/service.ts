import { prisma } from '../../config/database';
import { HISTORY_LIMIT } from '../../lib/query';

class ScanHistoryService {
  async list(filters?: { dateFrom?: Date; dateTo?: Date; result?: string }) {
    const where: any = {};

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters?.result) {
      where.result = filters.result;
    }

    return prisma.scanHistory.findMany({
      where,
      include: {
        member: { select: { id: true, memberNumber: true, nik: true, fullName: true } },
        membership: { select: { id: true, status: true } },
        officer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
  }
}

export const scanHistoryService = new ScanHistoryService();
