import { prisma } from '../../config/database';
import { settingsService } from '../settings/service';

class DashboardService {
  async getSummary() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiringSoonDays = await settingsService.getNumber('expiringSoonDays', 30);
    const expiringSoonUntil = new Date(now);
    expiringSoonUntil.setDate(expiringSoonUntil.getDate() + expiringSoonDays);

    // Last 12 months for growth chart
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = start.toLocaleString('en', { month: 'short', year: '2-digit' });
      months.push({ label, start, end });
    }

    // Last 4 weeks for weekly view
    const weeks: { label: string; start: Date; end: Date }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - (i * 7 + 6));
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const label = `W${4 - i}`;
      weeks.push({ label, start, end });
    }

    const [
      totalMembers,
      activeMemberships,
      expiringSoon,
      todayScans,
      newThisMonth,
      recentVerifications,
      membershipOverview,
      membershipByType,
      memberStatusCounts,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.membership.count({ where: { status: 'ACTIVE' } }),
      prisma.membership.count({
        where: { status: 'ACTIVE', endDate: { gte: now, lte: expiringSoonUntil } },
      }),
      prisma.scanHistory.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.member.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.scanHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { memberNumber: true, fullName: true } },
          membership: { select: { status: true } },
          officer: { select: { name: true } },
        },
      }),
      prisma.membership.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.membership.groupBy({
        by: ['membershipTypeId'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
      prisma.member.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // Resolve membership type names
    const typeIds = membershipByType.map((m) => m.membershipTypeId);
    const types = await prisma.membershipType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true },
    });
    const typeNameMap = new Map(types.map((t) => [t.id, t.name]));

    // Monthly growth
    const monthlyGrowth = await Promise.all(
      months.map(async (m) => ({
        label: m.label,
        count: await prisma.member.count({
          where: { createdAt: { gte: m.start, lte: m.end } },
        }),
      })),
    );

    // Weekly growth
    const weeklyGrowth = await Promise.all(
      weeks.map(async (w) => ({
        label: w.label,
        count: await prisma.member.count({
          where: { createdAt: { gte: w.start, lte: w.end } },
        }),
      })),
    );

    const activeCount = memberStatusCounts.find((m) => m.status === 'ACTIVE')?._count.id || 0;
    const totalAll = memberStatusCounts.reduce((sum, m) => sum + m._count.id, 0);
    const utilization = totalAll > 0 ? Math.round((activeCount / totalAll) * 1000) / 10 : 0;

    return {
      totalMembers,
      activeMemberships,
      expiringSoon,
      todayScans,
      newThisMonth,
      utilization,
      membershipOverview: membershipOverview.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
      membershipByType: membershipByType
        .map((item) => ({
          name: typeNameMap.get(item.membershipTypeId) || 'Unknown',
          count: item._count.id,
        }))
        .sort((a, b) => b.count - a.count),
      monthlyGrowth,
      weeklyGrowth,
      recentVerifications,
    };
  }
}

export const dashboardService = new DashboardService();
