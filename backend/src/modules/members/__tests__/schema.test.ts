import { describe, it, expect } from 'vitest';
import { createMemberSchema, updateMemberSchema } from '../schema';

const baseCreate = {
  fullName: 'Budi Santoso',
  nik: '3171234567890001',
  membershipTypeId: 'mt_1',
  startDate: '2026-10-22',
};

describe('createMemberSchema', () => {
  it('accepts a member created without a birth date (the form sends "")', () => {
    const result = createMemberSchema.safeParse({ ...baseCreate, dateOfBirth: '' });
    expect(result.success).toBe(true);
    // Must stay absent: `new Date('')` is an Invalid Date that Prisma rejects.
    if (result.success) expect(result.data.dateOfBirth).toBeUndefined();
  });

  it('parses a provided birth date', () => {
    const result = createMemberSchema.safeParse({ ...baseCreate, dateOfBirth: '1990-05-12' });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.dateOfBirth?.toISOString()).toBe('1990-05-12T00:00:00.000Z');
  });

  it('rejects an unparseable birth date', () => {
    const result = createMemberSchema.safeParse({ ...baseCreate, dateOfBirth: 'bukan tanggal' });
    expect(result.success).toBe(false);
  });

  it('rejects an unparseable start date', () => {
    const result = createMemberSchema.safeParse({ ...baseCreate, startDate: '' });
    expect(result.success).toBe(false);
  });
});

describe('updateMemberSchema', () => {
  it('leaves the birth date untouched when the field is cleared', () => {
    const result = updateMemberSchema.safeParse({ fullName: 'Budi', dateOfBirth: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dateOfBirth).toBeUndefined();
  });
});
