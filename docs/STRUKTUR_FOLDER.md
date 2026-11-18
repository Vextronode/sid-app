---
tags:
  - dev
  - laravel
  - react
  - struktur
  - monorepo
date: 2026-11-19
---

# Struktur Folder Project

---

## Struktur Repo (Monorepo)

```
repo-root/
├── .github/           # workflow CI/CD, CODEOWNERS, PR & issue template
├── .husky/            # git hooks (lint-staged frontend)
├── docs/              # dokumentasi project: api_spec, architecture, bussines_workflow,
│                      # diagram, technical_design, development, thirdparty (kontrak
│                      # Cimart/SIGAP), audit-docs, SETUP.md, STRUKTUR_FOLDER.md, ...
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
│   ├── App.tsx              # semua route + GuestRoute / ProtectedRoute + layout route
│   ├── main.tsx             # QueryClientProvider + CSS global
│   ├── index.css            # Tailwind v4 + token @theme (palet pb-*)
│   ├── assets/
│   ├── components/
│   │   ├── layout/          # MainLayout, OfficialLayout, OperatorDesaLayout, WargaLayout, AppHeader, SiteFooter, ...
│   │   └── ui/              # Button, Input, StatusBadge, OverdueBadge, SimplePagination, PageLoader
│   ├── constants/           # suratStatus
│   ├── features/            # kode per domain, mis.:
│   │   ├── auth/            # contexts/AuthContext, hooks, schemas, services, utils
│   │   ├── surat/           # api/, components/ (DynamicSuratForm, SignatureRequestsCard, FulfillmentPanel, ...), hooks/, utils/
│   │   ├── approval/        # ApprovalStepRenderer, api keputusan
│   │   ├── notifikasi/      # popover, WebPushControls, hooks push & deep link
│   │   ├── cetak-surat/     # PdfCanvasPreview, DownloadSuratMenu, PaperSizeToggle (A4/F4)
│   │   ├── operator-desa/   # constants/roleNavigation.ts (kapabilitas route operator)
│   │   ├── aktivasi-akun/   # aktivasi akun & permintaan ganti foto (Manajemen Akun)
│   │   ├── data-cpmi/       # Data CPMI (F11), CpmiSayaCard, guardianRelation
│   │   ├── data-usaha/      # Data Usaha Warga, UsahaSayaCard (Cimart)
│   │   ├── activity-log/, pelanggan-notifikasi/, integrasi/, peringatan-bencana/
│   │   └── ...              # data-warga, kelola-berita, kelola-wilayah, profil-desa-admin, pekerjaan, organisasi, dst
│   ├── lib/
│   │   ├── api.ts           # instance axios tunggal (withCredentials, withXSRFToken)
│   │   └── constants/       # konstanta route
│   ├── pages/               # halaman publik & warga; pages/admin/ untuk pejabat & operator
│   ├── shared/lib/          # queryClient, queryKeys, apiError, toast, dialog, villageName, villageMap, api/
│   ├── styles/              # sid-global.css, public.css, beranda.css
│   ├── test/                # setup Vitest, fixtures.ts (partialFixture)
│   └── types/               # tipe domain & API lintas fitur (import dari @/types)
├── .env.example             # VITE_APP_NAME, VITE_API_URL, VITE_VAPID_PUBLIC_KEY
├── Dockerfile
├── index.html
├── package.json
├── tsconfig.json            # TypeScript (noEmit; cek dengan npm run typecheck)
└── vite.config.ts           # plugin react, tailwind, PWA; proxy dev /api & /sanctum
```

### Play Rules

- `features/` dikelompokkan per domain - komponen, hook, dan API call satu fitur ditaruh satu folder
- `pages/` = komponen yang langsung dipasang ke route. `components/` = reusable
- Semua request ke backend wajib lewat `src/lib/api.ts` - jangan bikin axios instance baru
- Jangan simpan token auth di `localStorage`; auth memakai cookie session Sanctum
- Identitas desa (nama, logo, kontak) diambil dari API, bukan di-hardcode

### Nambah Fitur Baru

Buat folder `src/features/<fitur>/` (components, hooks, api), halaman di `src/pages/` (atau `src/pages/admin/`), lalu daftarkan route di `src/App.tsx`. Untuk halaman operator, tambahkan kapabilitas role di `features/operator-desa/constants/roleNavigation.ts`.

---

## Struktur Backend (`apps/backend`)

Struktur berikut merangkum lapisan yang benar-benar ada di source. Route API berada di `routes/api.php`; autentikasi web berada di `routes/auth.php`, sedangkan endpoint root berada di `routes/web.php`.

```text
apps/backend/
├── app/
│   ├── Casts/
│   ├── Console/Commands/        # staf-sid:first|recover, letters:backfill-snapshots, approvals:send-reminders,
│   │                            # letters:send-expiry-reminders, announcements:prune, disaster-alerts:prune,
│   │                            # Integration/ (integration:*)
│   ├── Enums/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/{Api,Auth}/   # Api/Integration/ = API pihak ketiga /api/integrations/v1
│   │   ├── Middleware/          # account.active, password.changed, role, verified, integration.client
│   │   ├── Requests/
│   │   └── Resources/
│   ├── Exports/                 # template impor warga, ekspor surat (Excel)
│   ├── Imports/                 # CitizensImport, CitizensWorkbookImport (Excel)
│   ├── Jobs/                    # SendDisasterAlertNotifications
│   ├── Listeners/               # RecordWebPushDelivery
│   ├── Models/
│   ├── Notifications/           # LetterStatusNotification, AccountApproval, PasswordResetRequest,
│   │                            # CimartApplication, DisasterAlert, ...
│   ├── Observers/
│   ├── Policies/
│   ├── Providers/
│   ├── Repositories/
│   ├── Rules/                   # ValidOfficialPosition
│   ├── Services/                # termasuk Services/Auth
│   └── Support/                 # LetterFormSchema, LetterValueFormatter, OfficialPositionCatalog,
│                                # PublicPageCache, VillageImageOptimizer, PaperSize, PdfRescaler,
│                                # LetterIdentityMask, GuardianRelation, PopulationScope, ...
├── config/                      # termasuk letters.php, sid.php, disaster_alerts.php, webpush.php, dompdf.php
├── database/{factories,migrations,seeders}/   # seeders/assets = foto demo; seeders/templates = formulir
│                                              # Disdukcapil (HTML dari Excel); LetterTypeSeeder (Axx),
│                                              # ServiceLetterTypeSeeder (Fxx)
├── docker/                      # entrypoint.sh, php.ini, www.conf
├── resources/views/pdf/templates/   # letter.blade.php (satu view untuk semua PDF)
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