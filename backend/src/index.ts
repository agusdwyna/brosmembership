import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { prisma } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found';
import { authRoutes } from './modules/auth/routes';
import { memberRoutes } from './modules/members/routes';
import { companyRoutes } from './modules/companies/routes';
import { membershipTypeRoutes } from './modules/membership-types/routes';
import { membershipRoutes } from './modules/memberships/routes';
import { cardTemplateRoutes } from './modules/card-templates/routes';
import { cardRoutes } from './modules/cards/routes';
import { scannerRoutes } from './modules/scanner/routes';
import { scanHistoryRoutes } from './modules/scan-history/routes';
import { visitRoutes } from './modules/visits/routes';
import { dashboardRoutes } from './modules/dashboard/routes';
import { reportRoutes } from './modules/reports/routes';
import { activityLogRoutes } from './modules/activity-log/routes';
import { settingsRoutes } from './modules/settings/routes';
import { userRoutes } from './modules/users/routes';
import { roleRoutes } from './modules/roles/routes';
import { authMiddleware } from './middlewares/auth';
import { globalLimiter } from './middlewares/rate-limit';

const app = express();

// Behind a reverse proxy (nginx, Coolify, ...) the client IP arrives in
// X-Forwarded-For. Only trust that header when the deployment asks for it —
// trusting it blindly lets clients spoof their IP and dodge rate limiting.
if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

// ─── Global Middlewares ─────────────────────────────────

app.use(helmet());
app.use(
  cors({
    // Locked to CORS_ORIGINS when configured; falls back to reflecting any
    // origin in development only.
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : env.NODE_ENV !== 'production',
    credentials: true,
  }),
);
if (env.NODE_ENV !== 'production') app.use(morgan('dev'));
// 2mb: ordinary JSON payloads are small, but the bulk member import posts up to
// 500 rows in one request (~200kb). The cap still bounds oversized requests.
app.use(express.json({ limit: '2mb' }));

// Broad per-client ceiling across the API (login has its own, tighter limit).
app.use(globalLimiter);

// ─── Static Files (uploads) ─────────────────────────────
// Uploaded images are untrusted: only raster formats are ever stored (see
// config/uploads.ts) and nosniff stops the browser from re-interpreting one as
// active content.

app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

// ─── Health Check ───────────────────────────────────────

// Read the version from the nearest package.json at runtime (src/ or dist/),
// so the endpoint stays correct in both dev and compiled builds.
function readVersion(): string {
  for (const rel of ['../package.json', '../../package.json']) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, rel), 'utf8'));
      if (pkg.version) return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return 'unknown';
}

// Public liveness probe. Deliberately minimal: an unauthenticated caller learns
// nothing about the build. Version/env are handed to authenticated users only
// (see the API-prefixed endpoint below), since they help map known CVEs.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public Routes ──────────────────────────────────────

app.use(`${env.API_PREFIX}/auth`, authRoutes);

// ─── Protected Routes ───────────────────────────────────

app.use(authMiddleware);

// Detailed system info for the Settings → System tab. Behind auth so the
// build version and environment are not public.
app.get(`${env.API_PREFIX}/health`, async (_req, res) => {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: readVersion(),
    env: env.NODE_ENV,
    db,
    uptime: Math.round(process.uptime()),
  });
});

app.use(`${env.API_PREFIX}/members`, memberRoutes);
app.use(`${env.API_PREFIX}/companies`, companyRoutes);
app.use(`${env.API_PREFIX}/membership-types`, membershipTypeRoutes);
app.use(`${env.API_PREFIX}/memberships`, membershipRoutes);
app.use(`${env.API_PREFIX}/card-templates`, cardTemplateRoutes);
app.use(`${env.API_PREFIX}/cards`, cardRoutes);
app.use(`${env.API_PREFIX}/scanner`, scannerRoutes);
app.use(`${env.API_PREFIX}/scan-history`, scanHistoryRoutes);
app.use(`${env.API_PREFIX}/visits`, visitRoutes);
app.use(`${env.API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${env.API_PREFIX}/reports`, reportRoutes);
app.use(`${env.API_PREFIX}/activity-logs`, activityLogRoutes);
app.use(`${env.API_PREFIX}/settings`, settingsRoutes);
app.use(`${env.API_PREFIX}/users`, userRoutes);
app.use(`${env.API_PREFIX}/roles`, roleRoutes);

// ─── Error Handling ─────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────

app.listen(env.API_PORT, () => {
  console.log(`🚀 API running on http://localhost:${env.API_PORT}`);
  console.log(`📋 Health: http://localhost:${env.API_PORT}/health`);
});
