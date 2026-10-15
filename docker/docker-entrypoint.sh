#!/bin/sh
# Container entrypoint: prepare nginx, apply DB migrations, then run the API and
# nginx together. All configuration comes from environment variables injected by
# Coolify at runtime — nothing is persisted into the image.

set -eu

echo "▶ Menyiapkan konfigurasi nginx (publik :${PORT:-80} → API :${API_PORT:-3002})…"
# Substitute only PORT and API_PORT; nginx's own $variables ($host, $uri, …)
# must pass through verbatim.
mkdir -p /etc/nginx/conf.d
envsubst '${PORT} ${API_PORT}' \
  < /app/docker/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

# Validate the rendered config so a bad env value fails fast with a clear error.
nginx -t

# ─── Database migrations ──────────────────────────────────────────────────
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "▶ Menerapkan migrasi database (prisma migrate deploy)…"
  (cd /app/backend && node /app/node_modules/prisma/build/index.js migrate deploy)
else
  echo "▶ RUN_MIGRATIONS=false — melewati migrasi."
fi

# ─── Optional first-time seed ─────────────────────────────────────────────
# Idempotent (uses upserts). Enable with RUN_SEED=true and set SEED_* passwords.
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "▶ Seeding database…"
  (cd /app/backend && node /app/node_modules/tsx/dist/cli.mjs prisma/seed.ts)
fi

# ─── Run API + nginx ──────────────────────────────────────────────────────
# nginx runs in the background; the API stays in the foreground so the container
# lifecycle (and logging) tracks the Node process.
echo "▶ Menjalankan nginx…"
nginx -g 'daemon off;' &
NGINX_PID=$!

# Forward termination signals so Coolify can stop the container cleanly.
trap 'kill -TERM "$NGINX_PID" 2>/dev/null || true' TERM INT

echo "▶ Menjalankan API (node dist/index.js)…"
cd /app/backend
node dist/index.js
