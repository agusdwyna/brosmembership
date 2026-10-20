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
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci

COPY . .

# Generate the Prisma client first — backend's `tsc` needs the generated model
# types, and `npm ci` above ran before the schema existed so its postinstall
# could not produce them. Then compile backend (tsc) and frontend
# (tsc -b && vite build). The frontend is built with no VITE_* env set, so
# lib/api.ts falls back to a relative baseURL — the SPA then calls the same
# origin it was served from.
#
# `generate` never connects to a database; the placeholder URL only satisfies
# Prisma's schema env resolution during the image build.
RUN cd backend && DATABASE_URL="postgresql://build:build@localhost:5432/build" \
      node /app/node_modules/prisma/build/index.js generate \
    && cd /app && npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — production node_modules (built in a throwaway stage)
# ─────────────────────────────────────────────────────────────────────────────
# Installing here instead of in the runtime stage keeps compilers out of the
# final image while still allowing bcrypt's native fallback build if the
# prebuilt binary cannot be downloaded.
FROM node:24-bookworm-slim AS prod-deps

WORKDIR /app
ENV HUSKY=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci --omit=dev

# Prisma CLI and tsx are devDependencies in the workspaces, and npm omits those
# even when they are named explicitly with --omit=dev. Install the runtime tools
# in their own prefix instead, so the production dependency tree stays untouched.
RUN mkdir -p /opt/tools \
    && cd /opt/tools \
    && npm init -y > /dev/null \
    && npm install --no-save --no-audit --no-fund --omit=dev prisma@6.19.3 tsx@4.23.12

# Generate the client once here; the generated tree is copied to the runtime.
COPY backend/prisma backend/prisma
RUN cd backend && DATABASE_URL="postgresql://build:build@localhost:5432/build" \
      /opt/tools/node_modules/prisma/build/index.js generate \
    && test -f /app/node_modules/.prisma/client/index.js

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — lean runtime (nginx + node, no build toolchain)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runtime

# nginx: front proxy / static host. gettext-base: envsubst to render the config.
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gettext-base openssl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

# Workspace manifests keep the hoisted node_modules layout resolvable.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# Production dependencies and Prisma/tsx runtime tools, already generated.
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /opt/tools /opt/tools

# Schema + migrations are needed by `prisma migrate deploy` at container start.
COPY --from=builder /app/backend/prisma /app/backend/prisma

# Compiled backend.
COPY --from=builder /app/backend/dist /app/backend/dist

# Seed runs through tsx at startup and imports the code-owned permission catalog
# from ../src/lib/permissions, so the source tree must be present too.
COPY --from=builder /app/backend/src /app/backend/src

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
# binds API_PORT (3002) on the container's internal interface. They must differ —
# the same port cannot be bound by both processes.
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

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:80/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Runs migrations, then supervises the API and nginx together.
ENTRYPOINT ["/app/docker/docker-entrypoint.sh"]
