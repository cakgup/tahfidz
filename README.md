# Hifz Companion / Tahfidz

<p align="center">
  <strong>Aplikasi tahfidz berbasis PWA untuk hafalan, murajaah, setoran, dan pemantauan progres belajar Al-Qur'an.</strong><br>
  Frontend statis, ringan dibuka dari HP, mendukung mode offline, dan dapat dihubungkan ke Cloudflare Worker + D1.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PWA-Offline--Ready-2E7D32" alt="PWA Offline Ready">
  <img src="https://img.shields.io/badge/Mobile-Responsive-1E88E5" alt="Mobile Responsive">
  <img src="https://img.shields.io/badge/Cloudflare-Worker%20%2B%20D1-F38020" alt="Cloudflare Worker and D1">
  <img src="https://img.shields.io/badge/Quran-Kemenag-1565C0" alt="Quran Kemenag">
</p>

---

## Bismillahirrahmanirrahim

Repository ini disusun sebagai ikhtiar digital untuk membantu proses menghafal, menjaga murajaah, memudahkan setoran, dan merapikan pendampingan belajar Al-Qur'an.

Fokus project ini bukan hanya pada fitur, tetapi juga pada kemudahan perawatan:

- mudah dijalankan secara lokal;
- mudah diduplikasi untuk lembaga, kelas, atau pembimbing lain;
- mudah diganti branding dan endpoint-nya;
- lebih aman dibagikan karena kredensial sensitif tidak ditulis langsung di dokumentasi.

---

## Tentang Aplikasi

**Hifz Companion / Tahfidz** adalah aplikasi web statis berbasis PWA dengan backend opsional menggunakan **Cloudflare Worker** dan **Cloudflare D1**.

Aplikasi ini dirancang untuk mendukung alur berikut:

- membaca dan menelusuri konten Al-Qur'an Kemenag;
- mencatat hafalan dan murajaah;
- menerima setoran pengguna yang sudah login;
- membedakan akses santri, guru, dan admin;
- tetap nyaman dipakai di perangkat mobile.

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| Hafalan | Menyimpan target dan progres hafalan per pengguna |
| Murajaah | Membantu pengulangan hafalan yang sudah pernah disetorkan |
| Setoran | Mencatat aktivitas setoran untuk pengguna yang sudah login |
| Dashboard | Menampilkan ringkasan progres dan data personal |
| Login + Registrasi | Autentikasi dengan session token dan captcha matematika |
| Role Pengguna | Mendukung peran `santri`, `guru`, dan `admin` |
| Jadwal Shalat | Lokasi manual atau deteksi GPS untuk waktu shalat |
| PWA | Bisa dipasang ke homescreen dan tetap berguna saat koneksi terbatas |
| Data Al-Qur'an Kemenag | Menggunakan data surah/ayat yang sudah dinormalisasi |

---

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
    |-- schema.sql
    |-- wrangler.toml
    |-- migrations/
    `-- src/
```

Keterangan singkat:

| File/Folder | Fungsi |
|---|---|
| `index.html` | Entry point aplikasi frontend |
| `css/` | Styling utama aplikasi |
| `js/` | Logika UI, auth, hafalan, murajaah, dan konfigurasi |
| `data/` | Data Al-Qur'an Kemenag dan file pendukung frontend |
| `tools/` | Script utilitas untuk normalisasi atau pemrosesan data |
| `worker/` | Backend Cloudflare Worker, D1, dan konfigurasi deployment |
| `ADMIN-SETUP.md` | Catatan pengaturan role admin setelah deploy |

---

## Konten Al-Qur'an

Project ini memakai data Al-Qur'an Kemenag yang sudah disusun untuk kebutuhan frontend:

- file per surah berada di `data/quran_kemenag/surah_1.json` sampai `surah_114.json`;
- file gabungan frontend berada di `data/quran-kemenag-combined.json`;
- file index metadata berada di `data/quran-kemenag-index.json`.

Frontend membaca field seperti:

- `surah`
- `ayahs`
- `ayah`
- `arabic`
- `translation`
- `juz`
- `page`
- `footnotes`

Jika file sumber Kemenag berubah, file gabungan dapat dibuat ulang dengan:

```bash
node tools/normalize-kemenag-json.mjs
```

---

## Menjalankan Frontend Secara Lokal

Jangan buka `index.html` langsung melalui `file://` karena browser dapat membatasi pembacaan file JSON.

### Opsi 1 - Python

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

### Opsi 2 - Static Server Node.js

```bash
npx -y serve .
```

Lalu buka:

```text
http://localhost:3000
```

---

## Menjalankan Worker Secara Lokal

Masuk ke folder worker:

```bash
cd worker
npm install
npm run dev
```

Script yang tersedia:

| Script | Fungsi |
|---|---|
| `npm run dev` | Menjalankan Cloudflare Worker secara lokal |
| `npm run deploy` | Deploy Worker ke Cloudflare |
| `npm run d1:migrate:local` | Apply migration ke database lokal |
| `npm run d1:migrate:remote` | Apply migration ke database remote |

---

## Panduan Duplikasi Project

Bagian ini dibuat supaya orang lain lebih mudah memakai repository ini sebagai dasar project baru.

### 1. Clone repository

```bash
git clone <url-repository-anda>
cd tahfidz
```

### 2. Ganti branding dasar

Periksa dan sesuaikan:

- judul halaman di `index.html`;
- ikon dan aset di folder `assets/`;
- warna dan tampilan di folder `css/`;
- teks atau nama aplikasi di file JavaScript yang relevan.

### 3. Siapkan endpoint backend sendiri

