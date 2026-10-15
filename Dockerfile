# syntax=docker/dockerfile:1
#
# BROs Membership — single-service image (frontend SPA + backend API + nginx).
#
# One container serves everything on port 80:
#   /            → built React SPA (static)
#   /api/*       → Express API
#   /uploads/*   → member/card images (persisted on the backend/uploads volume)
#
# All secrets/config are injected at RUNTIME by Coolify (docker run -e / env).
# Nothing sensitive is baked into the image — see .dockerignore and docs/DEPLOY.md.

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build both workspaces
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder

WORKDIR /app
ENV HUSKY=0

# Manifests first so the dependency layer is cached across source edits.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Native build fallback (bcrypt/konva) + full workspace install, including the
# devDependencies that the two `build` scripts need (tsc, vite, prisma CLI).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci

COPY . .

# Generate the Prisma client first — backend's `tsc` needs the generated model
# types, and `npm ci` above ran before the schema existed so its postinstall
# could not produce them. Then compile backend (tsc) and frontend
# (tsc -b && vite build). The frontend is built with no VITE_* env set, so
# lib/api.ts falls back to a relative baseURL — the SPA then calls the same
# origin it was served from.
RUN cd backend && node /app/node_modules/prisma/build/index.js generate \
    && cd /app && npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — lean runtime (nginx + node, no build toolchain)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime

# nginx: front proxy / static host. gettext-base: envsubst to render the config.
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gettext-base \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

# Production dependencies only. Prisma's CLI and tsx are devDependencies, so
# they are re-installed explicitly below for migrations/seed at startup.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN HUSKY=0 npm ci --omit=dev \
    && HUSKY=0 npm install --no-save --no-audit --no-fund prisma@6.19.3 tsx@4.23.12

# Regenerate the Prisma client against the runtime node_modules (the fresh
# install above does not carry the one built in stage 1). Needs only the schema.
COPY --from=builder /app/backend/prisma /app/backend/prisma
RUN cd backend && node /app/node_modules/prisma/build/index.js generate

# Compiled backend.
COPY --from=builder /app/backend/dist /app/backend/dist

# Built SPA → nginx's document root (matches `root` in nginx.conf.template).
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# nginx config template + entrypoint (rendered at start).
COPY docker/nginx.conf.template /app/docker/nginx.conf.template
COPY docker/docker-entrypoint.sh /app/docker/docker-entrypoint.sh
RUN chmod +x /app/docker/docker-entrypoint.sh \
    && mkdir -p /app/backend/uploads

# Coolify injects these at runtime. Defaults below are non-secret; every value
# can be overridden with a plain environment variable.
#
# Two ports on purpose: nginx listens publicly on PORT (80) and the Express API
# binds API_PORT (3002) on localhost only. They must differ — the same port
# cannot be bound by both processes.
ENV NODE_ENV=production \
    PORT=80 \
    API_PORT=3002 \
    API_PREFIX=/api

# Uploaded images are written to /app/backend/uploads (see src/config/uploads.ts).
# Mount a volume here in Coolify so they survive redeploys.
VOLUME ["/app/backend/uploads"]

# Single public port — Coolify's proxy points its domain here. (API_PORT stays
# internal; it is never exposed.)
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:80/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Runs migrations, then supervises the API and nginx together.
ENTRYPOINT ["/app/docker/docker-entrypoint.sh"]
