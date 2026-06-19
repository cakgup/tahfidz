<p align="center">
  <img src="assets/logo.png" alt="Hifz Companion" width="164">
</p>

# Hifz Companion / Tahfidz

<p align="center">
  <strong>Aplikasi tahfidz berbasis PWA untuk hafalan, murajaah, setoran, penilaian guru, dan pemantauan progres belajar Al-Qur'an.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PWA-Offline--Ready-2E7D32" alt="PWA Offline Ready">
  <img src="https://img.shields.io/badge/Mobile-Responsive-1E88E5" alt="Mobile Responsive">
  <img src="https://img.shields.io/badge/Cloudflare-Worker%20%2B%20D1%20%2B%20R2-F38020" alt="Cloudflare Worker D1 R2">
  <img src="https://img.shields.io/badge/Quran-Kemenag-1565C0" alt="Quran Kemenag">
</p>

---

## Bismillahirrahmanirrahim

Repository ini disusun untuk membantu proses menghafal Al-Qur'an secara lebih rapi: memilih target, menandai hafalan, menyusun murajaah, merekam setoran, memberi penilaian, dan memantau progres santri.

Dokumentasi ini juga dibuat supaya project:

- mudah dijalankan secara lokal;
- mudah diduplikasi untuk sekolah, pesantren, atau halaqah lain;
- mudah diganti branding dan endpoint;
- tetap aman dibagikan karena contoh kredensial disamarkan.

## Ringkasan Fitur

### 1. Autentikasi dan role

- Login dan daftar dengan captcha matematika.
- Role `santri`, `guru`, dan `admin`.
- Admin dapat mengelola role user dan mengakses panel guru.

### 2. Hafalan

- Pilih surah, ayat awal, ayat akhir, dan jumlah pengulangan.
- Audio ayat dengan pilihan qari.
- Sinkronisasi audio dengan ayat aktif.
- Tampilan mobile-first yang sudah dioptimalkan untuk HP maupun laptop.

Mode tampilan yang tersedia:

- `Arab + Terjemahan`
- `Terjemahan saja`
- `Arab saja`
- `Mushaf Pojok`
- `Awal ayat saja`

Catatan:

- Mode `Terjemahan saja` menyembunyikan blok Arab sepenuhnya.
- Mode `Awal ayat saja` menampilkan pemantik 1 kalimah pertama dengan format titik di depan, lalu bisa diklik untuk menampilkan ayat utuh.
- Opsi `Tes tanpa teks` sudah dihapus agar alur lebih sederhana.

### 3. Mushaf Pojok

- Basis tampilan menggunakan halaman mushaf, bukan surah/ayat.
- Tersedia dropdown `Halaman Mushaf` 1-604.
- Bisa berpindah halaman dengan gesture slide.
- Tiap ayat pada mode ini bisa disembunyikan seperti mode `Awal ayat saja`, lalu dibuka kembali saat diklik.

### 4. Murajaah

- Susun jadwal dari ayat yang sudah ditandai hafal.
- Tidak otomatis menambah jadwal saat ayat ditandai, sehingga daftar tetap rapi.
- Bisa menandai hasil murajaah dan membersihkan daftar bila tidak diperlukan.

### 5. Setoran

- Rekam audio langsung dari browser.
- Indikator rekaman aktif agar santri tahu aplikasi sedang merekam.
- Audio preview sebelum/ketika proses simpan.
- Pilih guru tujuan dari dropdown yang selalu mengambil daftar role `guru` aktif.
- Setoran tersimpan ke server dan tampil di panel guru.
- Setoran sementara dibersihkan otomatis setelah lewat masa retensi.

### 6. Panel guru dan penilaian

- Guru melihat daftar setoran masuk.
- Nama santri, catatan setoran, audio, dan status penilaian ditampilkan lebih jelas.
- Form penilaian tampil dalam popup.
- Santri bisa melihat hasil penilaian dari guru.

### 7. Beranda, profil, dan utilitas

