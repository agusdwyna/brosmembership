import { prisma } from '../../config/database';
import { hashNik, maskNik } from '../../lib/nik';
import type { VerifyInput } from './schema';

interface MemberRef {
  id: string;
  memberNumber: string;
  nikLast4: string | null;
  qrHash: string | null;
  fullName: string;
}

interface MembershipRef {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date;
  membershipType: { name: string; status: string };
}

interface CardRef {
  id: string;
  cardNumber: string;
}

export type VerifyResult =
  'VALID' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'INACTIVE' | 'NOT_FOUND';

interface VerificationResponse {
  result: VerifyResult;
  reason?: string;
  /** Id of the created scan_history row, so the UI can link a follow-up visit. */
  scanId?: string;
  member?: {
    id: string;
    memberNumber: string;
    /** Masked form (`••••••••••••0001`); the full NIK is never returned. */
    nikMasked: string | null;
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
      const scanId = await this.recordScan(
        null,
        null,
        'NOT_FOUND',
        'Member tidak ditemukan',
        input.scannerMethod,
        officerId,
      );
      return { result: 'NOT_FOUND', reason: 'Member tidak ditemukan', scanId };
    }

    // A deactivated member must not validate, even with an active-looking card.
    if (member.status !== 'ACTIVE') {
      const scanId = await this.recordScan(
        member.id,
        null,
        'INACTIVE',
        'Member tidak aktif',
        input.scannerMethod,
        officerId,
      );
      return {
        result: 'INACTIVE',
        reason: 'Member tidak aktif',
        member: this.mapMember(member),
        scanId,
      };
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
      const scanId = await this.recordScan(
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
        scanId,
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

    // A retired membership type must not validate either.
    if (membership.membershipType.status !== 'ACTIVE') {
      const scanId = await this.recordScan(
        member.id,
        membership.id,
        'INACTIVE',
        'Tipe membership tidak aktif',
        input.scannerMethod,
        officerId,
      );
      return {
        result: 'INACTIVE',
        reason: 'Tipe membership tidak aktif',
        member: this.mapMember(member),
        membership: this.mapMembership(membership),
        scanId,
        ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
      };
    }

    // SUSPENDED
    if (membership.status === 'SUSPENDED') {
      const scanId = await this.recordScan(
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
        scanId,
        ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
      };
    }

    // CANCELLED
    if (membership.status === 'CANCELLED') {
      const scanId = await this.recordScan(
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
        scanId,
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
      const scanId = await this.recordScan(
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
        scanId,
        ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
      };
    }

    // VALID
    const scanId = await this.recordScan(
      member.id,
      membership.id,
      'VALID',
      null,
      input.scannerMethod,
      officerId,
    );
    return {
      result: 'VALID',
      member: this.mapMember(member),
      membership: this.mapMembership(membership),
      scanId,
      ...(card && template ? { card: { ...this.mapCard(card), template } } : {}),
    };
  }

  private async findMember(token: string) {
    // Every lookup uses findFirst rather than findUnique because deleted
    // members must not resolve. Their unique columns are also tombstoned on
    // delete, but this keeps the rule explicit and survives a manual restore.

    // 1. Try by qrHash — the QR payload IS the stored hash, so compare it
    // directly. Do NOT hash again: hashing here would look up sha256(qrHash),
    // which never matches what members/service.ts stored.
    let member = await prisma.member.findFirst({
      where: { qrHash: token, deletedAt: null },
    });
    if (member) return member;

    // 2. Try by memberNumber
    member = await prisma.member.findFirst({
      where: { memberNumber: token, deletedAt: null },
    });
    if (member) return member;

    // 3. Try by NIK — only its HMAC is stored, so hash the typed value first.
    member = await prisma.member.findFirst({
      where: { nikHash: hashNik(token), deletedAt: null },
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
  ): Promise<string> {
    const scan = await prisma.scanHistory.create({
      data: { memberId, membershipId, result, reason, scannerMethod, officerId },
    });
    return scan.id;
  }

  private mapMember(member: MemberRef) {
    return {
      id: member.id,
      memberNumber: member.memberNumber,
      nikMasked: maskNik(member.nikLast4),
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
