import { z } from 'zod';

/**
 * Parse a date the form sends as a plain string.
 *
 * `<input type="date">` submits `''` when left untouched, and `new Date('')` is
 * an *Invalid Date* — truthy, so `input.dateOfBirth || null` passed it straight
 * to Prisma and every member created without a birth date failed with a 500.
 * An empty value therefore means "not provided"; a non-empty value that does not
 * parse is rejected with a readable message instead of reaching the database.
 */
const optionalDate = (label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined))
    .refine((d) => d === undefined || !Number.isNaN(d.getTime()), `${label} tidak valid`);

const requiredDate = (label: string) =>
  z
    .string()
    .min(1, `${label} wajib diisi`)
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), `${label} tidak valid`);

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
  dateOfBirth: optionalDate('Tanggal lahir'),
  companyId: z.string().optional(),
  membershipTypeId: z.string().min(1, 'Membership type wajib dipilih'),
  startDate: requiredDate('Tanggal mulai'),
});

export const updateMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  // Optional on update: the form cannot show the stored NIK, so it sends this
  // only when the operator explicitly replaces it. Omitting it keeps the hash.
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
  dateOfBirth: optionalDate('Tanggal lahir'),
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

/**
 * Envelope for a bulk import. The rows are deliberately NOT validated here:
 * one malformed row must not reject the whole batch. Only the shape is checked
 * (an array of objects), and `importMany` validates each row individually so a
 * bad line is reported and skipped while the rest are saved.
 */
export const importMembersSchema = z.object({
  // Capped: every row is its own transaction plus activity log, and the whole
  // request has to finish within nginx's 60s proxy_read_timeout.
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, 'Tidak ada baris untuk diimport')
    .max(500, 'Maksimal 500 baris per import'),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ImportMemberRow = z.infer<typeof importMemberRowSchema>;
