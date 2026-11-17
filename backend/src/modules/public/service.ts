import { prisma } from '../../config/database';
import { hashNik } from '../../lib/nik';
import { extractCardToken } from '../../lib/card-token';

export type PublicValidity = 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'INACTIVE';

interface PublicCardSide {
  id: string;
  side: string;
  designUrl: string | null;
  elements: {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number | null;
    fontWeight: string | null;
    alignment: string | null;
    color: string | null;
  }[];
}

export interface PublicCardResponse {
  member: {
    fullName: string;
    memberNumber: string;
    /** Needed by the renderer to build the QR; it is the URL token itself. */
    qrHash: string | null;
    photo: string | null;
  };
  membership: {
    status: string;
    startDate: Date;
    endDate: Date;
    typeName: string;
  };
  validity: PublicValidity;
  card: {
    templateVersion: number;
    template: {
      name: string;
      sides: PublicCardSide[];
    };
  };
}

/** Deliberately generic: callers must not learn whether a NIK exists or not. */
function notFound(): Error {
  return Object.assign(new Error('Kartu tidak ditemukan'), { status: 404 });
}

function computeValidity(
  memberStatus: string,
  membershipStatus: string,
  typeStatus: string,
  endDate: Date,
): PublicValidity {
  if (memberStatus !== 'ACTIVE' || typeStatus !== 'ACTIVE') return 'INACTIVE';
  if (membershipStatus === 'SUSPENDED') return 'SUSPENDED';
  if (membershipStatus === 'CANCELLED') return 'CANCELLED';
  if (membershipStatus === 'EXPIRED' || new Date() > endDate) return 'EXPIRED';
  return 'VALID';
}

export class PublicCardService {
  /** Public link / QR token. Accepts a raw token or the full public URL. */
  async getByToken(rawToken: string): Promise<PublicCardResponse> {
    const token = extractCardToken(rawToken);
    const member = await prisma.member.findFirst({
      where: { qrHash: token, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw notFound();
    return this.getByMemberId(member.id);
  }

  /** NIK path, for members whose card has not been shared yet. */
  async getByNik(nik: string): Promise<PublicCardResponse> {
    // Only the HMAC is stored; the plaintext NIK never reaches the database.
    const member = await prisma.member.findFirst({
      where: { nikHash: hashNik(nik), deletedAt: null },
      select: { id: true },
    });
    if (!member) throw notFound();
    return this.getByMemberId(member.id);
  }

  private async getByMemberId(memberId: string): Promise<PublicCardResponse> {
    const member = await prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: {
        fullName: true,
        memberNumber: true,
        qrHash: true,
        photo: true,
        status: true,
        memberships: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            startDate: true,
            endDate: true,
            membershipType: { select: { name: true, status: true } },
            cards: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                templateVersion: true,
                cardTemplate: {
                  select: {
                    name: true,
                    sides: {
                      select: {
                        id: true,
                        side: true,
                        designUrl: true,
                        elements: {
                          select: {
                            id: true,
                            type: true,
                            x: true,
                            y: true,
                            width: true,
                            height: true,
                            fontSize: true,
                            fontWeight: true,
                            alignment: true,
                            color: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!member) throw notFound();

    const membership = member.memberships[0];
    const card = membership?.cards[0];
    if (!membership || !card) throw notFound();

    return {
      member: {
        fullName: member.fullName,
        memberNumber: member.memberNumber,
        qrHash: member.qrHash,
        photo: member.photo,
      },
      membership: {
        status: membership.status,
        startDate: membership.startDate,
        endDate: membership.endDate,
        typeName: membership.membershipType.name,
      },
      validity: computeValidity(
        member.status,
        membership.status,
        membership.membershipType.status,
        membership.endDate,
      ),
      card: {
        templateVersion: card.templateVersion,
        template: {
          name: card.cardTemplate.name,
          sides: card.cardTemplate.sides.map((side) => ({
            id: side.id,
            side: side.side,
            designUrl: side.designUrl,
            elements: side.elements.map((el) => ({
              id: el.id,
              type: el.type,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              fontSize: el.fontSize,
              fontWeight: el.fontWeight,
              alignment: el.alignment,
              color: el.color,
            })),
          })),
        },
      },
    };
  }
}

export const publicCardService = new PublicCardService();
