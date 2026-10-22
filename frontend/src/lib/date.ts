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

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Add whole days in local time. `setDate` is used instead of
 * `+ days * 86400000` so a DST transition cannot shift the result by an hour and
 * turn an expiry date into the previous day.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Renders `21/10/2026`; returns `fallback` for missing or invalid input. */
export function formatDate(value: DateInput, fallback = '-'): string {
  const date = toDate(value);
  return date ? format(date, DATE_FORMAT) : fallback;
}

/** Renders `21/10/2026 14:35`. */
export function formatDateTime(value: DateInput, fallback = '-'): string {
  const date = toDate(value);
  return date ? format(date, DATE_TIME_FORMAT) : fallback;
}

/**
 * Value for the machine end of a date field (`2026-10-21`). Formatting locally
 * matters: `toISOString()` converts to UTC, which yields yesterday before
 * 07:00 WIB.
 */
export function toDateInputValue(value: DateInput): string {
  const date = toDate(value);
  return date ? format(date, DATE_INPUT_FORMAT) : '';
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
