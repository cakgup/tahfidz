# Hifz Companion / Tahfidz

Aplikasi tahfidz berbasis **GitHub Pages + Cloudflare Worker + Cloudflare D1** dengan konten Al-Qur’an Kemenag.

## Perubahan versi UX + Auth

Versi ini memperbaiki alur pengguna agar lebih siap dipakai:

- Beranda disederhanakan agar langsung mengarah ke hafalan, murajaah, atau daftar akun.
- Card informasi umum di Beranda dihapus.
- Menu teknis `Endpoint API Worker`, `Konten PPSA`, dan form besar lokasi jadwal shalat dihapus dari UI.
- Menu utama berubah berdasarkan status login:
  - sebelum login: `Beranda`, `Hafalan`, `Murajaah`, `Masuk`, `Daftar`;
  - setelah login: `Beranda`, `Hafalan`, `Murajaah`, `Setoran`, `Dashboard`, `Profil`, `Keluar`.
- Ditambahkan registrasi, login, logout, session token, dan captcha matematika.
- Dashboard, Setoran, Profil, penyimpanan hafalan, dan murajaah personal hanya aktif setelah login.
- Tombol `Buat jadwal dari hafalan` sudah difungsikan.
- Pengaturan lokasi jadwal shalat dipindahkan menjadi ikon kecil 📍 pada header, dengan opsi detect GPS.
- CSS diperbaiki agar teks tetap terbaca jelas pada mode gelap.

## Konten Al-Qur’an

- Konten utama Al-Qur’an memakai file Kemenag di `data/quran_kemenag/surah_1.json` sampai `surah_114.json`.
- File gabungan frontend: `data/quran-kemenag-combined.json`.
- File index metadata: `data/quran-kemenag-index.json`.
- Frontend membaca field Kemenag seperti `surah`, `ayahs`, `ayah`, `arabic`, `translation`, `juz`, `page`, dan `footnotes`.
- Audio ayat diarahkan ke URL eksternal EveryAyah Alafasy berdasarkan nomor surah/ayat.

## Endpoint Worker

`js/config.js` sudah diarahkan ke Worker:

```text
https://hifz-companion-api.baghasasi.workers.dev
```

## Menjalankan frontend lokal

Jalankan dari root repository:

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

## Deploy Worker

Masuk ke folder Worker:

```bash
cd worker
npm install
npx wrangler deploy
```

## Apply D1 migration

Pastikan `database_id` di `worker/wrangler.toml` sudah benar. Lalu jalankan:

```bash
cd worker
npx wrangler d1 migrations apply hifz-companion-db --remote
```

Migration penting:

```text
0001_schema.sql                         schema awal
0002_seed_sample.sql                    sample pendek lama
0003_reset_quran_schema.sql             reset schema surah/ayah Kemenag
0004-0058_seed_quran_kemenag_part_*.sql seed penuh 6.236 ayat, dipecah agar tidak SQLITE_TOOBIG
0059_auth_login_captcha.sql             tabel session dan captcha untuk login/registrasi
```

Jika database development sebelumnya sempat gagal migrasi, cara paling bersih adalah mengganti folder `worker/migrations` dengan versi ini lalu menjalankan ulang migration. Untuk database kosong, apply migration dari awal.

## Deploy GitHub Pages

Upload/push isi root repository ini ke GitHub Pages. Frontend otomatis memakai:

```text
data/quran-kemenag-combined.json
```

## Catatan keamanan

- Password disimpan sebagai hash PBKDF2/SHA-256 dengan salt di Worker/D1.
- Captcha matematika dibuat dan divalidasi di Worker, bukan hanya frontend.
- Session token dikirim melalui header `Authorization: Bearer <token>`.
- Untuk produksi dengan custom domain yang sama, session dapat ditingkatkan menjadi HttpOnly Secure Cookie.
- Rekaman setoran pada MVP masih berupa object URL lokal. Untuk produksi, simpan file audio ke Cloudflare R2 atau storage lain, sedangkan D1 hanya menyimpan metadata.

## Regenerate file gabungan jika JSON Kemenag berubah

```bash
node tools/normalize-kemenag-json.mjs
```
