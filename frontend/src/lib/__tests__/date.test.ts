import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  toDateInputValue,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  DATE_INPUT_FORMAT,
} from '../date';

describe('date formatting', () => {
  it('uses dd/MM/yyyy so day and month cannot be confused', () => {
    expect(DATE_FORMAT).toBe('dd/MM/yyyy');
    expect(DATE_TIME_FORMAT).toBe('dd/MM/yyyy HH:mm');
  });

  it('renders a day-first date', () => {
    // 5 December — must not render as 12/05.
    expect(formatDate(new Date(2026, 11, 5))).toBe('05/12/2026');
  });

  it('pads single-digit days and months', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('01/01/2026');
  });

  it('renders date and time together', () => {
    expect(formatDateTime(new Date(2026, 9, 21, 14, 35))).toBe('21/10/2026 14:35');
  });

  it('accepts ISO strings from the API', () => {
    expect(formatDate('2026-10-21T00:00:00.000Z')).toBe('21/10/2026');
  });

  it('falls back for missing or invalid values', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
    expect(formatDate('bukan tanggal', 'Belum diisi')).toBe('Belum diisi');
    expect(formatDateTime(null)).toBe('-');
  });
});

describe('date input values', () => {
  it('uses the machine format required by <input type="date">', () => {
    expect(DATE_INPUT_FORMAT).toBe('yyyy-MM-dd');
    expect(toDateInputValue(new Date(2026, 9, 21))).toBe('2026-10-21');
  });

  it('formats locally, so an early-morning date does not shift back a day', () => {
    // 00:30 local time. toISOString() would be the previous day in UTC+7.
    expect(toDateInputValue(new Date(2026, 9, 21, 0, 30))).toBe('2026-10-21');
  });

  it('returns an empty value for missing input', () => {
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue('')).toBe('');
  });
});
