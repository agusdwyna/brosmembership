import { Prisma } from '@prisma/client';
import { settingsService } from '../modules/settings/service';

/** Any Prisma client: the base client or a transaction client. */
type Db = Prisma.TransactionClient;

/**
 * Next numeric suffix for a prefix-scoped sequence.
 *
 * The suffix comes from the highest number already issued for this prefix, NOT
 * from `count()`. Counting breaks after any hard delete: removing one row makes
 * the next number equal to an existing one, and every retry then regenerates
 * the same collision, so registrations fail until someone adds a row back.
 *
 * Ordering by length then lexicographically is exact for zero-padded strings
 * and avoids casting a customer-editable prefix (which may contain digits).
 * Table/column are code-owned literals, never client input.
 */
async function nextSuffix(
  tx: Db,
  spec: { table: 'members' | 'membership_cards'; column: 'memberNumber' | 'cardNumber' },
  prefix: string,
  suffixLength: number,
) {
  const rows = await tx.$queryRawUnsafe<{ number: string }[]>(
    `SELECT "${spec.column}" AS number FROM "${spec.table}"
       WHERE "${spec.column}" LIKE $1 || '%'
       ORDER BY length("${spec.column}") DESC, "${spec.column}" DESC
       LIMIT 1`,
    prefix,
  );

  const last = rows[0]?.number;
  if (!last) return '1'.padStart(suffixLength, '0');

  const suffix = Number(last.slice(prefix.length));
  if (!Number.isFinite(suffix)) return '1'.padStart(suffixLength, '0');
  return String(suffix + 1).padStart(suffixLength, '0');
}

/**
 * Retry a transaction when a generated member/card number collides.
 *
 * Only `memberNumber`/`cardNumber` are retried. Every other unique violation —
 * most importantly a duplicate NIK — is a real client error that re-running can
 * never fix; retrying it just repeated five full transactions before surfacing
 * a generic message.
 */
export function retryOnUnique<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  return (async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt >= attempts || !isSequenceCollision(err)) throw err;
      }
    }
  })();
}

/** The columns named by a P2002 (unique constraint) error, if any. */
function uniqueTarget(err: unknown): string[] {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return [];
  const target = err.meta?.target;
  return Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
}

/** A P2002 whose unique target is a generated number, not an intrinsic column. */
export function isSequenceCollision(err: unknown): boolean {
  return uniqueTarget(err).some((f) => f === 'memberNumber' || f === 'cardNumber');
}

/** True when `err` is a unique violation on `column`. */
export function isUniqueViolationOf(err: unknown, column: string): boolean {
  return uniqueTarget(err).includes(column);
}

export async function generateMemberNumber(tx: Db): Promise<string> {
  const customPrefix = await settingsService.getString('memberNumberPrefix');
  const reset = await settingsService.getString('memberNumberReset');

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const datePart = reset === 'MONTHLY' ? `${yy}${mm}` : reset === 'YEARLY' ? yy : '';
  const prefix = `${customPrefix}${datePart}`;

  return `${prefix}${await nextSuffix(tx, { table: 'members', column: 'memberNumber' }, prefix, 6)}`;
}

export async function generateCardNumber(tx: Db): Promise<string> {
  const prefix = await settingsService.getString('cardNumberPrefix');

  return `${prefix}${await nextSuffix(
    tx,
    { table: 'membership_cards', column: 'cardNumber' },
    prefix,
    6,
  )}`;
}
