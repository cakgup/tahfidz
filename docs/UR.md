# User Requirement Ringkas — Hifz Companion

## Tujuan
Membantu penghafal Qur'an menyusun target, mengulang ayat, menyembunyikan teks untuk tes hafalan, mencatat progres, membuat jadwal murajaah, dan mengirim setoran kepada guru.

## Aktor
- Santri/penghafal
- Guru/musyrif
- Wali/orang tua
- Admin

## Requirement utama
- UR-01: Sistem menyediakan reader Qur'an dengan teks Arab dan terjemahan.
- UR-02: Sistem menyediakan mode hafalan ayat per ayat.
- UR-03: Sistem menyediakan pengaturan pengulangan.
- UR-04: Sistem menyediakan mode sembunyikan ayat bertahap.
- UR-05: Sistem menyimpan status ayat: belum, hafal, sulit, perlu murajaah.
- UR-06: Sistem membuat jadwal murajaah otomatis.
- UR-07: Sistem menyediakan dashboard progres.
- UR-08: Sistem menyediakan fitur rekam setoran.
- UR-09: Sistem menyediakan ruang penilaian guru pada fase lanjutan.
- UR-10: Sistem menggunakan tema biru dan kuning.
- UR-11: Sistem menampilkan jadwal shalat pada header.
- UR-12: Sistem dapat mengacu pada pola konten JSON PPSA untuk konten Arab-terjemahan.

## Arsitektur

```text
GitHub Pages → Frontend statis/PWA
Cloudflare Worker → REST API, validasi, auth, integrasi jadwal shalat
Cloudflare D1 → data user, progres, murajaah, setoran, cache jadwal shalat
Cloudflare R2 → rekomendasi untuk rekaman audio produksi
```
