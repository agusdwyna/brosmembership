import { z } from 'zod';

export const createCompanySchema = z.object({
  code: z.string().min(2, 'Code minimal 2 karakter').max(20),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
