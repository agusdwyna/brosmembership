# Deploy ke Coolify (single service)

Satu container melayani semuanya pada port **80**:

| Path | Dilayani oleh |
|------|----------------|
| `/` | SPA React (hasil build Vite, statis via nginx) |
| `/api/*` | Express API (Node) |
| `/uploads/*` | Gambar member/kartu |
| `/health` | Liveness probe (untuk healthcheck Coolify) |

Karena frontend dan API berada di origin yang sama, SPA memanggil `/api` secara
relatif — tidak perlu domain terpisah maupun CORS.

---

## 1. File yang ditambahkan

| File | Fungsi |
|------|--------|
| `Dockerfile` | Multi-stage: builder (npm ci + build) → runtime (nginx + node, `node_modules` produksi saja) |
| `.dockerignore` | Mengecilkan build context dan **mencegah `.env`/secret ikut ke image** |
| `docker/nginx.conf.template` | Konfigurasi nginx; `$PORT` di-render saat container start |
| `docker/docker-entrypoint.sh` | Render nginx → `prisma migrate deploy` → jalankan nginx + API |
| `docs/DEPLOY.md` | Dokumen ini |

> Catatan: image ini butuh **PostgreSQL**. Pastikan `DATABASE_URL` menunjuk ke
> database yang bisa dijangkau dari container.
| `docker-compose.yml` | Opsional; untuk Coolify build pack **Docker Compose** |

---

## 2. Variabel environment (disuntik Coolify, bukan dibuild)

Semua dikirim saat **runtime** lewat tab **Environment Variables** di Coolify.
Tidak ada secret yang tertanam di image.

### Wajib

| Variabel | Contoh / catatan |
|----------|------------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/bros_membership` — gunakan service PostgreSQL Coolify (internal hostname) |
| `JWT_SECRET` | String acak kuat. Server **menolak start** bila kosong / memakai nilai default saat `NODE_ENV=production` |

Buat `JWT_SECRET` acak:

```bash
openssl rand -hex 32
```

### Opsional (sudah ada default)

| Variabel | Default | Catatan |
|----------|---------|---------|
| `NODE_ENV` | `production` | Jangan diubah |
| `PORT` | `80` | Port **publik** yang didengarkan nginx; domain Coolify diarahkan ke sini |
| `API_PORT` | `3002` | Port **internal** Express (localhost saja). Harus berbeda dari `PORT` |
| `API_PREFIX` | `/api` | |
| `JWT_EXPIRES_IN` | `1d` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `CORS_ORIGINS` | *(kosong)* | Origin tambahan dipisah koma. Kosongkan untuk single domain |
| `TRUST_PROXY` | `1` | Percayai `X-Forwarded-For` dari proxy Coolify → rate limit pakai IP asli |
| `RUN_MIGRATIONS` | `true` | Set `false` untuk melewati `prisma migrate deploy` saat start |

### Seed pertama kali (opsional)

Seed aman dijalankan berulang untuk user/role/setting (upsert) dan tidak lagi menduplikasi template kartu. Isi dulu password-nya:

| Variabel | Contoh |
|----------|--------|
| `RUN_SEED` | `true` (lalu kembalikan ke `false` setelah deploy pertama) |
| `SEED_ADMIN_EMAIL` | `admin@bros.local` |
| `SEED_ADMIN_PASSWORD` | password kuat pilihan Anda |
| `SEED_OFFICER_EMAIL` | `officer@bros.local` |
| `SEED_OFFICER_PASSWORD` | password kuat pilihan Anda |

> Saat `NODE_ENV=production`, seed **gagal** bila `SEED_ADMIN_PASSWORD` kosong —
> ini disengaja agar tidak ada login admin default yang diketahui publik.

---

## 3. Langkah di Coolify

### Opsi A — Build Pack: Dockerfile

1. **+ New Resource** → **Application** → hubungkan repo Git.
2. **Build Pack**: `Dockerfile`.
3. **Dockerfile Location**: `/Dockerfile`.
4. **Ports Exposes**: `80`.
5. **Domains**: isi domain Anda (mis. `https://bros.example.com`). Coolify
   menangani TLS otomatis.
6. **Environment Variables**: isi `DATABASE_URL` + `JWT_SECRET` (dan variabel
   opsional bila perlu).
7. **Persistent Storage** → tambahkan satu **Volume**:
   - Name: `uploads`
   - Destination Path: `/app/backend/uploads`

   Ini agar gambar yang diunggah tidak hilang saat redeploy.
8. **Deploy**.

### Opsi B — Build Pack: Docker Compose

Coolify mengenali `docker-compose.yml` di root otomatis.

1. **+ New Resource** → **Application** → repo Git.
2. **Build Pack**: `Docker Compose`.
3. **Environment Variables**: sama seperti di atas. (`docker-compose.yml`
   memakai `${DATABASE_URL:?...}` sehingga deploy gagal cepat bila kosong.)
4. Deploy — volume `uploads` sudah didefinisikan di compose.

---

## 4. Hal penting

- **Single port.** Jangan publikasikan port lain; Coolify memetakan domain ke
  port `80` container. Reverse proxy Coolify menangani TLS di depan.
- **Database.** Pakai service PostgreSQL dari Coolify dan isi `DATABASE_URL`
  dengan hostname internal (bukan `localhost`). Migrasi dijalankan otomatis oleh
  entrypoint via `prisma migrate deploy`.
- **Upload hilang tanpa volume.** Tanpa volume `/app/backend/uploads`, gambar
  member/kartu akan hilang setiap redeploy.
- **Rate limit & IP asli.** `TRUST_PROXY=1` membuat Express mempercayai satu hop
  dari proxy Coolify sehingga `express-rate-limit` memakai IP klien sebenarnya.

---

## 5. Menjalankan lokal (uji tanpa Coolify)

Cara tercepat — jalankan PostgreSQL sekali agar `DATABASE_URL` bisa diisi:

```bash
docker network create bros

docker run -d --name bros-db --network bros \
  -e POSTGRES_USER=bros -e POSTGRES_PASSWORD=bros_secret \
  -e POSTGRES_DB=bros_membership \
  postgres:16-alpine

docker build -t bros-membership .

docker run --rm -p 8080:80 --network bros \
  -e DATABASE_URL="postgresql://bros:bros_secret@bros-db:5432/bros_membership" \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -v bros_uploads:/app/backend/uploads \
  bros-membership
```

Lalu buka `http://localhost:8080`. Untuk mengisi admin pertama, jalankan sekali
lagi dengan `-e RUN_SEED=true -e SEED_ADMIN_PASSWORD=...`.

---

## 6. Butuh 2 service publik terpisah?

Setup ini sengaja single-service (paling sederhana di Coolify). Bila nanti perlu
memisah frontend dan API ke domain berbeda:

- Build frontend dengan `VITE_API_URL=https://api.example.com/api` saat build
  (Coolify → Build Variables, karena `VITE_*` tertanam saat build), **atau**
- Isi `CORS_ORIGINS=https://app.example.com` di backend agar API mengizinkan
  origin frontend.

Untuk single domain, keduanya tidak diperlukan.
