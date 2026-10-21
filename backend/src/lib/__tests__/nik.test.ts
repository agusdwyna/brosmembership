import { describe, it, expect } from 'vitest';
import { generateQrToken, hashNik, last4Nik, maskNik } from '../nik';

const NIK = '3201234567890123';

describe('hashNik', () => {
  it('is deterministic, so uniqueness and lookup work', () => {
    expect(hashNik(NIK)).toBe(hashNik(NIK));
  });

  it('ignores surrounding whitespace from spreadsheet cells', () => {
    expect(hashNik(`  ${NIK} `)).toBe(hashNik(NIK));
  });

  it('produces different hashes for different NIKs', () => {
    expect(hashNik(NIK)).not.toBe(hashNik('3201234567890124'));
  });

  it('does not embed the plaintext NIK', () => {
    expect(hashNik(NIK)).not.toContain(NIK);
    expect(hashNik(NIK)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('last4Nik / maskNik', () => {
  it('keeps only the last four digits', () => {
    expect(last4Nik(NIK)).toBe('0123');
  });

  it('masks the value for display', () => {
    expect(maskNik('0123')).toBe('••••••••••••0123');
  });

  it('stays null when no NIK is stored', () => {
    expect(maskNik(null)).toBeNull();
    expect(maskNik(undefined)).toBeNull();
  });
});

describe('generateQrToken', () => {
  it('is random, not derived from the NIK', () => {
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
