import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../error';

const apiError = (data: unknown) => ({ response: { data } });

describe('getErrorMessage', () => {
  it('falls back when the error has no response body', () => {
    expect(getErrorMessage(new Error('network'), 'Gagal')).toBe('Gagal');
    expect(getErrorMessage(apiError(undefined), 'Gagal')).toBe('Gagal');
  });

  it('returns the server message when there are no details', () => {
    expect(getErrorMessage(apiError({ error: 'NIK sudah terdaftar' }), 'Gagal')).toBe(
      'NIK sudah terdaftar',
    );
  });

  it('appends the first validation field so the operator knows what to fix', () => {
    const err = apiError({
      error: 'Validasi gagal',
      details: [{ field: 'email', message: 'Email tidak valid' }],
    });
    expect(getErrorMessage(err, 'Gagal')).toBe('Validasi gagal (email: Email tidak valid)');
  });

  it('works when the detail has no field', () => {
    const err = apiError({
      error: 'Validasi gagal',
      details: [{ field: '', message: 'Wajib diisi' }],
    });
    expect(getErrorMessage(err, 'Gagal')).toBe('Validasi gagal (Wajib diisi)');
  });
});
