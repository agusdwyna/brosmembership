# Deploy ke Coolify (single service)

Satu container melayani semuanya pada port **80**:

| Path | Dilayani oleh |
|------|----------------|
| `/` | SPA React (hasil build Vite, statis via nginx) |
| `/api/*` | Express API (Node) |
| `/uploads/*` | Gambar member/kartu |
| `/health` | Liveness probe (untuk healthcheck Coolify) |

Frontend dan API berada di origin yang sama, jadi SPA memanggil `/api` secara
relatif — tidak perlu domain terpisah, CORS, atau `VITE_API_URL`.

---

## 0. Ringkasan yang perlu disiapkan

1. Resource **PostgreSQL** di Coolify (satu project/environment dengan app).
2. Resource **Application** dari repo Git, build pack **Dockerfile**.
3. Domain + HTTPS (otomatis oleh Coolify).
4. Environment variables (disuntik saat runtime, lihat bagian 3).
5. Persistent volume untuk `/app/backend/uploads`.
6. Deploy pertama dengan `RUN_SEED=true`, lalu matikan.

> **Jangan** mengekspos `API_PORT` (3002). Hanya port `80` yang publik.
> **Jangan** set `VITE_API_URL` untuk setup single-service ini.

### Checklist cepat

- [ ] PostgreSQL dibuat; internal URL disalin (bukan `localhost`)
- [ ] Application dibuat dengan build pack **Dockerfile**, **Ports Exposes = 80**
- [ ] Domain + HTTPS diisi
- [ ] `DATABASE_URL` dan `JWT_SECRET` diisi
- [ ] `PORT=80`, `API_PORT=3002`, `TRUST_PROXY=2`
- [ ] Volume `uploads` → `/app/backend/uploads`
- [ ] Deploy pertama: `RUN_SEED=true` + semua `SEED_*` diisi
- [ ] Login admin berhasil, lalu `RUN_SEED=false`
- [ ] `/health` mengembalikan `{"status":"ok"}`
- [ ] Upload gambar bertahan setelah redeploy

---

## 1. File deployment di repo

| File | Fungsi |
|------|--------|
| `Dockerfile` | Multi-stage: builder (npm ci + build) → runtime (nginx + node, dependency produksi saja) |
| `.dockerignore` | Mengecilkan build context dan mencegah `.env`/secret masuk ke image |
| `docker/nginx.conf.template` | Konfigurasi nginx; `$PORT` dan `$API_PORT` dirender saat container start |
| `docker/docker-entrypoint.sh` | Render nginx → `prisma migrate deploy` (dengan retry) → backfill hash NIK → seed opsional → jalankan nginx + API |
| `docker-compose.yml` | Opsional, untuk build pack **Docker Compose** |
| `docs/DEPLOY.md` | Dokumen ini |

Tidak ada secret yang tertanam di image. Semua dikirim Coolify lewat
**Environment Variables** saat container berjalan.

---

## 2. Buat database PostgreSQL

1. Di Coolify: **+ New Resource → Database → PostgreSQL**.
2. Simpan di **project/environment yang sama** dengan application nanti, agar
   hostname internal bisa saling resolve.
3. Buka resource database → tab **Connection** / **Credentials**, salin
   **internal URL**-nya. Bentuknya seperti:

   ```
   postgresql://postgres:PASSWORD@postgresql-xxxxx:5432/postgres
   ```

   Ganti nama database di akhir URL menjadi `bros_membership` (atau buat
   database baru dengan nama itu), misalnya:

   ```
   postgresql://postgres:PASSWORD@postgresql-xxxxx:5432/bros_membership
   ```

4. Jangan aktifkan akses publik ke database. Cukup jaringan internal Coolify.
5. Jika password mengandung karakter khusus (`@`, `:`, `/`, `#`, `%`), lakukan
   URL-encode (`@` → `%40`, dan seterusnya).

> Database eksternal juga bisa dipakai. Pastikan container app bisa menjangkau
> host:port-nya; bila penyedia mewajibkan TLS, tambahkan `?sslmode=require`
> pada `DATABASE_URL`.

