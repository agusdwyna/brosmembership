import { z } from 'zod';

const roleEnum = z.enum(['ADMIN', 'OFFICER']);

export const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  role: roleEnum.default('OFFICER'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Email tidak valid').optional(),
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  role: roleEnum.optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