- Progress ring untuk user yang sudah login.
- Jadwal shalat dengan lokasi default atau GPS.
- Popup pemilihan lokasi jadwal shalat.
- Theme toggle.
- PWA installable dengan manifest dan favicon/logo.

## Stack

- Frontend: HTML, CSS, JavaScript
- Data Al-Qur'an: Kemenag
- Backend: Cloudflare Worker
- Database: Cloudflare D1
- Penyimpanan audio setoran: Cloudflare R2
- Offline support: Service Worker + Web App Manifest

## Struktur Repository

```text
tahfidz/
|-- index.html
|-- README.md
|-- ADMIN-SETUP.md
|-- manifest.webmanifest
|-- sw.js
|-- assets/
|-- css/
|-- data/
|-- js/
|-- tools/
`-- worker/
    |-- package.json
    |-- wrangler.toml
    |-- schema.sql
    |-- migrations/
    `-- src/
```

Folder penting:

- `assets/` untuk logo, favicon, dan ikon.
- `css/` untuk seluruh styling aplikasi.
- `js/` untuk auth, hafalan, murajaah, setoran, panel guru, dan utilitas UI.
- `data/` untuk data Al-Qur'an Kemenag yang dipakai frontend.
- `worker/` untuk API, D1, R2, cron cleanup, dan endpoint admin.

## Menjalankan Frontend Lokal

Jangan buka lewat `file://` karena browser bisa memblokir pembacaan JSON.

### Opsi Python

```bash
python -m http.server 8000
```

Buka:

```text
http://127.0.0.1:8000
```

### Opsi Node

```bash
npx -y serve .
```

Buka:

```text
http://127.0.0.1:3000
```

## Menjalankan Worker Lokal

```bash
cd worker
npm install
npm run dev
```

Script yang tersedia:

| Script | Fungsi |
|---|---|
| `npm run dev` | Menjalankan Worker lokal |
| `npm run deploy` | Deploy Worker ke Cloudflare |
| `npm run d1:migrate:local` | Apply migration ke D1 lokal |
| `npm run d1:migrate:remote` | Apply migration ke D1 remote |

## Cara Duplikasi Project

### 1. Clone repository

```bash
git clone <url-repo-anda>
cd tahfidz
```

### 2. Ganti branding

Periksa dan sesuaikan:

- `assets/logo.png`
- `assets/logo-manifest-192.png`
- `assets/logo-manifest-512.png`
- `assets/icon.svg`
- judul di `index.html`
- teks nama aplikasi di `js/`

### 3. Ganti endpoint frontend

Sesuaikan `js/config.js` dengan Worker milik Anda sendiri:

```js
window.HIFZ_CONFIG = {
  apiBase: 'https://worker-anda.subdomain-anda.workers.dev',
  quranDataPath: 'data/quran-kemenag-combined.json',
  quranIndexPath: 'data/quran-kemenag-index.json'
};
```

Jika tidak memakai backend, frontend tetap bisa dipakai untuk mode baca dan eksplorasi data Al-Qur'an.

### 4. Siapkan Worker, D1, dan R2

Di `worker/wrangler.toml`, jangan salin kredensial project lama. Gunakan nilai baru milik environment Anda sendiri.

Contoh aman:

```toml
name = "nama-worker-anda"
main = "src/index.js"
compatibility_date = "YYYY-MM-DD"

[[d1_databases]]
binding = "DB"
database_name = "nama-db-anda"
database_id = "<database-id-anda>"

[[r2_buckets]]
binding = "SUBMISSIONS_BUCKET"
bucket_name = "nama-bucket-anda"

[vars]
ALLOWED_ORIGINS = "https://domain-anda.example"
SUBMISSION_RETENTION_DAYS = "3"
SUBMISSION_CLEANUP_BATCH_SIZE = "200"

[triggers]
crons = ["0 */6 * * *"]
```

Yang wajib diganti:

- `database_id`
- `database_name`
- `bucket_name`
- `ALLOWED_ORIGINS`
- nama Worker

