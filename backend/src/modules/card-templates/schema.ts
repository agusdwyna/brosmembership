import { z } from 'zod';

// `nullish` rather than `optional` on every nullable column below: Prisma
// returns `null` (not `undefined`) for an unset value. The editor loads a saved
// template, changes the name and PUTs the same sides/elements back, so `null`
// must be accepted — otherwise renaming a template whose side has no background
// image (or whose element has no font settings) fails with "Validasi gagal".
const elementSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['MEMBER_NAME', 'MEMBER_NUMBER', 'MEMBERSHIP_NAME', 'EXPIRY_DATE', 'QR_CODE']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fontSize: z.number().nullish(),
  fontWeight: z.enum(['normal', 'bold']).nullish(),
  alignment: z.enum(['left', 'center', 'right']).nullish(),
  // #RRGGBB only: the value is written straight into CSS/canvas, so anything
  // else (named colors, rgb(), url()) must not reach the renderer.
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus format #RRGGBB')
    .nullish(),
});

const sideSchema = z.object({
  side: z.enum(['FRONT', 'BACK']),
  designUrl: z.string().nullish(),
  elements: z.array(elementSchema).default([]),
});

export const createCardTemplateSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  sides: z.array(sideSchema).default([]),
});

export const updateCardTemplateSchema = createCardTemplateSchema.partial();

export type CreateCardTemplateInput = z.infer<typeof createCardTemplateSchema>;
export type UpdateCardTemplateInput = z.infer<typeof updateCardTemplateSchema>;
export type CardTemplateElementInput = z.infer<typeof elementSchema>;
