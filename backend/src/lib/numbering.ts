import { Prisma } from '@prisma/client';
import { settingsService } from '../modules/settings/service';

/** Any Prisma client: the base client or a transaction client. */
type Db = Prisma.TransactionClient;

/** The date window a reset-scoped sequence counts within. */
function resetWindow(reset: string, now: Date): { start?: Date; end?: Date } {
  if (reset === 'MONTHLY') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  if (reset === 'YEARLY') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    };
  }
  return {};
}

/**
 * Sequence length is derived from a row count, so two concurrent creates can
 * generate the same number. Callers must run generation inside their
 * transaction and wrap the whole write in `retryOnUnique`, which re-runs the
 * transaction when the unique constraint trips.
 */
export function retryOnUnique<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  return (async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isUnique =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isUnique || attempt >= attempts) throw err;
      }
    }
  })();
}

export async function generateMemberNumber(tx: Db): Promise<string> {
  const customPrefix = await settingsService.getString('memberNumberPrefix');
  const reset = await settingsService.getString('memberNumberReset');

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const datePart = reset === 'MONTHLY' ? `${yy}${mm}` : reset === 'YEARLY' ? yy : '';
  const { start, end } = resetWindow(reset, now);

  const count = await tx.member.count({
    where: start && end ? { createdAt: { gte: start, lte: end } } : undefined,
  });

  return `${customPrefix}${datePart}${String(count + 1).padStart(6, '0')}`;
}

export async function generateCardNumber(tx: Db): Promise<string> {
  const prefix = await settingsService.getString('cardNumberPrefix');
  const reset = await settingsService.getString('cardNumberReset');

  const now = new Date();
  const { start, end } = resetWindow(reset, now);

  const count = await tx.membershipCard.count({
    where: start && end ? { createdAt: { gte: start, lte: end } } : undefined,
  });

  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}
