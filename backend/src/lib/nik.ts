import { createHmac, randomBytes } from 'crypto';
import { env } from '../config/env';

/**
 * NIK is personal data: it is never stored in plaintext. The database keeps
 * only an HMAC of it (`nikHash`, for uniqueness and lookup) and its last four
 * digits (`nikLast4`, for display). This module is the only place that derives
 * either value, so the key and the hashing rules cannot drift between callers.
 */

/**
 * NIK has low entropy — the first 12 digits encode region, date of birth and
 * sequence — so a plain SHA-256 would be reversible with an offline brute-force
 * or a rainbow table. The HMAC key lives in the environment (never the DB), so
 * a leaked database dump alone is not enough to recover a NIK.
 *
 * This must be deterministic (unlike bcrypt/argon2): equality is what powers
 * the unique constraint and the scanner lookup.
 */
export const hashNik = (nik: string): string =>
  createHmac('sha256', env.NIK_HASH_KEY).update(nik.trim()).digest('hex');

/** Last four digits, the only part shown to operators (`••••••••••••0001`). */
export const last4Nik = (nik: string): string => nik.trim().slice(-4);

/** Renders the masked form; a missing NIK stays `null` so the UI can say "-". */
export const maskNik = (last4: string | null | undefined): string | null =>
  last4 ? `••••••••••••${last4}` : null;

/**
 * QR payload for a member. It is a random token, NOT a value derived from the
 * NIK: the old `sha256(nik + memberNumber)` could be brute-forced back to the
 * NIK because memberNumber is visible on every card.
 */
export const generateQrToken = (): string => randomBytes(32).toString('hex');
