# Bali Royal Hospital — Spec Desain & Brand

> **Untuk sistem Membership.** Dokumen ini adalah *satu sumber kebenaran* gaya
> visual BROS, disalin dari implementasi nyata `bros_hrs_rec_v2` (React + Vite +
> Tailwind). Semua nilai di sini **diukur dari kode**, bukan dikarang.
>
> **Stack target:** React + Vite + Tailwind.
> **Keputusan warna error:** tetap sama dengan brand (paritas v2) — lihat §9.

---

## 1. Ringkasan & prinsip

Sistem ini adalah **pintu masuk institusi**, bukan aplikasi internet pada umumnya.
Gayanya sengaja kalem, formal, dan tanpa hiasan. Tujuannya satu: pemakai
(mayoritas di HP) merasa ini benar-benar milik RS, dan bisa menyelesaikan
tugasnya tanpa bingung.

**Lima prinsip:**

| # | Prinsip | Artinya dalam praktik |
|---|---|---|
| 1 | **Maroon RS = warna institusi** | `#B82230`. Bukan biru `#0095F7` sistem lama. |
| 2 | **Satu aksi primer per layar** | Satu tombol maroon yang menonjol; sisanya netral. |
| 3 | **Error tidak bergantung warna** | Karena maroon = brand = danger, tiap error **wajib** ikon + teks. |
| 4 | **Mobile-first, target sentuh ≥ 44px** | Pelamar mayoritas membuka dari HP. |
| 5 | **Formal & kaku, bukan ramah-main** | Sudut tajam (`rounded-sm`), tanpa gradien ramai, tanpa emoji. |

**Nada bahasa (copy):** Bahasa Indonesia, sapaan "Anda", tegas tapi tidak
memerintah. Dilarang berbunyi teknis ("harus berupa teks") — pakai "wajib
dipilih". Dilarang popup; pesan selalu menempel pada elemennya.

---

## 2. Identitas

| Item | Nilai |
|---|---|
| Nama | **Bali Royal Hospital** |
| Singkatan | BROS |
| Entitas kedua | RSIA Bali Royal (`logo-rsia.png`) |
| Tagline | `E-Recruitment` → untuk membership: **`Membership`** |
| Situs | https://www.baliroyalhospital.co.id |
| Copyright footer | `2023 © IT/SIMRS` |

**Alamat & kontak resmi** (dipakai di footer, jangan dikarang):

- Jl. Tantular No. 6 Renon, Denpasar – Bali
- (+62361) 222 588
- adminhrd@baliroyalhospital.co.id
- WA: https://wa.link/yzsp3e

**Aset logo** — dua logo berdampingan, dipisah garis tipis (`border-l border-line pl-3`):

| Berkas | Ukuran di navbar |
|---|---|
| `logo.png` (BROS) | tinggi `h-10` (mobile) / `h-11` |
| `logo-rsia.png` (RSIA) | tinggi `h-9`, tersembunyi di mobile |

`theme-color` (bar browser HP): **`#B82230`**. Favicon: `favicon.png`.

---

## 3. Palet warna

Sembilan token. Tidak ada warna lain — kalau butuh warna baru, tambahkan ke
tabel ini dulu sebelum dipakai (lihat §10 untuk status membership).

| Token | Hex | Fungsi | Kelas Tailwind |
|---|---|---|---|
| `brand` | **`#B82230`** | **Primer.** Tombol utama, aksen, link, ikon aktif, progress | `bg-brand` `text-brand` `border-brand` |
| `brand.deep` | `#8E1A25` | Versi gelap, khusus gradien | `bg-brand-deep` |
| `ink` | `#3A3F52` | Teks utama | `text-ink` |
| `ink.soft` | `#53627C` | Teks sekunder, isi paragraf | `text-ink-soft` |
| `muted` | `#8DA2B5` | Teks bantu, placeholder, label kecil | `text-muted` |
| `line` | `#EDF1F2` | Semua garis & border | `border-line` `bg-line` |
| `bg-soft` | `#F8F9FB` | Latar lembut (seksi selang-seling, kotak info) | `bg-bg-soft` |
| `danger` | `#B82230` | Error — **sengaja sama dengan brand** | `text-danger` `border-danger` |
| `danger.soft` | `#BB555F` | Error versi lembut | — |
| `grayish` | `#62656A` | Teks netral cadangan | — |

