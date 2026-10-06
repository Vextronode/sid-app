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

Struktur berikut merangkum lapisan yang benar-benar ada di source. Route API berada di `routes/api.php`; autentikasi web berada di `routes/auth.php`, sedangkan endpoint root berada di `routes/web.php`.

```text
apps/backend/
??? app/
?   ??? Console/Commands/
?   ??? Enums/
?   ??? Exceptions/
?   ??? Http/
?   ?   ??? Controllers/{Api,Auth}/
?   ?   ??? Middleware/
?   ?   ??? Requests/
?   ?   ??? Resources/
?   ??? Imports/
?   ??? Models/
?   ??? Notifications/
?   ??? Policies/
?   ??? Repositories/
?   ??? Services/
??? database/{factories,migrations,seeders}/
??? resources/views/pdf/templates/
??? routes/{api,auth,console,web}.php
??? tests/{Feature,Unit}/
??? composer.json
??? .env.example
```

Nama class dan file konkret tercantum pada `apps/backend/app`; contoh resource generik tidak digunakan sebagai struktur proyek.

---

## Catatan

Struktur bisa disesuaikan seiring project berkembang. Diskusikan dulu di tim sebelum ubah struktur besar.
[[Environment Standardization]]