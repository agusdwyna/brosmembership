import { prisma } from '../../config/database';
import { LIST_LIMIT } from '../../lib/query';

export class CardService {
  async list(search?: string) {
    const where = search
      ? {
          OR: [
            { cardNumber: { contains: search, mode: 'insensitive' as const } },
            {
              membership: {
                member: { fullName: { contains: search, mode: 'insensitive' as const } },
              },
            },
          ],
        }
      : {};

    return prisma.membershipCard.findMany({
      where,
      include: {
        membership: {
          include: {
            member: { select: { id: true, memberNumber: true, nik: true, fullName: true } },
            membershipType: true,
          },
        },
        cardTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async getById(id: string) {
    const card = await prisma.membershipCard.findUnique({
      where: { id },
      include: {
        membership: {
          include: {
            member: true,
            membershipType: true,
          },
        },
        cardTemplate: {
          include: {
            sides: {
              include: { elements: true },
            },
          },
        },
      },
    });
    if (!card) throw Object.assign(new Error('Card not found'), { status: 404 });
    return card;
  }

  async getHistoryByMembershipId(membershipId: string) {
    return prisma.membershipCard.findMany({
      where: { membershipId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const cardService = new CardService();
