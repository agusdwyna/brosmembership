/**
 * Parse a `YYYY-MM-DD` query value in server-local time (TZ=Asia/Makassar in the
 * container). Exported so every date-filtered endpoint behaves the same:
 * `dateTo` must cover the whole final day instead of stopping at midnight, and
 * a malformed value must be a 400 — not an Invalid Date that Prisma rejects
 * with an opaque 500.
 */
export function parseDateParam(value: string, endOfDay: boolean): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

/**
 * Parse the optional `dateFrom`/`dateTo` query pair. Returns `null` when either
 * value is present but malformed, so the caller can answer 400.
 */
export function parseDateRange(
  dateFrom: unknown,
  dateTo: unknown,
): { from?: Date; to?: Date } | null {
  const from =
    typeof dateFrom === 'string' && dateFrom ? parseDateParam(dateFrom, false) : undefined;
  const to = typeof dateTo === 'string' && dateTo ? parseDateParam(dateTo, true) : undefined;

  if ((dateFrom && !from) || (dateTo && !to)) return null;
  return { from: from ?? undefined, to: to ?? undefined };
}
