# Hifz Companion

Baseline aplikasi **asisten hafalan Qur'an** berbasis:

- `frontend/` — static web app untuk GitHub Pages
- `worker/` — Cloudflare Worker API
- `worker/migrations/` — schema Cloudflare D1
- `tools/` — adapter konten pola PPSA

Tema visual menggunakan dominasi **biru** dan **kuning**. Header menampilkan **jadwal shalat berikutnya** dengan countdown. Aplikasi dapat berjalan sebagai MVP statis memakai `localStorage`, lalu ditingkatkan menjadi mode database dengan Cloudflare Worker + D1.

## Catatan sumber konten

Repo `cakgup/ppsa` berisi aplikasi doa/wirid statis/PWA dengan `data/doa.json`. Struktur tersebut dijadikan acuan pola konten karena rapi untuk data Arab + terjemahan. Untuk modul hafalan, file `frontend/data/quran-sample.json` hanya berisi contoh beberapa surah pendek. Sebelum produksi, ganti dengan mushaf lengkap dari sumber yang sudah ditabayyun/terverifikasi.

## Struktur

```text
hifz-companion/
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   ├── js/config.js
│   ├── js/app.js
│   ├── data/quran-sample.json
│   ├── manifest.webmanifest
│   └── sw.js
├── worker/
│   ├── src/index.js
│   ├── migrations/0001_schema.sql
│   ├── migrations/0002_seed_sample.sql
│   ├── schema.sql
│   ├── wrangler.toml
│   └── package.json
├── tools/ppsa-content-adapter.mjs
└── docs/
```

## Menjalankan frontend lokal

```bash
cd frontend
python -m http.server 8000
```

Buka:

```text
http://localhost:8000
```

Jangan buka `index.html` langsung via `file://`, karena fetch JSON lokal dan service worker bisa diblokir browser.

## Deploy frontend ke GitHub Pages

1. Buat repository baru, misalnya `hifz-companion`.
2. Upload isi folder `frontend/` ke root repo, atau gunakan branch/folder sesuai preferensi.
3. Buka **Settings → Pages**.
4. Pilih **Deploy from a branch**.
5. Pilih branch `main`, folder `/root`, lalu simpan.

## Deploy Worker + D1

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create hifz-companion-db
```

Salin `database_id` hasil perintah tersebut ke `worker/wrangler.toml`.

Apply migration lokal:

```bash
npx wrangler d1 migrations apply hifz-companion-db --local
```

Apply migration remote:

```bash
npx wrangler d1 migrations apply hifz-companion-db --remote
```

Deploy Worker:

```bash
npx wrangler deploy
```

Setelah Worker aktif, buka aplikasi frontend → **Pengaturan** → isi endpoint API Worker, misalnya:

```text
https://hifz-companion-api.<akun>.workers.dev
```

## Fitur MVP yang sudah disiapkan

- Tampilan mobile-first warna biru dan kuning
- Header sticky berisi jadwal shalat berikutnya dan countdown
- Reader Qur'an contoh
- Mode tampilan: penuh, Arab saja, terjemahan saja, awal ayat, dan tes tanpa teks
- Tandai sudah hafal
- Tandai ayat sulit
- Jadwal murajaah sederhana berbasis localStorage
- Dashboard progres
- Rekam setoran menggunakan browser recording API
- Adapter untuk membaca struktur JSON PPSA
- Service worker PWA/offline-first untuk aset inti
- Worker API dasar dan schema D1

## Pengembangan lanjutan yang disarankan

1. Ganti `quran-sample.json` dengan mushaf lengkap dan valid.
2. Tambahkan autentikasi JWT/session di Worker.
3. Simpan rekaman setoran di Cloudflare R2.
4. Hubungkan progress, review, target, dan submission sepenuhnya ke D1.
5. Tambahkan panel guru/musyrif dan kelas/halaqah.
6. Tambahkan koreksi hafalan berbasis AI pada fase lanjutan.

## Lisensi dan kehati-hatian konten

Apabila menyalin konten/kode langsung dari repo berlisensi GPL, ikuti ketentuan lisensinya. Untuk konten Al-Qur'an, gunakan sumber yang jelas, valid, dan ditabayyun sebelum digunakan secara publik.
