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

- PHP 8.2+ dengan extension `pdo_mysql` aktif
- Composer
- Node.js 18+ (includes npm)
- MySQL (atau XAMPP/Laragon)
- Git

Cek extension MySQL:
```powershell
php -m | findstr mysql
```
Harus muncul `mysqli` dan `pdo_mysql`. Kalau kosong, uncomment `extension=pdo_mysql` di `php.ini`.

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

### Bikin Database

```sql
CREATE DATABASE nama_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Edit `.env`

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nama_db
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
```

> `FRONTEND_URL` dan `SANCTUM_STATEFUL_DOMAINS` harus persis sama dengan port frontend (default Vite = `5173`). Kalau beda, login bakal gagal dengan error `419` atau `401 Unauthenticated`.

### Migrate & Jalanin

```powershell
php artisan migrate
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

async function login(email, password) {
  await api.get('/sanctum/csrf-cookie');
  await api.post('/login', { email, password });
  const { data: user } = await api.get('/api/user');
  return user;
}
```

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| `could not find driver` | Extension PDO belum aktif | Aktifin `pdo_mysql` di `php.ini`, restart terminal |
| `419 Page Expired` saat login | CSRF token tidak sync | Panggil `GET /sanctum/csrf-cookie` dulu, pastiin axios pakai `withCredentials: true` |
| `401 Unauthenticated` setelah login | `SANCTUM_STATEFUL_DOMAINS` tidak sesuai port frontend | Samain persis dengan port `npm run dev`, lalu `php artisan config:clear` |
| Env baru tidak kebaca | Config di-cache | `php artisan config:clear` |
| CORS error | `allowed_origins` tidak sesuai `FRONTEND_URL` | Cek `config/cors.php`, pastiin `supports_credentials: true` |

---

## Cek Cepat Tanpa Frontend

Bisa pakai curl (Git Bash/WSL) atau Postman dengan cookie jar aktif untuk test backend saja. Detail command curl bisa tanya ke tim backend.
[[STRUKTUR_FOLDER]]