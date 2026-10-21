import { prisma } from '../../config/database';
import {
  importMemberRowSchema,
  type CreateMemberInput,
  type ImportMemberRow,
  type UpdateMemberInput,
} from './schema';
import { activityLogService } from '../activity-log/service';
import { LIST_LIMIT } from '../../lib/query';
import { generateCardNumber, generateMemberNumber, retryOnUnique } from '../../lib/numbering';
import { generateQrToken, hashNik, last4Nik } from '../../lib/nik';

/** Best-effort row number from a row that failed schema validation. */
function rowNumberFrom(row: unknown): number | undefined {
  if (typeof row === 'object' && row !== null && 'rowNumber' in row) {
    const value = (row as { rowNumber: unknown }).rowNumber;
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  }
  return undefined;
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
  /**
   * @param deleted When true, list only soft-deleted members instead of active
   *   ones — the "Terhapus" filter, which is how a member is restored.
   */
  async list(search?: string, deleted = false) {
    const deletedFilter = deleted ? { not: null } : null;
    const where = search
      ? {
          deletedAt: deletedFilter,
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { memberNumber: { contains: search, mode: 'insensitive' as const } },
            // NIK itself is not stored, so only the last four digits are
            // searchable. A full NIK still resolves through the scanner.
            { nikLast4: { contains: search } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { deletedAt: deletedFilter };

    return prisma.member.findMany({
      where,
      // The HMAC is an internal index, not data for the client. `omit` keeps
      // every other column without listing them all here.
      omit: { nikHash: true },
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
      omit: { nikHash: true },
      include: {
        company: true,
        memberships: {
          include: {
            membershipType: true,
            cards: {
              // Newest first: the UI treats cards[0] as the current card and
              // lists the rest as card history.
              orderBy: { createdAt: 'desc' },
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

  async create(
    input: CreateMemberInput,
    performedBy: string,
    options: { withDetail?: boolean } = {},
  ) {
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
        const qrHash = generateQrToken();

        const member = await tx.member.create({
          data: {
            memberNumber,
            nikHash: hashNik(input.nik),
            nikLast4: last4Nik(input.nik),
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

    // Callers that only need the created row (bulk import) skip the full read.
    if (options.withDetail === false) return result.member;

    return this.getById(result.member.id);
  }

  /**
   * Bulk import for the Excel/CSV flow — partial by design.
   *
   * One bad row must never block the batch: each row is validated on its own
   * against `importMemberRowSchema`, and a row that fails (bad date, missing
   * type, invalid NIK, arbitrary Prisma error) is reported and skipped while
   * the rest are saved. Doing this here — rather than in the route's
   * `validate()` — is what makes that possible; whole-body validation would
   * reject the entire request on the first malformed line.
   *
   * Duplicates are checked twice: against the file itself (two rows with the
   * same NIK, both skipped so neither is silently chosen) and against the
   * database (already-registered NIK). The database check goes through
   * `nikHash` because the plaintext NIK is not stored.
   */
  async importMany(rows: unknown[], performedBy: string) {
    const failed: { rowNumber: number; message: string }[] = [];
    const valid: ImportMemberRow[] = [];

    for (const [index, raw] of rows.entries()) {
      const result = importMemberRowSchema.safeParse(raw);
      if (!result.success) {
        failed.push({
          // Fall back to the position in the request when the row is so broken
          // that even `rowNumber` is missing.
          rowNumber: rowNumberFrom(raw) ?? index + 2,
          message: result.error.errors.map((e) => e.message).join(', '),
        });
        continue;
      }
      valid.push(result.data);
    }

    // Duplicates inside the file: keep the first occurrence, reject the rest
    // with a message that names the earlier line.
    const seen = new Map<string, number>();
    const duplicateRows = new Map<number, string>();
    for (const row of valid) {
      const first = seen.get(row.nik);
      if (first !== undefined) {
        duplicateRows.set(row.rowNumber, `NIK ${row.nik} duplikat dengan baris ${first}`);
      } else {
        seen.set(row.nik, row.rowNumber);
      }
    }

    // NIKs already in the database, so those rows fail with a clear reason
    // rather than a generic P2002. Soft-deleted members count too: their NIK is
    // still reserved, so registering the person again while they sit in the
    // trash would hit the unique index anyway.
    const existing = await prisma.member.findMany({
      where: { nikHash: { in: [...seen.keys()].map(hashNik) } },
      select: { nikHash: true },
    });
    const takenHashes = new Set(existing.map((m) => m.nikHash));

    const created: string[] = [];

    for (const row of valid) {
      const duplicateMessage = duplicateRows.get(row.rowNumber);
      if (duplicateMessage) {
        failed.push({ rowNumber: row.rowNumber, message: duplicateMessage });
        continue;
      }
      if (takenHashes.has(hashNik(row.nik))) {
        failed.push({ rowNumber: row.rowNumber, message: `NIK ${row.nik} sudah terdaftar` });
        continue;
      }

      try {
        // `create` ends with getById(), which re-reads the member with every
        // membership, card, template side/element and the latest 50 scans. That
        // payload is needed by the single-registration screen but not here, and
        // repeating it 500× would dominate the import's runtime.
        const { id } = await this.create(row, performedBy, { withDetail: false });
        created.push(id);
      } catch (err) {
        failed.push({ rowNumber: row.rowNumber, message: (err as Error).message });
      }
    }

    failed.sort((a, b) => a.rowNumber - b.rowNumber);
    return { created: created.length, failed };
  }

  async update(id: string, input: UpdateMemberInput) {
    await this.getById(id);

    const data: Record<string, unknown> = normalizeCompanyId({ ...input });

    // The form cannot show the current NIK, so it sends `nik` only when the
    // operator types a replacement. Store the hash/last4 instead, and never
    // touch `qrHash`: it is now a random token, unrelated to the NIK, and
    // regenerating it would invalidate a card that is already printed.
    if (input.nik) {
      data.nikHash = hashNik(input.nik);
      data.nikLast4 = last4Nik(input.nik);
    }
    delete data.nik;

    return prisma.member.update({
      where: { id },
      data,
      omit: { nikHash: true },
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
      omit: { nikHash: true },
    });
  }

  async activate(id: string) {
    await this.getById(id);
    return prisma.member.update({
      where: { id },
      data: { status: 'ACTIVE' },
      omit: { nikHash: true },
    });
  }

  /**
   * Soft delete. The row and its memberships/cards/history stay in the database;
   * the member simply stops appearing in lists, search and the scanner.
   *
   * `nikHash` and `qrHash` are deliberately kept: the NIK stays reserved (so the
   * same person cannot be registered twice by accident) and a restore brings
   * back the existing card. A real removal is a hard delete in the database,
   * which cascades through memberships, cards, visits and scan history.
   */
  async softDelete(id: string, performedBy: string) {
    const member = await this.getById(id);
    if (member.deletedAt) {
      throw Object.assign(new Error('Member sudah dihapus'), { status: 400 });
    }

    const deleted = await prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
      omit: { nikHash: true },
    });

    await activityLogService.log({
      memberId: member.id,
      action: 'DELETE_MEMBER',
      description: `Member ${member.memberNumber} (${member.fullName}) dihapus`,
      oldValue: member.status,
      performedBy,
    });

    return deleted;
  }

  /** Undo a soft delete; the existing memberships and cards become usable again. */
  async restore(id: string, performedBy: string) {
    const member = await this.getById(id);
    if (!member.deletedAt) {
      throw Object.assign(new Error('Member tidak dalam status terhapus'), { status: 400 });
    }

    const restored = await prisma.member.update({
      where: { id },
      data: { deletedAt: null },
      omit: { nikHash: true },
    });

    await activityLogService.log({
      memberId: member.id,
      action: 'RESTORE_MEMBER',
      description: `Member ${member.memberNumber} (${member.fullName}) dipulihkan`,
      performedBy,
    });

    return restored;
  }
}

export const memberService = new MemberService();
