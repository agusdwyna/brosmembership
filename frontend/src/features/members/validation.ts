import { z } from 'zod';

export const createMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  nik: z
    .string()
    .min(16, 'NIK harus 16 digit')
    .max(16, 'NIK harus 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  companyId: z.string().optional(),
  membershipTypeId: z.string().min(1, 'Membership type is required'),
  startDate: z.string().min(1, 'Start date is required'),
});

export const updateMemberSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  // NIK stays required: qrHash is derived from it, so clearing it would leave
  // the member unverifiable. Matches createMemberSchema and the backend schema.
  nik: z
    .string()
    .min(16, 'NIK harus 16 digit')
    .max(16, 'NIK harus 16 digit')
    .regex(/^\d+$/, 'NIK harus berupa angka'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  companyId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const companySchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const membershipTypeSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  duration: z.number().int().min(1, 'Duration must be at least 1 day'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  defaultCardTemplateId: z.string().optional(),
});

export type FieldErrors = Record<string, string>;