---

## 3. Environment variables (isi di Coolify)

Buka application → **Environment Variables**. Semua variabel di bawah adalah
**runtime variables** (bukan build variables). Tidak perlu membuat atau
menempel file `.env` di server — Coolify menyuntikkan nilainya langsung ke
proses container saat start.

### Wajib

| Variabel | Nilai |
|----------|-------|
| `DATABASE_URL` | Internal URL PostgreSQL dari langkah 2 |
| `JWT_SECRET` | String acak kuat, mis. hasil `openssl rand -hex 32` |
| `NIK_HASH_KEY` | Kunci HMAC untuk hash NIK, min. 32 karakter (`openssl rand -hex 32`). **Jangan diubah setelah ada member** — semua hash NIK lama tidak akan cocok lagi |

### Salin-tempel (sesuaikan nilainya)

```env
NODE_ENV=production
PORT=80
API_PORT=3002
API_PREFIX=/api

DATABASE_URL=postgresql://postgres:PASSWORD@postgresql-xxxxx:5432/bros_membership
JWT_SECRET=ganti-dengan-hasil-openssl-rand-hex-32
NIK_HASH_KEY=ganti-dengan-hasil-openssl-rand-hex-32

JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Kosong = hanya same-origin (setup single-service).
CORS_ORIGINS=

# Coolify proxy -> nginx -> Express = 2 hop. Supaya rate limit memakai IP klien asli.
TRUST_PROXY=2

# Migrasi otomatis saat container start.
RUN_MIGRATIONS=true

# Cukup sekali per database: seed menulis penanda `seed.version`, sehingga
# redeploy berikutnya otomatis dilewati walau nilai ini masih true.
RUN_SEED=true
SEED_ADMIN_EMAIL=admin@domain-anda.com
SEED_ADMIN_PASSWORD=password-kuat-admin
# Opsional — kosongkan bila tidak perlu akun officer awal.
# SEED_OFFICER_EMAIL=officer@domain-anda.com
# SEED_OFFICER_PASSWORD=password-kuat-officer

# Hanya bila memang ingin menjalankan seed lagi (mis. menyegarkan permission
# role bawaan setelah update aplikasi). Kosongkan setelah selesai.
# SEED_FORCE=false
```

### Catatan penting

- **`PORT` = port publik container.** Di Coolify isi **Ports Exposes** dengan
  `80`. Jangan biarkan Coolify memakai `PORT` lain.
- **`API_PORT` jangan diubah** kecuali Anda juga mengubah template nginx; nilainya
  harus berbeda dari `PORT` karena dipakai Express di dalam container dan tidak
  dipublikasikan keluar.
- **`TRUST_PROXY=2`** karena ada dua proxy: reverse proxy Coolify dan nginx di
  dalam container. Jika hanya `1`, semua request terlihat berasal dari IP proxy.
  Tambahkan satu lagi (mis. `3`) bila di depan Coolify masih ada Cloudflare/proxy
  lain.
- **Seed berjalan maksimal sekali per database.** Seed menulis penanda
  `seed.version` di tabel `settings`; entrypoint memeriksanya lebih dulu, jadi
  `RUN_SEED=true` yang lupa dimatikan **tidak** akan membuat ulang company,
  tipe membership, template, akun, atau role yang sudah Anda hapus.
  Tetap disarankan set `false` setelah deploy pertama.
- **`SEED_FORCE=true`** memaksa seed berjalan lagi. Gunakan hanya bila perlu
  menyegarkan permission role bawaan (`IT_GOD`/`ADMIN`/`OFFICER`) setelah
  update aplikasi — data lain juga akan di-upsert (bukan diduplikasi), tetapi
  item yang sudah dihapus akan muncul kembali.
- Seed **tidak mengembalikan izin role kustom**; hanya role bawaan yang
  disinkronkan.
- **Hanya `SEED_ADMIN_PASSWORD` yang wajib.** `SEED_OFFICER_PASSWORD` opsional —
  biarkan kosong dan akun officer dilewati; buat officer lewat menu pengguna.
  Seed yang gagal tidak menghentikan container (hanya ditulis di log).
