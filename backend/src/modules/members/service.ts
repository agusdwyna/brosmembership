import { prisma } from '../../config/database';
import type { CreateMemberInput, UpdateMemberInput } from './schema';
import { createHash } from 'crypto';
import { activityLogService } from '../activity-log/service';
import { LIST_LIMIT } from '../../lib/query';
import { generateCardNumber, generateMemberNumber, retryOnUnique } from '../../lib/numbering';

function generateQrHash(nik: string, memberNumber: string): string {
  return createHash('sha256').update(`${nik}${memberNumber}`).digest('hex');
}

/**
 * The company picker sends '' when cleared (or when the member has no company).
 * Prisma needs null for an empty FK — an empty string is not a valid reference.
 */
function normalizeCompanyId<T extends { companyId?: string }>(
  input: T,
): Omit<T, 'companyId'> & { companyId?: string | null } {
  return input.companyId === '' ? { ...input, companyId: null } : input;
}

class MemberService {
  async list(search?: string) {
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { memberNumber: { contains: search, mode: 'insensitive' as const } },
            { nik: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    return prisma.member.findMany({
      where,
      include: {
        company: { select: { id: true, code: true, name: true } },
        memberships: {
          include: {
            membershipType: true,
            // cardTemplate must be included: the PDF export builds each card
            // from the template's sides/elements, and the frontend skips any
            // card whose cardTemplate is missing. Only the newest card is
            // needed, so `take: 1` keeps this list query from also pulling
            // every historical card and its elements.
            cards: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                cardTemplate: {
                  include: { sides: { include: { elements: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async getById(id: string) {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        company: true,
        memberships: {
          include: {
            membershipType: true,
            cards: {
              include: {
                cardTemplate: {
                  include: { sides: { include: { elements: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        scanHistory: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!member) throw Object.assign(new Error('Member tidak ditemukan'), { status: 404 });
    return member;
  }

  async create(input: CreateMemberInput, performedBy: string) {
    // Read-only lookups first: membership type + the template to print.
    const membershipType = await prisma.membershipType.findUnique({
      where: { id: input.membershipTypeId },
      include: { defaultCardTemplate: true },
    });
    if (!membershipType)
      throw Object.assign(new Error('Membership type not found'), { status: 404 });
    if (membershipType.status !== 'ACTIVE')
      throw Object.assign(new Error('Membership type is not active'), { status: 400 });

    // A type may still point at a template that was later deactivated. Treat
    // that as "no default" and fall through, rather than printing retired art.
    let cardTemplateId =
      membershipType.defaultCardTemplate?.status === 'ACTIVE'
        ? membershipType.defaultCardTemplateId
        : null;

    // Fall back to the oldest ACTIVE template. The filter matters: without it a
    // deactivated template would be handed out silently, contradicting the
    // picker UI which only ever offers active templates.
    if (!cardTemplateId) {
      const fallbackTemplate = await prisma.cardTemplate.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
      if (!fallbackTemplate)
        throw Object.assign(
          new Error('Tidak ada template kartu aktif. Buat atau aktifkan template terlebih dahulu.'),
          { status: 400 },
        );
      cardTemplateId = fallbackTemplate.id;
    }

    const endDate = new Date(input.startDate);
    endDate.setDate(endDate.getDate() + membershipType.duration);

    // Numbers are derived from a row count, so generate them INSIDE the
    // transaction and retry the whole write if a unique constraint trips — two
    // concurrent registrations can otherwise pick the same number.
    const result = await retryOnUnique(() =>
      prisma.$transaction(async (tx) => {
        const memberNumber = await generateMemberNumber(tx);
        const cardNumber = await generateCardNumber(tx);
        const qrHash = generateQrHash(input.nik, memberNumber);

        const member = await tx.member.create({
          data: {
            memberNumber,
            nik: input.nik,
            qrHash,
            fullName: input.fullName,
            phone: input.phone,
            email: input.email || null,
            photo: input.photo,
            address: input.address,
            dateOfBirth: input.dateOfBirth || null,
            companyId: input.companyId || null,
          },
        });

        const membership = await tx.membership.create({
          data: {
            memberId: member.id,
            membershipTypeId: input.membershipTypeId,
            startDate: input.startDate,
            endDate,
          },
        });

        const card = await tx.membershipCard.create({
          data: {
            membershipId: membership.id,
            cardNumber,
            cardTemplateId,
          },
        });

        return { member, membership, card };
      }),
    );

    // Log activity
    await activityLogService.log({
      memberId: result.member.id,
      action: 'ASSIGN',
      description: `Member ${result.member.memberNumber} registered with ${membershipType.name} membership`,
      newValue: membershipType.name,
      performedBy,
    });

    return this.getById(result.member.id);
  }

  async update(id: string, input: UpdateMemberInput) {
    const existing = await this.getById(id);

    const data: Record<string, unknown> = normalizeCompanyId({ ...input });

    // Regenerate qrHash if NIK changes
    if (input.nik && input.nik !== existing.nik) {
      data.qrHash = generateQrHash(input.nik, existing.memberNumber);
    }

    return prisma.member.update({
      where: { id },
      data,
      include: {
        company: true,
        memberships: {
          include: { membershipType: true, cards: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.member.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async activate(id: string) {
    await this.getById(id);
    return prisma.member.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }
}

export const memberService = new MemberService();