**Aturan pemakaian maroon:** maroon itu **mahal**. Ia hanya untuk (a) satu
tombol primer, (b) aksen garis/ikon, (c) progres. Jangan jadikan latar besar
kecuali seksi CTA (`We Care ...`) dan footer. Kalau semua maroon, tidak ada
yang menonjol.

---

## 4. Tipografi

**Font: Roboto** (300 / 400 / 500 / 700 / 900), dengan fallback
`system-ui, sans-serif`. Dimuat dari Google Fonts di `index.html`.

```
https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap
```

**Ukuran dasar: `15px`** (di-set di `body`, bukan 16px — sengaja, agar
tampilan padat seperti sistem lama).

### Skala teks

| Peran | Kelas | Ukuran (mobile → desktop) | Berat |
|---|---|---|---|
| Judul hero | `text-[28px] … sm:text-4xl lg:text-[44px]` | 28 → 44px | bold (700), `leading-[1.2]` |
| Judul seksi | `text-[26px] … sm:text-3xl` | 26 → 30px | bold |
| Judul kartu | `text-[17px]` | 17px | bold, `leading-snug` |
| Subjudul / label grup | `text-lg` | 18px | bold |
| Teks isi | `text-sm` / `text-[14px]` | 14–15px | regular |
| Teks bantu | `text-[13px]` | 13px | regular |
| Mikro / meta | `text-[12px]` | 12px | regular / medium |
| Label seksi kecil | `text-[12px] uppercase tracking-wide` | 12px | medium |

**Kode** (kode lowongan, kode lamaran, nomor) selalu **`font-mono`** dengan
`bg-bg-soft px-2 py-1` — sinyal visual "ini identifier, bukan kalimat".

---

## 5. Layout & irama

| Properti | Nilai |
|---|---|
| Lebar konten | **`max-w-content` = 1100px**, lalu `mx-auto px-4 sm:px-6` |
| Padding seksi | `py-14 sm:py-16` (landing) · `py-[100px]` untuk seksi CTA/sorotan |
| Grid kartu | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` |
| Grid konten 2 kolom | `grid gap-8 lg:grid-cols-2 lg:gap-12` |
| Navbar | tinggi **70px**, sticky `top-0 z-40` |

---

## 6. Radius & bayangan

Radius dibedakan **per makna**, ini bagian dari gaya:

| Radius | Dipakai untuk |
|---|---|
| `rounded-sm` | **Tombol, input, kartu, modal** — sengaja tajam/formal |
| `rounded-lg` | Ikon sosmed, checkbox wrapper, baris berkas |
| `rounded-xl` | Banner peringatan, tabel bungkus, kotak kebijakan |
| `rounded-full` | Titik stepper, progress bar, nomor bulat |

**Bayangan** sangat tipis — hampir tak terlihat:
`shadow-[0_1px_3px_rgba(58,63,82,0.06)]` (navbar) · `shadow-sm` (gambar) · `shadow-xl` (modal).

---

## 7. Komponen (kelas siap pakai)

Semua didefinisikan di `src/index.css` dalam `@layer components`. Salin apa adanya.

### Tombol

```css
.btn        { inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5
              font-medium min-h-[44px] transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed }
.btn-primary{ btn + bg-brand text-white hover:bg-brand/90 }
.btn-outline{ btn + border border-line text-ink hover:bg-bg-soft }
.btn-mundur { btn + border border-line bg-white text-ink-soft hover:bg-bg-soft hover:text-ink }
```

- **`.btn-primary`** — maroon, satu per layar.
- **`.btn-outline`** — netral, aksi sekunder.
- **`.btn-mundur`** — khusus "Sebelumnya"/batal. **Sengaja dinetralkan** (dulu
  pakai danger) supaya tidak tampak setara dengan tombol primer.

### Input & field

```css
.field-label      { block text-sm font-medium text-ink mb-1.5 }
.field-input      { w-full rounded-sm border border-line px-3 py-2.5 text-ink
                    min-h-[44px] outline-none transition
                    focus:border-brand focus:ring-2 focus:ring-brand/25
                    placeholder:text-muted }
