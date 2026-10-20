import { z } from 'zod';

export const createRoleSchema = z.object({
  key: z
    .string()
    .min(2, 'Kode minimal 2 karakter')
    .max(30, 'Kode maksimal 30 karakter')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Kode hanya boleh huruf kapital, angka, dan underscore'),
  label: z.string().min(2, 'Nama minimal 2 karakter'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

// `key` is immutable: users reference a role by its key, so renaming it would
// orphan them. Only label/description/permissions can change.
export const updateRoleSchema = z.object({
  label: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
