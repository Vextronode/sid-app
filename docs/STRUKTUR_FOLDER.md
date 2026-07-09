---
tags:
  - dev
  - laravel
  - react
  - struktur
  - monorepo
date: 2026-07-09
---

# Struktur Folder Project

---

## Struktur Repo (Monorepo)

```
repo-root/
├── .github/           # workflow CI/CD, PR template, dll
├── docs/              # dokumentasi project
├── apps/
│   ├── frontend/      # React SPA (Vite)
│   └── backend/       # Laravel API (Breeze + Sanctum SPA auth)
└── README.md
```

Kenapa pakai `apps/frontend` dan `apps/backend`:
- Root tetap bersih, tidak campur `.env`, `vendor/`, `node_modules/` di root
- Siap kalau nanti nambah `apps/admin` atau `apps/mobile` tanpa refactor
- Konsisten dengan konvensi monorepo (`apps/` atau `packages/`)

Kedua app **independen**, masing-masing punya `.env`, dependencies, dan dev server sendiri. Belum ada shared code antar keduanya.

---

## Struktur Frontend (`apps/frontend`)

```
apps/frontend/
├── public/                  # static assets (favicon, dll)
├── src/
│   ├── assets/              # gambar, font, file static yang di-import
│   ├── components/          # komponen reusable antar fitur
│   │   └── ui/              # komponen dasar (Button, Input, Modal, dll)
│   ├── features/            # kode per fitur/domain
│   │   ├── auth/
│   │   │   ├── components/  # LoginForm, dll
│   │   │   ├── hooks/       # useLogin, dll
│   │   │   └── api.js
│   │   └── dashboard/
│   │       ├── components/
│   │       └── api.js
│   ├── hooks/               # hooks global antar fitur
│   ├── layouts/             # AuthLayout, DashboardLayout, dll
│   ├── lib/
│   │   └── api.js           # axios instance, withCredentials: true
│   ├── pages/               # 1 file = 1 route/halaman
│   ├── routes/              # definisi routing (react-router)
│   ├── context/             # React Context (AuthContext, dll)
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

### Play Rules

- `features/` dikelompokkan per domain, bukan per tipe file - komponen, hook, dan API call satu fitur ditaruh satu folder
- `pages/` = komponen yang langsung dipasang ke route. `components/` = reusable, tidak berdiri sendiri sebagai route
- Semua request ke backend wajib lewat `src/lib/api.js` - jangan bikin axios instance baru di file lain
- Jangan simpan token auth di `localStorage` atau state manapun, auth pakai cookiebased session

### Nambah Fitur Baru

Contoh fitur "profile":
```
src/features/profile/
├── components/
│   └── ProfileForm.jsx
├── hooks/
│   └── useProfile.js
└── api.js
```

Lalu daftarkan route di `src/routes/` dan buat halaman di `src/pages/ProfilePage.jsx`.

---

## Struktur Backend (`apps/backend`)

Murni **REST API** - tidak ada Blade view. Semua response JSON, dikonsumsi frontend React.

```
apps/backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/              # controller REST API per domain
│   │   │   │   ├── ProductController.php
│   │   │   │   └── OrderController.php
│   │   │   └── Auth/             # controller auth bawaan Breeze
│   │   ├── Requests/
│   │   │   └── Api/              # Form Request untuk validasi input
│   │   │       ├── StoreProductRequest.php
│   │   │       └── UpdateProductRequest.php
│   │   ├── Resources/            # transform model -> JSON
│   │   │   └── ProductResource.php
│   │   └── Middleware/
│   ├── Models/
│   ├── Services/                 # business logic
│   │   └── ProductService.php
│   └── Policies/                 # authorization logic per model
├── database/
│   ├── migrations/
│   ├── factories/
│   └── seeders/
├── routes/
│   ├── api.php                   # semua route REST API (/api prefix otomatis)
│   ├── auth.php                  # route login/register/logout bawaan Breeze
│   └── web.php                   # cuma require auth.php, tidak ada route web lain
├── tests/
│   ├── Feature/
│   │   └── Api/
│   └── Unit/
├── .env.example
└── composer.json
```

### Aturan Main

- Semua endpoint API di `routes/api.php`, pakai `Route::apiResource()` untuk CRUD standar:
```php
Route::apiResource('products', ProductController::class);
```

- Controller di `Controllers/Api/` hanya ngurusin HTTP layer — logic bisnis kompleks ke `Services/`
- Validasi input pakai Form Request (`Requests/Api/`), jangan validasi manual di controller
- Response pakai API Resource (`Http/Resources/`) — jangan `return $model` mentah
- `routes/auth.php` tetap di grup `web` (bukan `api.php`) karena butuh session/cookie untuk bekerja

### Nambah Resource Baru

Contoh resource "product":
```bash
php artisan make:model Product -mfs
php artisan make:controller Api/ProductController --api
php artisan make:request Api/StoreProductRequest
php artisan make:request Api/UpdateProductRequest
php artisan make:resource ProductResource
```

Daftarkan di `routes/api.php`:
```php
use App\Http\Controllers\Api\ProductController;

Route::apiResource('products', ProductController::class)
    ->middleware('auth:sanctum');
```

---

## Catatan

Struktur bisa disesuaikan seiring project berkembang. Diskusikan dulu di tim sebelum ubah struktur besar.
[[Environment Standardization]]