# Hifz Companion / Tahfidz

Baseline aplikasi tahfidz berbasis **GitHub Pages + Cloudflare Worker + Cloudflare D1**.

## Perubahan versi ini

- Konten utama Al-Qur'an sudah disesuaikan dengan file JSON Kemenag di `data/quran_kemenag/surah_1.json` sampai `surah_114.json`.
- Ditambahkan file gabungan siap pakai: `data/quran-kemenag-combined.json`.
- Ditambahkan index metadata: `data/quran-kemenag-index.json`.
- `js/config.js` sudah diarahkan ke Worker Bapak:

```text
https://hifz-companion-api.baghasasi.workers.dev
```

- Frontend sudah membaca field Kemenag: `surah`, `ayahs`, `ayah`, `arabic`, `translation`, `juz`, `page`, dan `footnotes`.
- Audio ayat otomatis diarahkan ke URL eksternal EveryAyah Alafasy berdasarkan nomor surah/ayat.
- Service worker diperbarui agar cache memakai konten Kemenag, bukan sample lama.
- Binding D1 di `worker/wrangler.toml` diperbaiki menjadi `DB`, sesuai kode Worker `env.DB`.
- Ditambahkan migration `0003_seed_quran_kemenag.sql` untuk mengisi D1 dengan 114 surah dan 6.236 ayat.

## Menjalankan frontend lokal

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
0001_schema.sql              schema awal
0002_seed_sample.sql         sample pendek lama
0003_seed_quran_kemenag.sql  seed penuh dari JSON Kemenag
```

Catatan: jika database Bapak sudah pernah memakai schema lama, migration `0003` akan menambahkan kolom `page`, `global_ayah_id`, dan `footnotes`, lalu mengganti sample ayat dengan data Kemenag penuh.

## Deploy GitHub Pages

Upload/push isi root repository ini ke GitHub Pages. Frontend akan otomatis memakai:

```text
data/quran-kemenag-combined.json
```

Aplikasi tetap dapat berjalan tanpa Worker untuk fungsi lokal, tetapi jadwal shalat dan sinkronisasi progress ke D1 membutuhkan endpoint Worker.

## Catatan penting

- File audio tidak disimpan di repository; audio memakai sumber eksternal.
- Rekaman setoran di MVP masih berupa object URL lokal. Untuk produksi, simpan file audio ke Cloudflare R2 atau storage lain, sedangkan D1 hanya menyimpan metadata.
- Folder `.wrangler` tidak disertakan dalam paket karena dapat memuat cache akun/deploy lokal.

## Regenerate file gabungan jika JSON Kemenag berubah

```bash
node tools/normalize-kemenag-json.mjs
```


## Catatan Migrasi D1: SQLITE_TOOBIG

Jika muncul error seperti:

```text
statement too long: SQLITE_TOOBIG
```

penyebabnya biasanya file seed Al-Qur’an terlalu besar jika dimasukkan dalam satu `INSERT` panjang. Versi ini sudah memecah seed ayat menjadi banyak file migration kecil `0004_seed_quran_kemenag_part_*.sql`, masing-masing berisi statement kecil per ayat.

Untuk database development yang sebelumnya sempat gagal migrasi, cara paling bersih adalah menjalankan ulang migration setelah mengganti folder `worker/migrations` dengan versi ini. Jika masih gagal karena skema lama tersisa, hapus/recreate D1 database development, lalu apply migration dari awal.