Jangan gunakan nilai produksi lama secara mentah. Buat endpoint Worker Anda sendiri, lalu perbarui konfigurasi frontend.

Di `js/config.js`, ubah nilai seperti ini:

```js
window.HIFZ_CONFIG = {
  apiBase: 'https://<worker-anda>.<subdomain-anda>.workers.dev',
  quranDataPath: 'data/quran-kemenag-combined.json',
  quranIndexPath: 'data/quran-kemenag-index.json'
};
```

Jika project hasil duplikasi tidak membutuhkan backend, bagian frontend masih bisa dipakai sebagai basis tampilan dan pembacaan data Al-Qur'an.

### 4. Siapkan Cloudflare Worker dan D1

Di `worker/wrangler.toml`, pastikan seluruh identifier diganti sesuai akun Anda sendiri.

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
ALLOWED_ORIGINS = "https://domain-anda.example,https://domain-anda.example/app"
```

Yang perlu diperhatikan:

- `database_id` jangan menyalin ID dari project lain;
- `bucket_name` sebaiknya dibuat baru;
- `ALLOWED_ORIGINS` wajib disesuaikan dengan domain frontend Anda;
- jangan menaruh token API, secret, atau kredensial lain di README.

### 5. Apply migration database

Dari folder `worker`:

```bash
npm install
npm run d1:migrate:remote
```

Migration penting di repository ini:

```text
0001_schema.sql
0002_seed_sample.sql
0003_reset_quran_schema.sql
0004 - 0058 seed data Al-Qur'an Kemenag per bagian
0059_auth_login_captcha.sql
add-super-admin.sql
```

Jika database sebelumnya pernah setengah terpasang atau rusak, lebih aman membuat database baru lalu menjalankan migration dari awal.

---

## Deploy

### Frontend

Frontend dapat dipublikasikan ke:

- GitHub Pages
- Cloudflare Pages
- Vercel
- hosting statis lain

Jika memakai GitHub Pages:

1. Push semua file frontend ke branch utama.
2. Buka `Settings` repository.
3. Masuk ke menu `Pages`.
4. Pilih source `Deploy from a branch`.
5. Pilih branch yang diinginkan dan folder root.
6. Simpan lalu tunggu URL aktif.

### Worker

Dari folder `worker`:

```bash
npm install
npm run deploy
```

Pastikan lebih dulu:

- sudah login ke Cloudflare;
- `wrangler.toml` sudah disesuaikan;
- database D1 dan bucket R2 benar-benar milik environment Anda sendiri.

---

## Setup Admin

Catatan role admin tersedia di:

```text
ADMIN-SETUP.md
```

Prinsip umumnya:

- user biasa daftar terlebih dahulu;
- role kemudian dapat diubah menjadi `admin` melalui D1;
- gunakan email milik environment Anda sendiri, bukan email contoh dari project lain.

Contoh query aman:

```sql
UPDATE users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = 'admin@example.com';
```

Untuk verifikasi:

```sql
SELECT id, name, email, role, status
FROM users
WHERE lower(email) = 'admin@example.com';
```

---

## Catatan Keamanan

- Password disimpan sebagai hash, bukan plaintext.
- Captcha matematika divalidasi di backend, bukan hanya di frontend.
- Session token dikirim melalui header `Authorization: Bearer <token>`.
- Untuk produksi, pertimbangkan memakai cookie `HttpOnly` dan `Secure` jika frontend dan backend berada pada domain yang sesuai.
- Jangan commit kredensial, token, `database_id`, bucket produksi, atau domain internal tanpa disamarkan.
- Jika repository akan dipublikasikan, audit ulang `js/config.js`, `worker/wrangler.toml`, dan dokumen setup sebelum push.

---

## Checklist Sebelum Dibagikan ke Orang Lain

- [ ] Branding dan nama aplikasi sudah disesuaikan
- [ ] Endpoint Worker mengarah ke environment baru
- [ ] `database_id`, bucket, dan origin lama sudah diganti
- [ ] Tidak ada email pribadi atau identifier sensitif di dokumentasi
- [ ] Frontend bisa dibuka lokal tanpa error penting
- [ ] Worker bisa dijalankan atau dideploy di akun Cloudflare baru
- [ ] Migration database sudah diuji dari awal

---

## Troubleshooting Singkat

### Frontend tidak memuat data

- cek apakah server lokal dijalankan melalui `http://`;
- pastikan file JSON ada di path yang benar;
- lakukan refresh keras browser.

### Login atau data personal tidak berjalan

- cek `apiBase` di `js/config.js`;
- pastikan Worker aktif;
- pastikan migration auth sudah terpasang.

### Jadwal shalat tidak muncul

- cek izin lokasi jika memakai GPS;
- pastikan data lokasi default valid;
- cek koneksi jika ada dependensi API eksternal.

### Deploy Worker gagal

- periksa login `wrangler`;
- periksa `wrangler.toml`;
- pastikan nama database, ID database, dan bucket sesuai environment aktif.

---

## Teknologi

| Teknologi | Fungsi |
|---|---|
| HTML | Struktur halaman |
| CSS | Tampilan aplikasi |
| JavaScript | Interaksi frontend |
| Service Worker | Dukungan offline/PWA |
| Cloudflare Worker | Backend API |
| Cloudflare D1 | Database aplikasi |
| Cloudflare R2 | Penyimpanan file setoran jika diaktifkan |

---

<p align="center">
  <strong>Dirancang agar mudah dipakai, mudah dikembangkan, dan mudah diteruskan oleh orang berikutnya.</strong>
</p>

<p align="center">
  <sub>developed with ❤️ by cakgup</sub>
</p>
