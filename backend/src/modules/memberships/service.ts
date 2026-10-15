import { prisma } from '../../config/database';
import type { RenewMembershipInput, ChangeTypeInput } from './schema';
import { activityLogService } from '../activity-log/service';

export class MembershipService {
  async list(memberId?: string) {
    const where = memberId ? { memberId } : {};
    return prisma.membership.findMany({
      where,
      include: {
        member: { select: { id: true, memberNumber: true, nik: true, fullName: true } },
        membershipType: true,
        cards: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const item = await prisma.membership.findUnique({
      where: { id },
      include: {
        member: true,
        membershipType: true,
        cards: { include: { cardTemplate: true } },
      },
    });
    if (!item) throw Object.assign(new Error('Membership tidak ditemukan'), { status: 404 });
    return item;
  }

  async changeType(id: string, input: ChangeTypeInput, performedBy: string) {
    const existing = await this.getById(id);
    if (existing.status !== 'ACTIVE') {
      throw Object.assign(new Error('Hanya membership aktif yang bisa diganti tipe-nya'), {
        status: 400,
      });
    }

    const newType = await prisma.membershipType.findUnique({
      where: { id: input.membershipTypeId },
    });
    if (!newType)
      throw Object.assign(new Error('Membership type tidak ditemukan'), { status: 404 });
    if (newType.status !== 'ACTIVE')
      throw Object.assign(new Error('Membership type tidak aktif'), { status: 400 });

    const oldTypeName = existing.membershipType.name;

    // Calculate new end date based on new type duration
    const startDate = new Date(existing.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + newType.duration);

    // Update membership and issue new card (no revoke)
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id },
        data: {
          membershipTypeId: input.membershipTypeId,
          endDate,
        },
      });

      // Issue new card with new template
      const cardTemplateId =
        newType.defaultCardTemplateId || existing.cards[0]?.cardTemplateId || '';
      const cardCount = await tx.membershipCard.count();
      const newCard = await tx.membershipCard.create({
        data: {
          membershipId: updated.id,
          cardNumber: `CARD-${String(cardCount + 1).padStart(6, '0')}`,
          cardTemplateId,
        },
      });

      return { updated, newCard };
    });

    // Log activity
    await activityLogService.log({
      memberId: existing.memberId,
      action: 'CHANGE_TYPE',
      description: `Membership type changed from ${oldTypeName} to ${newType.name}`,
      oldValue: oldTypeName,
      newValue: newType.name,
      performedBy,
    });

    return this.getById(result.updated.id);
  }

  async renew(id: string, input: RenewMembershipInput, performedBy: string) {
    const existing = await this.getById(id);

    const endDate = new Date(input.startDate);
    endDate.setDate(endDate.getDate() + existing.membershipType.duration);

    const cardCount = await prisma.membershipCard.count();
    const cardNumber = `CARD-${String(cardCount + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      if (existing.status === 'ACTIVE') {
        await tx.membership.update({
          where: { id },
          data: { status: 'EXPIRED' },
        });
      }

      const membership = await tx.membership.create({
        data: {
          memberId: existing.memberId,
          membershipTypeId: existing.membershipTypeId,
          startDate: input.startDate,
          endDate,
          status: 'ACTIVE',
        },
      });

      const type = await tx.membershipType.findUnique({
        where: { id: existing.membershipTypeId },
      });

      const card = await tx.membershipCard.create({
        data: {
          membershipId: membership.id,
          cardNumber,
          cardTemplateId: type?.defaultCardTemplateId || existing.cards[0]?.cardTemplateId || '',
        },
      });

      return { membership, card };
    });

    // Log activity
    await activityLogService.log({
      memberId: existing.memberId,
      action: 'RENEW',
      description: `Membership renewed with type ${existing.membershipType.name}`,
      oldValue: existing.status,
      newValue: 'ACTIVE',
      performedBy,
    });

    return this.getById(result.membership.id);
  }

  async suspend(id: string, performedBy: string) {
    const item = await this.getById(id);
    if (item.status !== 'ACTIVE') {
      throw Object.assign(new Error('Hanya membership aktif yang dapat ditangguhkan'), {
        status: 400,
      });
    }

    const result = await prisma.membership.update({ where: { id }, data: { status: 'SUSPENDED' } });

    await activityLogService.log({
      memberId: item.memberId,
      action: 'SUSPEND',
      description: `Membership suspended`,
      oldValue: 'ACTIVE',
      newValue: 'SUSPENDED',
      performedBy,
    });

    return result;
  }

  async cancel(id: string, performedBy: string) {
    const item = await this.getById(id);
    if (['CANCELLED', 'EXPIRED'].includes(item.status)) {
      throw Object.assign(new Error('Membership sudah tidak aktif'), { status: 400 });
    }

    const result = await prisma.membership.update({ where: { id }, data: { status: 'CANCELLED' } });

    await activityLogService.log({
      memberId: item.memberId,
      action: 'CANCEL',
      description: `Membership cancelled`,
      oldValue: item.status,
      newValue: 'CANCELLED',
      performedBy,
    });

    return result;
  }
}

export const membershipService = new MembershipService();
