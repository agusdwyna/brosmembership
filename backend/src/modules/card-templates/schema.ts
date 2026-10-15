import { z } from 'zod';

const elementSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['MEMBER_NAME', 'MEMBER_NUMBER', 'MEMBERSHIP_NAME', 'EXPIRY_DATE', 'QR_CODE']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fontSize: z.number().optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
});

const sideSchema = z.object({
  side: z.enum(['FRONT', 'BACK']),
  designUrl: z.string().optional(),
  elements: z.array(elementSchema).default([]),
});

export const createCardTemplateSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  sides: z.array(sideSchema).default([]),
});

export const updateCardTemplateSchema = createCardTemplateSchema.partial();

export type CreateCardTemplateInput = z.infer<typeof createCardTemplateSchema>;
export type UpdateCardTemplateInput = z.infer<typeof updateCardTemplateSchema>;