.field-input-error{ border-danger focus:border-danger focus:ring-danger/25 }
.field-error      { mt-1 text-[13px] leading-tight text-danger }
.field-hint       { mt-1 text-[13px] text-muted }
.card             { rounded-sm border border-line bg-white p-4 }
```

**Wajib** setiap `<input>`/`<select>`/`<textarea>` error: `aria-invalid` +
`aria-describedby` menunjuk ke `id` pesan error.

### Pola error (WAJIB — ini aturan keras)

Pesan error **selalu di bawah field**, `role="alert"`, 13px, **dengan ikon**:

```tsx
{error && (
  <p className="field-error flex items-start gap-1" role="alert" id={`err-${nama}`}>
    <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
    {error}
  </p>
)}
```

Karena `brand === danger === #B82230`, **warna tidak lagi membedakan** error.
Karena itu ikon + teks itu bukan hiasan — itu satu-satunya penanda. Jangan
pernah hapus ikonnya.

### Blok pesan sistem

```tsx
// Gagal — maroon lembut + ikon Info/AlertCircle
<div className="flex gap-2.5 rounded-sm border border-danger/30 bg-danger/5 p-3.5 text-[13px] text-danger" role="alert">

// Sukses — maroon lembut + ikon Mail/CheckCircle
<div className="rounded-sm border border-brand/30 bg-brand/5 p-3.5 text-[13px]" role="status">

// Banner aturan (kuning? tidak — tetap maroon lembut, ikon AlertTriangle)
<div className="flex gap-3 rounded-xl border border-danger/25 bg-danger/5 p-4" role="note">
```

### Badge / pill

```tsx
// Kode identifier
<span className="rounded-sm bg-bg-soft px-2 py-1 font-mono text-[11px] font-medium text-muted">{kode}</span>

// Peringatan mendesak (mendekati tenggat)
<span className="rounded-sm bg-danger/10 px-2 py-1 text-[12px] font-medium text-danger">{sisa} hari lagi</span>
```

### Modal

```tsx
<div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
  <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-sm bg-white shadow-xl sm:max-w-lg sm:rounded-sm">
```

Pola: muncul **dari bawah di HP**, tengah di desktop. Tutup dengan `Escape` +
klik latar. Fokus otomatis ke field pertama.

### Navbar

Sticky 70px, putih, border bawah `line`, shadow tipis. Logo ganda. Tautan dengan
underline maroon yang tumbuh saat hover. Menu HP via tombol hamburger.

### Stepper (untuk wizard membership)

Label `Langkah N dari M` + progress bar tipis `h-1.5` maroon + titik bulat
(`rounded-full`) yang berubah maroon saat lewat/aktif, netral saat belum.

### Tabel

Bungkus `rounded-xl border border-line overflow-hidden`; baris
`divide-y divide-line`; sel `px-4 py-3.5`; kolom label `font-medium text-muted`,
kolom nilai `text-ink`.

---

## 8. Struktur sumber (React + Vite + Tailwind)

```
src/
  index.css        # @layer base + @layer components (kelas di §7)
  lib/brand.ts     # semua teks & kontak — JANGAN karang teks di komponen
  components/      # Navbar, Footer, Hero, JobCard → versi membership
  pages/
tailwind.config.js # token warna §3
index.html         # font Roboto + <meta theme-color="#B82230">
```

**Aturan proyek yang diturunkan dari v2** (patuhi, ini yang menjaga konsistensi):

1. **Semua copy terpusat di `lib/brand.ts`.** Komponen tidak menulis teks sendiri.
2. **Satu sumber aturan.** Kelas `.btn-*` / `.field-*` didefinisikan sekali di `index.css`.
3. **Jangan pakai warna di luar §3.** Butuh baru → tambah tabel dulu.
4. **Target sentuh ≥ 44px** di semua kontrol.

