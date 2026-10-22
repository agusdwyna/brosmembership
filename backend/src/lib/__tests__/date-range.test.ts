import { describe, it, expect } from 'vitest';
import { parseDateParam, parseDateRange } from '../date-range';

describe('parseDateParam', () => {
  it('parses a plain date in local time', () => {
    const d = parseDateParam('2026-10-22', false)!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(0);
  });

  it('covers the whole final day when asked for the end', () => {
    const d = parseDateParam('2026-10-22', true)!;
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseDateParam('abc', false)).toBeNull();
    expect(parseDateParam('2026-02-31', false)).toBeNull();
    expect(parseDateParam('22/10/2026', false)).toBeNull();
    expect(parseDateParam('', false)).toBeNull();
  });
});

describe('parseDateRange', () => {
  it('returns undefined bounds when no filter is sent', () => {
    expect(parseDateRange(undefined, undefined)).toEqual({ from: undefined, to: undefined });
  });

  it('parses a supplied range and extends dateTo to end of day', () => {
    const { from, to } = parseDateRange('2026-10-01', '2026-10-22')!;
    expect(from!.getHours()).toBe(0);
    expect(to!.getHours()).toBe(23);
  });

  it('returns null when a present value is malformed', () => {
    expect(parseDateRange('2026-10-01', 'nope')).toBeNull();
    expect(parseDateRange('nope', undefined)).toBeNull();
  });
});
