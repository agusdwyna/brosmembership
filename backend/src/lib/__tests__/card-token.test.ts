import { describe, it, expect } from 'vitest';
import { extractCardToken } from '../card-token';

const TOKEN = 'b'.repeat(64);

describe('extractCardToken', () => {
  it('returns a raw token unchanged', () => {
    expect(extractCardToken(TOKEN)).toBe(TOKEN);
  });

  it('extracts the token from a public card URL', () => {
    expect(extractCardToken(`https://bros.test/c/${TOKEN}`)).toBe(TOKEN);
    expect(extractCardToken(`https://bros.test/c/${TOKEN}/?from=qr`)).toBe(TOKEN);
  });

  it('accepts uppercase tokens', () => {
    expect(extractCardToken(`https://bros.test/c/${TOKEN.toUpperCase()}`)).toBe(
      TOKEN.toUpperCase(),
    );
  });

  it('leaves NIK and member numbers alone', () => {
    expect(extractCardToken('3201234567890123')).toBe('3201234567890123');
    expect(extractCardToken('M-000001')).toBe('M-000001');
  });

  it('trims scanner whitespace', () => {
    expect(extractCardToken(`  ${TOKEN}  `)).toBe(TOKEN);
  });
});