---

## 9. Keputusan: warna error = warna brand

Di v2, `brand` dan `danger` **sama-sama `#B82230`** — disengaja. Untuk membership
kita **tetap mengikuti** (permintaan pemilik sistem).

**Konsekuensi yang harus dijaga:**

| Bahaya | Pencegahan (sudah jadi aturan di §7) |
|---|---|
| Error "tenggelam" karena warnanya sama dengan tombol | Setiap error **selalu** ada ikon `AlertCircle` + teks |
| Tombol "Batal/Sebelumnya" tampak seperti aksi primer | Pakai `.btn-mundur` (netral), bukan maroon |
| Pengguna buta warna tidak bisa membedakan status | Jangan pernah menyampaikan status **hanya** dengan warna |

Aturan uji: *"Kalau seluruh warna dihapus (jadi abu-abu), apakah setiap error
dan setiap status masih bisa dibaca?"* Kalau tidak — perbaiki.

---

## 10. Tambahan untuk sistem Membership

Bagian ini **usulan**, bukan salinan v2. Semua tetap memakai token §3 supaya
tidak ada warna baru yang bikin sistem terbelah.

### Status keanggotaan — pakai bentuk + ikon, bukan warna baru

Karena palet sengaja sempit dan maroon = error, status **tidak** dibuat dari
warna hijau/kuning baru. Pakai **maroon + netral + ikon**:

| Status | Tampilan | Kelas |
|---|---|---|
| Aktif | Ikon centang + "Aktif" | `bg-brand/10 text-brand` + `CheckCircle2` |
| Menunggu | Ikon jam + "Menunggu verifikasi" | `bg-bg-soft text-ink-soft` + `Clock` |
| Tidak aktif / ditolak | Ikon alert + teks | `bg-danger/10 text-danger` + `AlertCircle` |
| Kadaluarsa | Ikon kalender + "Berakhir <tgl>" | `bg-bg-soft text-muted` + `CalendarX` |

> **Kalau** pihak RS menuntut badge hijau "Aktif" yang eksplisit, itu **warna
> baru** — tambahkan ke tabel §3 sebagai token `success` dulu, dan pastikan
> tetap ada ikon. Jangan sisipkan hijau langsung di komponen.

### Kartu anggota

Bentuk mengikuti `.card` (`rounded-sm border-line bg-white p-4`). Foto/foto-QR di
kiri, data di kanan. Aksen maroon **hanya** pada garis atas tipis atau nomor
anggota (`font-mono`) — bukan latar penuh, kecuali kartu digital "hero".

### Hero seksi membership

Salin pola `Hero` v2: judul besar dengan **satu frasa maroon** di dalamnya
(`text-brand`), subjudul `text-ink-soft`, dua tombol (satu `.btn-primary`).
Aset gambar di `public/images/`, dibungkus `rounded-sm border border-line shadow-sm`.

---

## 11. Checklist sebelum rilis

- [ ] Font Roboto dimuat; `body` 15px.
- [ ] `theme-color` = `#B82230`; favicon & logo terpasang.
- [ ] Hanya warna dari §3 yang muncul di UI.
- [ ] Tiap layar punya **tepat satu** tombol `.btn-primary`.
- [ ] Setiap error punya **ikon + teks** dan `role="alert"`.
- [ ] Setiap kontrol ≥ 44px dan punya `aria-invalid`/`aria-describedby` saat error.
- [ ] Uji abu-abu: semua status & error tetap terbaca tanpa warna.
- [ ] Teks tidak teknis, tidak ada popup.
- [ ] Semua copy terpusat (tidak ada teks keras di komponen).

---

*Sumber: `bros_hrs_rec_v2/apps/web` — `tailwind.config.js`, `src/index.css`,
`src/lib/brand.ts`, komponen `Navbar`/`Hero`/`JobCard`/`Footer`/`RegisterModal`,
`form/Stepper`/`Fields`/`FileSlot`/`Banner`.*
