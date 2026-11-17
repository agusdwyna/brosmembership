import { z } from 'zod';

export const cardTokenParamSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi'),
});

/**
 * Published card lookup by NIK. Same 16-digit rule the members module uses, so
 * a NIK that would be rejected on create is also rejected here.
 */
export const nikLookupSchema = z.object({
  nik: z
    .string()
    .trim()
    .min(16, 'NIK harus 16 digit')
    .max(16, 'NIK harus 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka'),
});
