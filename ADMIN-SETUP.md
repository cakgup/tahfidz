# Panduan Mengubah Role User menjadi Super Admin

## Metode 1: Menggunakan Wrangler CLI (Recommended)

```bash
# 1. Pastikan Anda sudah login ke Cloudflare
wrangler login

# 2. Jalankan migration SQL
wrangler d1 execute your-database-name --file ./worker/migrations/add-super-admin.sql

# Ganti 'your-database-name' dengan nama database D1 Anda (lihat di wrangler.toml)
```

## Metode 2: Menggunakan Cloudflare Dashboard

1. Buka dashboard Cloudflare → Workers & Pages
2. Pilih D1 Database Anda
3. Buka "Console" → SQL editor
4. Copy-paste SQL command dari `worker/migrations/add-super-admin.sql`
5. Execute query

## SQL Command Manual

Jika ingin update user lain, gunakan template ini:

```sql
UPDATE users 
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = 'email-user@domain.com';
```

## Verifikasi

Setelah update, periksa role user dengan:

```sql
SELECT id, name, email, role, status FROM users WHERE lower(email) = 'cakgup@guru.tahfidz';
```

## Role Access Levels

- **santri**: Akses menu Hafalan, Murajaah, Setoran, Progres (tidak bisa edit role)
- **guru**: Akses Panel Guru (beri penilaian setoran santri)
- **admin**: Akses SEMUA fitur (santri + guru + dapat mengelola)

User dengan role `admin` sekarang bisa:
✅ Mengakses semua menu santri (Hafalan, Murajaah, Setoran, Progres)
✅ Mengakses Panel Guru (menilai setoran santri)
✅ Mengubah role santri menjadi guru (jika fitur tersedia di frontend)

## Notes

- Password dan session user tetap tidak berubah
- User bisa langsung menggunakan fitur baru setelah login ulang
- Untuk multiple users, repeat SQL command dengan email berbeda
