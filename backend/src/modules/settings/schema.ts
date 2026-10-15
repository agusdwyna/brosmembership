import { z } from 'zod';

const resetEnum = z.enum(['MONTHLY', 'YEARLY', 'GLOBAL']);

export const updateSettingsSchema = z.object({
  brandName: z.string().min(2, 'Brand name minimal 2 karakter').max(60).optional(),
  defaultScannerMethod: z.enum(['MANUAL', 'PHYSICAL_READER', 'CAMERA']).optional(),
  memberNumberPrefix: z.string().max(20).optional(),
  memberNumberReset: resetEnum.optional(),
  cardNumberPrefix: z.string().max(20).optional(),
  cardNumberReset: resetEnum.optional(),
  // Coerced so the form may send a number while the service stores a string.
  expiringSoonDays: z.coerce
    .number()
    .int('Harus bilangan bulat')
    .min(1, 'Minimal 1 hari')
    .max(365, 'Maksimal 365 hari')
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const SETTING_KEYS = [
  'brandName',
  'defaultScannerMethod',
  'memberNumberPrefix',
  'memberNumberReset',
  'cardNumberPrefix',
  'cardNumberReset',
  'expiringSoonDays',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

// Used when a key has never been persisted (fresh DB, or a key added later).
export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  brandName: 'Bros Membership',
  defaultScannerMethod: 'MANUAL',
  memberNumberPrefix: '',
  memberNumberReset: 'MONTHLY',
  cardNumberPrefix: 'CARD-',
  cardNumberReset: 'GLOBAL',
  expiringSoonDays: '30',
};
