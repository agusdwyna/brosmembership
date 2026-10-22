import { z } from 'zod';

/**
 * A `YYYY-MM-DD` from a date input. `new Date('')` is an Invalid Date (truthy),
 * which Prisma rejects as a 500, so an unparseable value is a 400 here.
 */
const dateOnly = (label: string) =>
  z
    .string()
    .min(1, `${label} wajib diisi`)
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), `${label} tidak valid`);

export const renewMembershipSchema = z.object({
  startDate: dateOnly('Tanggal mulai'),
});

/**
 * Override the dates of an existing membership. `endDate` is optional: when it
 * is omitted (or empty) the end is recomputed as start + the type's duration,
 * which is the same rule registration uses.
 */
export const updateMembershipDatesSchema = z.object({
  startDate: dateOnly('Tanggal mulai'),
  endDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined))
    .refine((d) => d === undefined || !Number.isNaN(d.getTime()), 'Tanggal berakhir tidak valid'),
});

export const changeTypeSchema = z.object({
  membershipTypeId: z.string().min(1, 'Membership type wajib dipilih'),
});

export const suspendMembershipSchema = z.object({
  reason: z.string().optional(),
});

export const cancelMembershipSchema = z.object({
  reason: z.string().optional(),
});

export type RenewMembershipInput = z.infer<typeof renewMembershipSchema>;
export type ChangeTypeInput = z.infer<typeof changeTypeSchema>;
export type UpdateMembershipDatesInput = z.infer<typeof updateMembershipDatesSchema>;
