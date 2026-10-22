/**
 * Add whole days to a date, in local time.
 *
 * `setDate` (not `+ n * 86400000`) is used so a DST transition cannot shift the
 * result by an hour and turn "expires 1 Jan" into "expires 31 Dec".
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** `dd/MM/yyyy` — the one date format the API writes into log descriptions. */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
