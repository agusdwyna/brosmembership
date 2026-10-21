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
# A fresh Coolify deploy can start this container before PostgreSQL accepts
# connections, so retry for ~45s instead of failing the whole deploy.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "▶ Menerapkan migrasi database (prisma migrate deploy)…"
  attempt=0
  until (cd /app/backend && node /opt/tools/node_modules/prisma/build/index.js migrate deploy); do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 15 ]; then
      echo "✗ Migrasi gagal setelah $attempt percobaan — periksa DATABASE_URL dan status database." >&2
      exit 1
    fi
    echo "… database belum siap (percobaan ${attempt}/15), coba lagi dalam 3 detik."
    sleep 3
  done
else
  echo "▶ RUN_MIGRATIONS=false — melewati migrasi."
fi

# ─── Optional first-time seed ─────────────────────────────────────────────
# Idempotent (uses upserts). Enable with RUN_SEED=true and set SEED_ADMIN_PASSWORD.
# A failed seed must NOT stop the container: with `set -e` it would exit, Coolify
# would restart the container, the seed would fail again, and the health check
# would never pass. The app boots fine without it — log the failure and continue.
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "▶ Seeding database…"
  if ! (cd /app/backend && node /opt/tools/node_modules/tsx/dist/cli.mjs prisma/seed.ts); then
    echo "⚠️  Seed gagal — aplikasi tetap dijalankan. Periksa SEED_* lalu set RUN_SEED=false setelah seed berhasil." >&2
  fi
fi

# ─── Run API + nginx ──────────────────────────────────────────────────────
# Both run as children of this script. Keep the API in the background so the
# shell can trap Coolify's SIGTERM and stop both processes cleanly; `wait` then
# exits the container if the API dies so the platform restarts it.
echo "▶ Menjalankan nginx…"
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "▶ Menjalankan API (node dist/index.js)…"
cd /app/backend
node dist/index.js &
API_PID=$!

cleanup() {
  kill -TERM "$NGINX_PID" "$API_PID" 2>/dev/null || true
}
trap cleanup TERM INT EXIT

wait "$API_PID"
