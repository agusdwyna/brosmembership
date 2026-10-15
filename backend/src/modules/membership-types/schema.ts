import { z } from 'zod';

export const createMembershipTypeSchema = z.object({
  code: z.string().min(2, 'Code minimal 2 karakter').max(20),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  description: z.string().optional(),
  duration: z.number().int().min(1, 'Duration minimal 1 hari'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  defaultCardTemplateId: z.string().optional(),
});

export const updateMembershipTypeSchema = createMembershipTypeSchema.partial();

export type CreateMembershipTypeInput = z.infer<typeof createMembershipTypeSchema>;
export type UpdateMembershipTypeInput = z.infer<typeof updateMembershipTypeSchema>;
