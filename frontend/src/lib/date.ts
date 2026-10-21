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
 * Value for `<input type="date">` (`2026-10-21`). Formatting locally matters:
 * `toISOString()` converts to UTC, which yields yesterday before 07:00 WIB.
 */
export function toDateInputValue(value: DateInput): string {
  const date = toDate(value);
  return date ? format(date, DATE_INPUT_FORMAT) : '';
}
