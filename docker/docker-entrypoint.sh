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

# ─── NIK hashing backfill ─────────────────────────────────────────────────
# Members used to store NIK in plaintext. The hash columns are added by a
# migration; this copies the values over (needs NIK_HASH_KEY, which only the
# app has) and then drops the plaintext column. Safe to run on every start:
# it is a no-op once `nik` is gone.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "▶ Memeriksa backfill NIK…"
  if ! (cd /app/backend && node /opt/tools/node_modules/tsx/dist/cli.mjs prisma/backfill-nik-hash.ts); then
    echo "✗ Backfill NIK gagal — periksa NIK_HASH_KEY dan status database." >&2
    exit 1
  fi
fi

# ─── Optional first-time seed ─────────────────────────────────────────────
# Runs at most ONCE per database, no matter how often the container restarts.
# The seed records a `seed.version` row in `settings`; this guard reads it first
# so a forgotten RUN_SEED=true (or a value still present after copying
# .env.production) can never recreate deleted companies, types or accounts on
# the next redeploy. Uses node + the already-generated Prisma client, so no tsx
# startup cost on the normal (already-seeded) path.
#
# A failed seed must NOT stop the container: with `set -e` it would exit, Coolify
# would restart the container, the seed would fail again, and the health check
# would never pass. The app boots fine without it — log the failure and continue.
if [ "${RUN_SEED:-false}" = "true" ]; then
  # Exit codes: 0 = already seeded, 1 = never seeded, 2 = check failed. Only the
  # explicit "never seeded" (1) starts a seed — if the lookup itself errors we do
  # nothing rather than risk re-creating data the operator deleted.
  set +e
  (cd /app/backend && node -e "
      const { PrismaClient } = require('@prisma/client');
      const p = new PrismaClient();
      p.setting.findUnique({ where: { key: 'seed.version' } })
        .then((row) => process.exit(row ? 0 : 1))
        .catch(() => process.exit(2))
        .finally(() => p.\$disconnect());
    ")
  SEED_STATE=$?
  set -e

  if [ "$SEED_STATE" -eq 0 ]; then
    echo "↷ Seed dilewati — database ini sudah pernah di-seed. Set RUN_SEED=false."
  elif [ "$SEED_STATE" -ne 1 ]; then
    echo "⚠️  Gagal memeriksa penanda seed di database — seed tidak dijalankan. Periksa DATABASE_URL." >&2
  else
    echo "▶ Seeding database (sekali saja)…"
    if ! (cd /app/backend && node /opt/tools/node_modules/tsx/dist/cli.mjs prisma/seed.ts); then
      echo "⚠️  Seed gagal — aplikasi tetap dijalankan. Periksa SEED_* lalu set RUN_SEED=false setelah seed berhasil." >&2
    fi
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
