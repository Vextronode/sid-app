---
tags:
  - dev
  - laravel
  - react
  - setup
  - sanctum
date: 2026-07-09
---

# Setup Project

Panduan clone dan jalanin project di lokal. Command ditulis untuk **Windows (PowerShell/CMD)**. macOS/Linux hampir sama, beda di cara copy file `.env` (`cp` bukan `copy`).

---

## Prasyarat

- PHP 8.3+ dengan extension `pdo_pgsql` aktif
- Composer
- Node.js 18+ (includes npm)
- PostgreSQL (versi tidak ditetapkan oleh source backend; `DB_CONNECTION=pgsql` saja yang dapat diverifikasi)
- Git

Cek extension PostgreSQL:
```powershell
php -m | findstr pgsql
```
Harus muncul `pgsql` dan `pdo_pgsql`. Kalau kosong, aktifkan `extension=pgsql` dan `extension=pdo_pgsql` di `php.ini`, lalu buka ulang terminal.

---

## Struktur Repo

Monorepo dengan 2 aplikasi di `apps/`:
- `apps/backend` - Laravel (API)
- `apps/frontend` - React SPA (Vite)

---

## 1. Clone Repo

```powershell
git clone https://github.com/org/nama-repo.git
cd nama-repo
```

---

## 2. Setup Backend

```powershell
cd apps\backend
composer install
copy .env.example .env
php artisan key:generate
```

### Buat Database PostgreSQL

```sql
CREATE DATABASE sid_cibenda WITH ENCODING 'UTF8';
```

Jalankan perintah tersebut melalui `psql` atau aplikasi administrasi PostgreSQL yang digunakan tim.

### Edit `.env`

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sid_cibenda
DB_USERNAME=postgres
DB_PASSWORD=isi_password_postgresql_anda

FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
```

> `FRONTEND_URL` dan `SANCTUM_STATEFUL_DOMAINS` harus persis sama dengan port frontend (default Vite = `5173`). Kalau beda, login bakal gagal dengan error `419` atau `401 Unauthenticated`.

### Migrate & Jalanin

Untuk database lokal kosong yang boleh di-reset, jalankan migration dan seeder:

```powershell
php artisan migrate:fresh --seed
```

> `migrate:fresh` menghapus seluruh tabel beserta datanya. Jangan jalankan pada database yang berisi data yang ingin dipertahankan.

Seeder development membuat satu Desa Cibenda dengan 5 dusun, masing-masing 5 RW dan setiap RW 5 RT, serta satu akun untuk setiap role yang didukung. Setiap akun terhubung ke satu citizen dan menggunakan password demo yang sama:

| Role | Username |
|---|---|
| Warga | `demo_warga` |
| RT | `demo_rt` |
| RW | `demo_rw` |
| Kepala Dusun | `demo_kadus` |
| Kasi Pelayanan | `demo_kasi` |
| Kaur TU Umum | `demo_kaur` |
| Petugas Desa (admin) | `demo_admin` |
| Kepala Desa | `demo_kades` |
| Sekretaris Desa | `demo_sekdes` |

**Password semua akun:** `Password123!`

Akun dan identitas tersebut hanya untuk development/testing. Seeder demo menolak berjalan di environment `production`. Untuk mengganti data demo lama, gunakan `migrate:fresh --seed` hanya pada database yang boleh dihapus; menjalankan `db:seed` sendiri tidak menghapus data lama.

Petugas pertama yang sebenarnya dapat diinisialisasi langsung pada database yang belum memiliki Petugas Desa aktif. Untuk citizen baru, berikan data wajib citizen sesuai form dashboard, UUID desa, dan ID RT:

```powershell
php artisan petugas:first --nik=3201012345670001 --name="Nama Petugas" --dob=1980-01-01 --gender=L --address="Alamat Petugas" --village="<UUID_DESA>" --rt=1
```

Ganti `--rt=1` dengan ID RT yang benar-benar ada di desa tersebut. Jika citizen sudah ada, cukup berikan `--nik`; command akan membuat akun atau mempromosikan akun warga yang terhubung. Username dibuat otomatis dan password sementara acak hanya ditampilkan sekali. Akun wajib menggantinya saat login pertama. Command menolak jika Petugas Desa aktif sudah ada. Pada database demo hasil `migrate:fresh --seed`, gunakan `demo_admin` untuk login atau reset database tanpa seeder demo sebelum menggunakan `petugas:first`. Petugas selanjutnya dipromosikan dari dashboard.

`petugas:first` hanya untuk bootstrap pertama, bukan command pemulihan akun Petugas yang sudah ada. Belum ada command pemulihan darurat bawaan jika tidak ada Petugas Desa yang dapat login; siapkan prosedur operasional terkontrol sebelum production dan jangan mengatasi kondisi tersebut dengan menjalankan ulang command pada akun Petugas.

Jalankan backend:

```powershell
php artisan serve
```

Backend jalan di `http://localhost:8000`.

---

## 3. Setup Frontend

Buka terminal baru (biarin backend tetap jalan):

```powershell
cd apps\frontend
npm install
copy .env.example .env
npm run dev
```

Frontend jalan di `http://localhost:5173`.

---

## 4. Auth Cookie-based, Bukan Bearer Token

Project pakai **Laravel Sanctum SPA authentication** - session/cookie based, bukan token di localStorage.

- Jangan simpan token di `localStorage` atau `sessionStorage`
- Axios instance di `src/lib/api.js` sudah di-setup `withCredentials: true`
- Sebelum login, wajib panggil `GET /sanctum/csrf-cookie` dulu, baru `POST /login`
- Setelah login, cookie session otomatis kekirim di setiap request — tidak perlu manual attach header

Contoh flow login:
```js
import api from '@/lib/api';

async function login(username, password) {
  await api.get('/sanctum/csrf-cookie');
  const { data } = await api.post('/api/login', { username, password });
  const user = data.user;
  return user;
}
```

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| `could not find driver` | Extension PDO PostgreSQL belum aktif | Aktifkan `pgsql` dan `pdo_pgsql` di `php.ini`, lalu restart terminal |
| `419 Page Expired` saat login | CSRF token tidak sync | Panggil `GET /sanctum/csrf-cookie` dulu, pastiin axios pakai `withCredentials: true` |
| `401 Unauthenticated` setelah login | `SANCTUM_STATEFUL_DOMAINS` tidak sesuai port frontend | Samain persis dengan port `npm run dev`, lalu `php artisan config:clear` |
| Env baru tidak kebaca | Config di-cache | `php artisan config:clear` |
| CORS error | `allowed_origins` tidak sesuai `FRONTEND_URL` | Cek `config/cors.php`, pastiin `supports_credentials: true` |

---

## Cek Cepat Tanpa Frontend

Bisa pakai curl (Git Bash/WSL) atau Postman dengan cookie jar aktif untuk test backend saja. Detail command curl bisa tanya ke tim backend.
[[STRUKTUR_FOLDER]]
