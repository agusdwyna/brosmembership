import { z } from 'zod';

export const verifySchema = z.object({
  token: z.string().min(1, 'Token wajib diisi'),
  scannerMethod: z.enum(['MANUAL', 'PHYSICAL_READER', 'CAMERA']),
});

export type VerifyInput = z.infer<typeof verifySchema>;
