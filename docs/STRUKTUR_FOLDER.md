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
├── .github/           # workflow CI/CD, CODEOWNERS, PR & issue template
├── .husky/            # git hooks (lint-staged frontend)
├── docs/              # dokumentasi project (api_spec, architecture, diagram,
│                      # technical_design, audit-docs, deploy, development, ...)
├── deploy/            # stack Docker: docker-compose.yml, nginx/, scripts/, *.env.example
├── apps/
│   ├── frontend/      # React SPA (Vite) + Dockerfile (image sid-web)
│   └── backend/       # Laravel API (Sanctum SPA auth) + Dockerfile (image sid-api)
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
├── public/                  # push-handler.js (service worker push), assets/ (ikon PWA, aset default)
├── scripts/                 # skrip bantu (screenshot beranda)
├── src/
│   ├── App.jsx              # semua route + GuestRoute / ProtectedRoute + layout route
│   ├── main.jsx             # QueryClientProvider + CSS global
│   ├── index.css            # Tailwind v4 + token @theme (palet pb-*)
│   ├── assets/
│   ├── components/
│   │   ├── layout/          # MainLayout, OfficialLayout, OperatorDesaLayout, WargaLayout, AppHeader, SiteFooter, ...
│   │   └── ui/              # Button, Input, StatusBadge, OverdueBadge, SimplePagination, PageLoader, NewsCard
│   ├── constants/           # suratStatus
│   ├── features/            # kode per domain, mis.:
│   │   ├── auth/            # contexts/AuthContext, hooks, schemas, services, utils
│   │   ├── surat/           # api/, components/ (DynamicSuratForm, SignatureCard, FulfillmentPanel, ...), hooks/, utils/
│   │   ├── approval/        # ApprovalStepRenderer, api keputusan
│   │   ├── notifikasi/      # popover, WebPushControls, hooks push & deep link
│   │   ├── operator-desa/   # constants/roleNavigation.js (kapabilitas route operator)
│   │   └── ...              # data-warga, kelola-berita, kelola-wilayah, profil-desa-admin, pekerjaan, organisasi, dst
│   ├── lib/
│   │   ├── api.js           # instance axios tunggal (withCredentials, withXSRFToken)
│   │   └── constants/       # konstanta route
│   ├── pages/               # halaman publik & warga; pages/admin/ untuk pejabat & operator
│   ├── shared/lib/          # queryClient, queryKeys, publicVillageParams, villageName
│   ├── styles/              # sid-global.css, public.css, beranda.css
│   └── test/                # setup Vitest
├── .env.example             # VITE_API_URL, VITE_API_BASE_URL, VITE_VAPID_PUBLIC_KEY
├── Dockerfile
├── index.html
├── package.json
└── vite.config.js           # plugin react, tailwind, PWA; proxy dev /api & /sanctum
```

### Play Rules

- `features/` dikelompokkan per domain - komponen, hook, dan API call satu fitur ditaruh satu folder
- `pages/` = komponen yang langsung dipasang ke route. `components/` = reusable
- Semua request ke backend wajib lewat `src/lib/api.js` - jangan bikin axios instance baru
- Jangan simpan token auth di `localStorage`; auth memakai cookie session Sanctum
- Identitas desa (nama, logo, kontak) diambil dari API, bukan di-hardcode

### Nambah Fitur Baru

Buat folder `src/features/<fitur>/` (components, hooks, api), halaman di `src/pages/` (atau `src/pages/admin/`), lalu daftarkan route di `src/App.jsx`. Untuk halaman operator, tambahkan kapabilitas role di `features/operator-desa/constants/roleNavigation.js`.

---

## Struktur Backend (`apps/backend`)

Struktur berikut merangkum lapisan yang benar-benar ada di source. Route API berada di `routes/api.php`; autentikasi web berada di `routes/auth.php`, sedangkan endpoint root berada di `routes/web.php`.

```text
apps/backend/
├── app/
│   ├── Console/Commands/        # petugas:first, letters:backfill-snapshots
│   ├── Enums/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/{Api,Auth}/
│   │   ├── Middleware/          # account.active, password.changed, role, verified
│   │   ├── Requests/
│   │   └── Resources/
│   ├── Imports/                 # CitizensImport (Excel)
│   ├── Models/
│   ├── Notifications/           # LetterStatusNotification (database + WebPush)
│   ├── Policies/
│   ├── Providers/
│   ├── Repositories/
│   ├── Rules/                   # ValidOfficialPosition
│   ├── Services/                # termasuk Services/Auth
│   └── Support/                 # LetterFormSchema, LetterValueFormatter, OfficialPositionCatalog,
│                                # PublicPageCache, VillageImageOptimizer
├── config/                      # termasuk letters.php, webpush.php
├── database/{factories,migrations,seeders}/   # seeders/assets berisi foto demo
├── docker/                      # entrypoint.sh, php.ini, www.conf
├── resources/views/pdf/templates/   # wet.blade.php, digital.blade.php
├── routes/{api,auth,console,web}.php
├── tests/{Feature,Unit}/
├── Dockerfile
├── composer.json
└── .env.example
```

Nama class dan file konkret tercantum pada `apps/backend/app`; contoh resource generik tidak digunakan sebagai struktur proyek.

---

## Catatan

Struktur bisa disesuaikan seiring project berkembang. Diskusikan dulu di tim sebelum ubah struktur besar.
[[Environment Standardization]]