Jangan menaruh token, secret, atau ID produksi asli ke dalam README.

### 5. Jalankan migration

```bash
cd worker
npm install
npm run d1:migrate:remote
```

## Fitur Backend Penting

### Penyimpanan setoran

- Metadata setoran disimpan di D1.
- File audio disimpan di R2.
- Target guru diambil dari endpoint guru aktif.

### Cleanup otomatis

Setoran audio sementara dihapus otomatis setelah lewat masa retensi.

Konfigurasi saat ini:

- `SUBMISSION_RETENTION_DAYS = "3"`
- `SUBMISSION_CLEANUP_BATCH_SIZE = "200"`
- cron Worker berjalan setiap 6 jam

### Cleanup manual admin

Tersedia endpoint admin kecil untuk menjalankan cleanup manual dari panel/admin tanpa menunggu cron.

## Audio Qari

Pilihan qari hafalan saat ini mendukung beberapa sumber audio EveryAyah, di antaranya:

- Alafasy
- Abdurrahman As-Sudais
- Saood Ash-Shuraym
- Husary Mujawwad
- Minshawy Murattal
- Maher Al-Muaiqly

Pilihan qari disimpan di preferensi tampilan user dan dipakai pada menu hafalan.

## Setup Admin

Panduan singkat juga tersedia di:

```text
ADMIN-SETUP.md
```

Contoh query aman:

```sql
UPDATE users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = 'admin@example.com';
```

Verifikasi:

```sql
SELECT id, name, email, role, status
FROM users
WHERE lower(email) = 'admin@example.com';
```

## Konten Al-Qur'an

Data utama berada di:

- `data/quran-kemenag-combined.json`
- `data/quran-kemenag-index.json`
- `data/quran_kemenag/`

Jika perlu membangun ulang data gabungan:

```bash
node tools/normalize-kemenag-json.mjs
```

## Checklist Sebelum Dibagikan

- [ ] Logo, nama aplikasi, dan favicon sudah disesuaikan
- [ ] `apiBase` mengarah ke Worker milik environment baru
- [ ] `database_id` dan `bucket_name` lama tidak ikut terbawa
- [ ] `ALLOWED_ORIGINS` sudah sesuai domain baru
- [ ] Login, daftar, hafalan, murajaah, setoran, panel guru, dan profil sudah diuji
- [ ] Tidak ada kredensial sensitif di README atau file config publik

## Troubleshooting Singkat

### Frontend putih atau CSS tidak tampil

- pastikan file dibuka lewat server lokal, bukan `file://`;
- lakukan hard refresh;
- cek path aset CSS/JS dan service worker cache.

### Login atau penyimpanan data tidak jalan

- cek `apiBase` di `js/config.js`;
- pastikan Worker aktif;
- pastikan migration D1 sudah lengkap.

### Setoran tidak muncul di guru

- pastikan santri menekan simpan setoran setelah rekam;
- pastikan guru tujuan benar;
- cek Worker, D1, dan R2 aktif;
- cek origin frontend sudah diizinkan.

### Audio setoran gagal dihapus

- cek endpoint delete di Worker;
- pastikan object R2 dan metadata D1 sama-sama bisa dihapus;
- cek log network browser untuk request yang gagal.

## Teknologi

| Teknologi | Fungsi |
|---|---|
| HTML | Struktur halaman |
| CSS | Tampilan aplikasi |
| JavaScript | Interaksi frontend |
| Service Worker | Dukungan offline |
| Web App Manifest | Installable app |
| Cloudflare Worker | Backend API |
| Cloudflare D1 | Database |
| Cloudflare R2 | Penyimpanan audio setoran |

<p align="center">
  <strong>Dirancang agar mudah dipakai, mudah diubah, dan mudah diteruskan.</strong>
</p>

<p align="center">
  <sub>developed with &#10084; by <a href="https://cakgup.codeberg.page">cakgup</a></sub>
</p>
