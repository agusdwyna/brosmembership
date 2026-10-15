import { z } from 'zod';

export const createMemberSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  nik: z
    .string()
    .min(16, 'NIK harus 16 digit')
    .max(16, 'NIK harus 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  photo: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z
    .string()
    .transform((v) => new Date(v))
    .optional(),
  companyId: z.string().optional(),
  membershipTypeId: z.string().min(1, 'Membership type wajib dipilih'),
  startDate: z.string().transform((v) => new Date(v)),
});

export const updateMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  nik: z
    .string()
    .min(16, 'NIK harus 16 digit')
    .max(16, 'NIK harus 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka')
    .optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  photo: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z
    .string()
    .transform((v) => new Date(v))
    .optional(),
  companyId: z.string().optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
