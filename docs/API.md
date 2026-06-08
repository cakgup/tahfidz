# API Draft

Base path: `/api`

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/prayer/today?lat=&lng=&location=` | Jadwal shalat hari ini |
| GET | `/quran/surahs` | Daftar surah dari D1 |
| GET | `/quran/surahs/:id/ayahs` | Daftar ayat per surah |
| GET | `/progress` | Progres pengguna demo/header `X-User-Id` |
| POST | `/progress` | Simpan progres ayat |
| GET | `/reviews/today` | Murajaah jatuh tempo hari ini |
| POST | `/submissions` | Simpan metadata setoran |

Catatan: autentikasi pada MVP masih berupa placeholder `X-User-Id`. Produksi wajib mengganti dengan JWT/session yang tervalidasi.
