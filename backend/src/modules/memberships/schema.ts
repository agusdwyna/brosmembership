import { z } from 'zod';

export const renewMembershipSchema = z.object({
  startDate: z.string().transform((v) => new Date(v)),
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