- Seed **tidak mengubah password user yang sudah ada** (`update: {}`). Jika user
  sudah pernah dibuat, ubah password lewat menu **Profil → Ganti Password**.
- **Jangan set `VITE_API_URL`.** Frontend sudah dibangun dengan base URL relatif
  `/api`. `VITE_*` hanya untuk build, bukan runtime.

---

## 4. Buat application di Coolify

### Opsi A — Build Pack: Dockerfile (disarankan)

1. **+ New Resource → Application** → hubungkan repo Git.
2. **Build Pack**: `Dockerfile`.
3. **Dockerfile Location**: `/Dockerfile`.
4. **Ports Exposes**: `80`.
5. **Domains**: isi domain, mis. `https://bros.example.com` (Coolify mengurus
   TLS otomatis).
6. **Environment Variables**: isi seperti bagian 3.
7. **Persistent Storage** → **Add Volume**:
   - Name: `uploads`
   - Destination Path: `/app/backend/uploads`
8. **Deploy**.

Healthcheck sudah didefinisikan di Dockerfile (`GET /health` pada port 80).
Jika Coolify meminta healthcheck manual, isi path `/health`.

### Opsi B — Build Pack: Docker Compose

`docker-compose.yml` di root sudah siap dipakai.

1. **+ New Resource → Application** → repo Git.
2. **Build Pack**: `Docker Compose`.
3. **Environment Variables**: sama seperti bagian 3.
4. Deploy. Volume `uploads` sudah didefinisikan di compose.

Jika Coolify meminta port untuk service `app`, gunakan `80` (sama dengan
`PORT` di compose).

Compose memakai `${DATABASE_URL:?...}` dan `${JWT_SECRET:?...}`, jadi deploy
gagal cepat bila variabel wajib belum diisi.

---

## 5. Deploy pertama

1. Pastikan `RUN_SEED=true` dan `SEED_*` sudah diisi.
2. Klik **Deploy** dan pantau log. Urutan startup:
   ```
   ▶ Menyiapkan konfigurasi nginx
   ▶ Menerapkan migrasi database (prisma migrate deploy)
   ▶ Memeriksa backfill NIK…
   ▶ Seeding database
   ▶ Menjalankan nginx
   ▶ Menjalankan API (node dist/index.js)
   ```

   Pada deploy pertama setelah update privasi NIK, log akan menampilkan
   `Backfill NIK: N member …` lalu `kolom plaintext "nik" dihapus`. Setelah itu
   langkah ini otomatis dilewati.
