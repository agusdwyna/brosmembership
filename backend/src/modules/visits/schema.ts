import { z } from 'zod';

export const createVisitSchema = z.object({
  memberId: z.string().min(1, 'Member wajib diisi'),
  membershipId: z.string().optional().nullable(),
  // The scan that led to this visit; makes recording idempotent.
  scanId: z.string().optional().nullable(),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
