import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
const NIK_HASH_KEY = process.env.NIK_HASH_KEY;

// A missing or well-known secret lets anyone forge an ADMIN token. Refuse to
// boot with one unless we are explicitly in development or under test — the
// old check trusted NODE_ENV === 'production', so a deploy that forgot to set
// NODE_ENV would silently accept the dev default.
const WEAK_SECRETS = new Set(['dev-secret', 'change-me-to-a-random-secret', 'secret', '']);
const isDevLike = NODE_ENV === 'development' || NODE_ENV === 'test';
if (!isDevLike && (!JWT_SECRET || WEAK_SECRETS.has(JWT_SECRET))) {
  throw new Error(
    'JWT_SECRET wajib diisi dengan nilai acak yang kuat kecuali di development/test (jangan pakai nilai default).',
  );
}

// NIKs are stored as an HMAC of the value; losing or changing this key makes
// every stored NIK hash unreadable (duplicate checks and NIK scan would fail),
// so refuse to boot production without one.
if (!isDevLike && (!NIK_HASH_KEY || NIK_HASH_KEY.length < 32)) {
  throw new Error(
    'NIK_HASH_KEY wajib diisi minimal 32 karakter di production (gunakan `openssl rand -hex 32`).',
  );
}

export const env = {
  NODE_ENV,
  API_PORT: parseInt(process.env.API_PORT || '3002', 10),
  API_PREFIX: process.env.API_PREFIX || '/api',
  DATABASE_URL: process.env.DATABASE_URL!,
  // Dev-only fallback; non-dev environments reject the weak default above.
  JWT_SECRET: JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  // Dev/test fallback only; production is rejected above.
  NIK_HASH_KEY: NIK_HASH_KEY || 'dev-nik-hash-key-change-me-32-chars',
  // Comma-separated list of allowed CORS origins. Empty → allow all (dev only).
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Trust X-Forwarded-For from a reverse proxy. Accepts the booleans and hop
  // counts express understands ('true' | 'false' | number).
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
};

/** 'true' → true, 'false' → false, a number string → number, else undefined. */
function parseTrustProxy(value: string | undefined): boolean | number | undefined {
  if (value === 'true') return true;
  if (value === 'false' || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}
