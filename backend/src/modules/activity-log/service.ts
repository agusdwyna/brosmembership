import { prisma } from '../../config/database';
import { HISTORY_LIMIT } from '../../lib/query';

export type ActivityAction =
  | 'ASSIGN'
  | 'CHANGE_TYPE'
  | 'RENEW'
  | 'SUSPEND'
  | 'CANCEL'
  | 'REVOKE'
  | 'DELETE_MEMBER'
  | 'RESTORE_MEMBER'
  | 'REPLACE'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'RESET_PASSWORD'
  | 'CHANGE_PASSWORD'
  | 'CREATE_ROLE'
  | 'UPDATE_ROLE'
  | 'DELETE_ROLE'
  | 'UPDATE_DATES'
  | 'UPDATE_SETTINGS';

class ActivityLogService {
  async log(params: {
    // Optional: member-scoped actions set it, user/settings actions do not.
    memberId?: string | null;
    action: ActivityAction;
    description: string;
    oldValue?: string;
    newValue?: string;
    performedBy: string;
  }) {
    return prisma.activityLog.create({
      data: {
        memberId: params.memberId ?? null,
        action: params.action,
        description: params.description,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        performedBy: params.performedBy,
      },
    });
  }

  async getByMemberId(memberId: string) {
    return prisma.activityLog.findMany({
      where: { memberId },
      include: {
        officer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      // A member can accumulate an entry per visit; without a ceiling the detail
      // page loads the entire history on every open.
      take: HISTORY_LIMIT,
    });
  }

  async list(filters?: { search?: string; action?: string }) {
    const where: {
      action?: string;
      OR?: { description?: { contains: string; mode: 'insensitive' } }[];
    } = {};

    if (filters?.action) where.action = filters.action;
    if (filters?.search) {
      where.OR = [{ description: { contains: filters.search, mode: 'insensitive' } }];
    }

    return prisma.activityLog.findMany({
      where,
      include: {
        officer: { select: { id: true, name: true } },
        member: { select: { id: true, memberNumber: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
  }
}

export const activityLogService = new ActivityLogService();
