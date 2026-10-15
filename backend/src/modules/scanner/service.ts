import { prisma } from '../../config/database';
import type { VerifyInput } from './schema';

interface MemberRef {
  id: string;
  memberNumber: string;
  nik: string | null;
  qrHash: string | null;
  fullName: string;
}

interface MembershipRef {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  membershipType: { name: string };
}

interface CardRef {
  id: string;
  cardNumber: string;
}

export type VerifyResult = 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'NOT_FOUND';

interface VerificationResponse {
  result: VerifyResult;
  reason?: string;
  member?: {
    id: string;
    memberNumber: string;
    nik: string | null;
    qrHash: string | null;
    fullName: string;
  };
  membership?: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date;
    typeName: string;
  };
  card?: {
    id: string;
    cardNumber: string;
    template: {
      id: string;
      name: string;
      sides: {
        id: string;
        side: string;
        designUrl?: string | null;
        elements: {
          id: string;
          type: string;
          x: number;
          y: number;
          width: number;
          height: number;
          fontSize?: number | null;
          fontWeight?: string | null;
          alignment?: string | null;
        }[];
      }[];
    };
  };
}

export class ScannerService {
  async verify(input: VerifyInput, officerId: string): Promise<VerificationResponse> {
    // Lookup order: qrHash → memberNumber → NIK
    const member = await this.findMember(input.token);

    // NOT_FOUND
    if (!member) {
      await this.recordScan(
        null,
        null,
        'NOT_FOUND',
        'Member tidak ditemukan',
        input.scannerMethod,
        officerId,
      );
      return { result: 'NOT_FOUND', reason: 'Member tidak ditemukan' };
    }

    // Get latest membership with card and template
    const membership = await prisma.membership.findFirst({
      where: { memberId: member.id },
      include: {
        membershipType: true,
        cards: {
          include: {
            cardTemplate: {
              include: { sides: { include: { elements: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      await this.recordScan(
        member.id,
        null,
        'NOT_FOUND',
        'Membership tidak ditemukan',
        input.scannerMethod,
        officerId,
      );
      return {
        result: 'NOT_FOUND',
        reason: 'Membership tidak ditemukan',
        member: this.mapMember(member),
      };
    }

    const card = membership.cards[0];
    const template = card
      ? {
          id: card.cardTemplate.id,
          name: card.cardTemplate.name,
          sides: card.cardTemplate.sides.map((s) => ({
            id: s.id,
            side: s.side,
            designUrl: s.designUrl,
            elements: s.elements.map((el) => ({
              id: el.id,
              type: el.type,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              fontSize: el.fontSize,
              fontWeight: el.fontWeight,
              alignment: el.alignment,
            })),
          })),
        }
      : undefined;

    // SUSPENDED
    if (membership.status === 'SUSPENDED') {
      await this.recordScan(
        member.id,
        membership.id,
        'SUSPENDED',
        'Membership ditangguhkan',
        input.scannerMethod,
        officerId,
      );
      return {
        result: 'SUSPENDED',
        reason: 'Membership ditangguhkan',
        member: this.mapMember(member),
        membership: this.mapMembership(membership),
        ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
      };
    }

    // CANCELLED
    if (membership.status === 'CANCELLED') {
      await this.recordScan(
        member.id,
        membership.id,
        'CANCELLED',
        'Membership dibatalkan',
        input.scannerMethod,
        officerId,
      );
      return {
        result: 'CANCELLED',
        reason: 'Membership dibatalkan',
        member: this.mapMember(member),
        membership: this.mapMembership(membership),
        ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
      };
    }

    // EXPIRED
    if (membership.status === 'EXPIRED' || new Date() > membership.endDate) {
      if (membership.status === 'ACTIVE' && new Date() > membership.endDate) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'EXPIRED' },
        });
      }
      await this.recordScan(
        member.id,
        membership.id,
        'EXPIRED',
        'Membership telah kedaluwarsa',
        input.scannerMethod,
        officerId,
      );
      return {
        result: 'EXPIRED',
        reason: 'Membership telah kedaluwarsa',
        member: this.mapMember(member),
        membership: this.mapMembership(membership),
        ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
      };
    }

    // VALID
    await this.recordScan(member.id, membership.id, 'VALID', null, input.scannerMethod, officerId);
    return {
      result: 'VALID',
      member: this.mapMember(member),
      membership: this.mapMembership(membership),
      ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
    };
  }

  private async findMember(token: string) {
    // 1. Try by qrHash — the QR payload IS the stored hash, so compare it
    // directly. Do NOT hash again: hashing here would look up sha256(qrHash),
    // which never matches what members/service.ts stored.
    let member = await prisma.member.findUnique({
      where: { qrHash: token },
    });
    if (member) return member;

    // 2. Try by memberNumber
    member = await prisma.member.findUnique({
      where: { memberNumber: token },
    });
    if (member) return member;

    // 3. Try by NIK
    member = await prisma.member.findUnique({
      where: { nik: token },
    });
    return member;
  }

  private async recordScan(
    memberId: string | null,
    membershipId: string | null,
    result: VerifyResult,
    reason: string | null,
    scannerMethod: string,
    officerId: string,
  ) {
    await prisma.scanHistory.create({
      data: { memberId, membershipId, result, reason, scannerMethod, officerId },
    });
  }

  private mapMember(member: MemberRef) {
    return {
      id: member.id,
      memberNumber: member.memberNumber,
      nik: member.nik,
      qrHash: member.qrHash,
      fullName: member.fullName,
    };
  }

  private mapMembership(membership: MembershipRef) {
    return {
      id: membership.id,
      status: membership.status,
      startDate: membership.startDate,
      endDate: membership.endDate,
      typeName: membership.membershipType.name,
    };
  }

  private mapCard(card: CardRef) {
    return { id: card.id, cardNumber: card.cardNumber };
  }
}

export const scannerService = new ScannerService();
