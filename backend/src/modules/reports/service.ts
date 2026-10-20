import { prisma } from '../../config/database';

// Reports are date-bounded by the caller but can still span a very wide range,
// so the raw row list is capped. Aggregate counts remain exact.
const REPORT_ROW_LIMIT = 1000;

class ReportService {
  async getVerificationReport(dateFrom: Date, dateTo: Date) {
    const where = {
      createdAt: { gte: dateFrom, lte: dateTo },
    };

    const [totalScans, resultBreakdown, scanHistory, totalVisits, visits] = await Promise.all([
      prisma.scanHistory.count({ where }),
      prisma.scanHistory.groupBy({
        by: ['result'],
        where,
        _count: { id: true },
      }),
      prisma.scanHistory.findMany({
        where,
        include: {
          member: { select: { id: true, memberNumber: true, fullName: true } },
          membership: { select: { status: true } },
          officer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: REPORT_ROW_LIMIT,
      }),
      prisma.visit.count({ where }),
      prisma.visit.findMany({
        where,
        include: {
          member: { select: { id: true, memberNumber: true, fullName: true } },
          membership: { select: { status: true } },
          officer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: REPORT_ROW_LIMIT,
      }),
    ]);

    const breakdown = resultBreakdown.map((item) => ({
      result: item.result,
      count: item._count.id,
    }));

    const successful = breakdown.find((b) => b.result === 'VALID')?.count || 0;
    const failed = totalScans - successful;

    return {
      totalScans,
      successful,
      failed,
      breakdown,
      scanHistory,
      totalVisits,
      visits,
    };
  }
}

export const reportService = new ReportService();
