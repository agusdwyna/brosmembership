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

/**
 * A date the client parsed from a spreadsheet. An unparseable value used to slip
 * through as `Invalid Date` and only fail later inside Prisma, which surfaced as
 * a generic 500; validate here so the offending row gets a readable message.
 */
const importDate = (label: string) =>
  z
    .string()
    .min(1, `${label} wajib diisi`)
    .transform((v) => new Date(v))
    .refine(
      (d) => !Number.isNaN(d.getTime()),
      `${label} tidak valid (gunakan DD/MM/YYYY atau YYYY-MM-DD)`,
    );

/**
 * One spreadsheet row as sent by the import preview. Mirrors `createMemberSchema`
 * so imported rows go through exactly the same member-creation path.
 */
export const importMemberRowSchema = z.object({
  // 1-based row number in the source file, echoed back in failures so the
  // operator can find the bad line.
  rowNumber: z.number().int().positive(),
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  nik: z
    .string()
    .min(16, 'NIK harus 16 digit')
    .max(16, 'NIK harus 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  dateOfBirth: importDate('Tanggal lahir').optional(),
  companyId: z.string().optional(),
  membershipTypeId: z.string().min(1, 'Membership type wajib dipilih'),
  startDate: importDate('Tanggal mulai'),
});

export const importMembersSchema = z.object({
  // Capped: every row is its own transaction plus activity log, and the whole
  // request has to finish within nginx's 60s proxy_read_timeout.
  rows: z
    .array(importMemberRowSchema)
    .min(1, 'Tidak ada baris untuk diimport')
    .max(500, 'Maksimal 500 baris per import'),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ImportMemberRow = z.infer<typeof importMemberRowSchema>;
