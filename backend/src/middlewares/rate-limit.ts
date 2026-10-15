import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

/**
 * Broad ceiling for the whole API: stops a single client from flooding list,
 * report, or scanner endpoints. Generous enough for normal operator use.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
  // Static assets and CORS preflights are not worth counting.
  skip: (req) => req.method === 'OPTIONS' || req.path.startsWith('/uploads'),
});

/**
 * Tight limiter for login: throttles credential brute-force per IP + email.
 * Keying by the submitted email too means one attacker rotating IPs still
 * can't hammer a single account for free.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
  },
});
