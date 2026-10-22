import { format } from 'date-fns';

/**
 * Single source of truth for how dates are shown to operators.
 *
 * dd/MM/yyyy is used everywhere (not the locale default) so a date like
 * 05/12/2026 always reads as 5 December — never 12 May. Change the constants
 * here rather than individual call sites.
 */
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm';
/** Machine format required by `<input type="date">` and the API. Never display it. */
export const DATE_INPUT_FORMAT = 'yyyy-MM-dd';

/**
 * The business timezone: WITA (Makassar/Bali, UTC+8).
 *
 * Formatting is pinned to it instead of the browser's zone. A member's
 * membership starts at midnight WITA, which is 16:00 UTC the day before; a
 * machine (or operator laptop) set to UTC would otherwise show the expiry a day
 * early. The api container runs with TZ=Asia/Makassar for the same reason.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Makassar';

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Add whole days on the UTC calendar, which is the same calendar WITA is on
 * (no DST, whole-hour offset). `+ days * 86400000` would break at a DST
 * transition; `setUTCDate` cannot.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Renders `21/10/2026` in WITA; returns `fallback` for missing or invalid input. */
export function formatDate(value: DateInput, fallback = '-'): string {
  const date = toDate(value);
  return date ? businessDateParts(date).join('/') : fallback;
}

/** Renders `21/10/2026 14:35` in WITA. */
export function formatDateTime(value: DateInput, fallback = '-'): string {
  const date = toDate(value);
  if (!date) return fallback;
  const [day, month, year] = businessDateParts(date);
  return `${day}/${month}/${year} ${businessTime(date)}`;
}

/**
 * Value for the machine end of a date field (`2026-10-21`), in WITA.
 * `toISOString()` would be UTC and read as the previous day before 08:00 WITA.
 */
export function toDateInputValue(value: DateInput): string {
  const date = toDate(value);
  if (!date) return '';
  const [day, month, year] = businessDateParts(date);
  return `${year}-${month}-${day}`;
}

/** `[dd, MM, yyyy]` as seen in WITA. */
function businessDateParts(date: Date): [string, string, string] {
  // en-CA renders as YYYY-MM-DD. Some ICU builds pad with a different separator,
  // so pull the digits out rather than trusting the exact string.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return [get('day'), get('month'), get('year')];
}

function businessTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * The form the operator types into: `21/10/2026`.
 *
 * `<input type="date">` always renders in the browser's locale, so it cannot be
 * forced to day-first. The app therefore uses a text field with this format and
 * converts to the API's `YYYY-MM-DD` on submit.
 */
export function toDisplayDate(value: DateInput): string {
  const date = toDate(value);
  return date ? format(date, DATE_FORMAT) : '';
}

/**
 * Parse `dd/MM/yyyy` (also accepts `d/M/yyyy`). Returns the canonical
 * `YYYY-MM-DD`, or null when the input is not a real date.
 *
 * Out-of-range days are rejected rather than rolled over: `31/02/2026` must be
 * an error, not 3 March, or a typo silently becomes a different expiry date.
 */
export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? format(date, DATE_INPUT_FORMAT) : null;
}

/**
 * Reformat as the operator types: digits only, slashes inserted after the day
 * and month. Typing `21102026` becomes `21/10/2026`, but a trailing slash is
 * preserved so the operator can keep typing.
 */
export function maskDisplayDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  let result = day;
  if (digits.length > 2 || (value.endsWith('/') && day.length === 2)) result += '/';
  if (month) result += month;
  if (digits.length > 4 || (value.endsWith('/') && month.length === 2)) result += '/';
  if (year) result += year;
  return result;
}