3. Buka domain → login dengan `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
4. Kembali ke **Environment Variables** → ubah `RUN_SEED=false` → **Save**.
   (Kalau lupa pun aman: penanda `seed.version` membuat seed dilewati.)
5. (Disarankan) hapus `SEED_ADMIN_PASSWORD` dan `SEED_OFFICER_PASSWORD` dari
   environment, atau biarkan dengan nilai kuat.

> **Database yang dibangun sebelum ada penanda seed** belum punya baris
> `seed.version`. Saat redeploy pertama dengan versi ini, seed akan jalan sekali
> lagi. Setelah itu aman. Untuk mencegahnya, tambahkan penanda lebih dulu di
> database (SQL editor Coolify):
>
> ```sql
> INSERT INTO settings (key, value, "updatedAt")
> VALUES ('seed.version', '1', now())
> ON CONFLICT (key) DO UPDATE SET value = '1', "updatedAt" = now();
> ```

---

## 6. Deploy berikutnya (update aplikasi)

1. Push perubahan ke branch yang dipantau Coolify.
2. Deploy ulang dari Coolify (atau aktifkan auto-deploy).
3. Entrypoint otomatis menjalankan `prisma migrate deploy`; `RUN_SEED=false`
   membuat seed dilewati.
4. Data di PostgreSQL dan volume `uploads` tetap aman.

> Jalankan **satu replika** saja. Jika di-scale lebih dari satu, beberapa
> container bisa menjalankan migrasi bersamaan.

Aktifkan juga **backup berkala** pada resource PostgreSQL di Coolify agar data
member, membership, kunjungan, dan log tidak hilang.

---

## 7. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|--------|----------------|--------|
| Deploy gagal: `JWT_SECRET wajib diisi…` | Secret kosong/pakai nilai default | Isi `JWT_SECRET` dengan string acak kuat |
| Deploy gagal: `NIK_HASH_KEY wajib diisi…` | Kunci hash NIK kosong/terlalu pendek | Isi `NIK_HASH_KEY` dengan `openssl rand -hex 32` |
| Scan via NIK / cek duplikat berhenti cocok setelah ganti env | `NIK_HASH_KEY` diubah | Kembalikan kunci lama. Hash lama tidak bisa dipulihkan dengan kunci baru |
| Migrasi gagal / `P1001: Can't reach database server` | `DATABASE_URL` salah atau DB beda network | Salin internal URL dari resource PostgreSQL; pastikan satu project/environment |
| `P1000` / authentication failed | Password salah atau karakter khusus tidak di-encode | URL-encode password, cek user/database |
| Deploy berhenti di `Menunggu database siap` | DB belum selesai start | Entrypoint retry ±45 detik; cek status DB lalu redeploy |
| Seed gagal: `SEED_ADMIN_PASSWORD … wajib diisi` | `RUN_SEED=true` tanpa password admin | Isi `SEED_ADMIN_PASSWORD`. Officer opsional |
| Data seed (company, tipe, template) muncul lagi setelah redeploy | `RUN_SEED=true` menetap dan versi lama menjalankan seed setiap start | Versi ini punya penanda `seed.version`; set `RUN_SEED=false`. Untuk DB lama, tambahkan penanda manual (lihat bagian 5) |
| Ingin menyegarkan permission role bawaan setelah update | — | Set `SEED_FORCE=true` sekali, lalu kosongkan lagi |
| Container restart berulang setelah seed gagal | Entrypoint lama berhenti saat seed error | Sudah diperbaiki: seed gagal hanya di-log, app tetap jalan |
| App jalan tapi 502 dari domain | Container belum siap / port salah | Cek log container; pastikan **Ports Exposes = 80** dan `PORT=80` |
| Upload gambar hilang setelah redeploy | Volume belum dipasang | Tambahkan volume ke `/app/backend/uploads` |
| Semua user kena rate limit yang sama | `TRUST_PROXY` kurang | Set `TRUST_PROXY=2` (Coolify proxy + nginx) |
| Login berhasil tapi fitur tertentu tidak muncul | Role tidak punya permission | Atur di **Pengaturan → Peran & Akses** |
| `prisma migrate deploy` error checksum | File migrasi lama diubah | Jangan edit migrasi yang sudah diterapkan; buat migrasi baru |

Log lengkap ada di Coolify → application → **Logs**.

---

## 8. Menjalankan lokal (uji image tanpa Coolify)

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
  -e TRUST_PROXY=0 \
  -e RUN_SEED=true \
  -e SEED_ADMIN_EMAIL=admin@local.test \
  -e SEED_ADMIN_PASSWORD=admin12345 \
  -e SEED_OFFICER_EMAIL=officer@local.test \
  -e SEED_OFFICER_PASSWORD=officer12345 \
  -v bros_uploads:/app/backend/uploads \
  bros-membership
```

Buka `http://localhost:8080`, lalu login dengan kredensial seed di atas. Setelah
seed berhasil, hentikan container dan jalankan ulang tanpa `RUN_SEED=true` agar
seed tidak dijalankan setiap start.

---

## 9. Kalau butuh dua service publik terpisah

Setup ini sengaja single-service (paling sederhana di Coolify). Bila nanti perlu
memisahkan frontend dan API ke domain berbeda:

- Build frontend dengan `VITE_API_URL=https://api.example.com/api` di Coolify →
  **Build Variables** (karena `VITE_*` tertanam saat build), **atau**
- Isi `CORS_ORIGINS=https://app.example.com` di backend agar API mengizinkan
  origin frontend.

Untuk single domain, keduanya tidak diperlukan.
