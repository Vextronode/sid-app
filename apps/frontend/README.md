# SIDUTama Frontend

React SPA untuk SIDUTama (Sistem Informasi Desa). Gambaran umum aplikasi, peran, dan cara menjalankan seluruh stack ada di [README utama](../../README.md); setup lokal rinci ada di [`docs/SETUP.md`](../../docs/SETUP.md).

## Stack

React 19 + TypeScript, Vite 8, React Router, TanStack Query, Axios (cookie Sanctum + CSRF), Tailwind CSS v4, Vitest, React Testing Library, ESLint + Prettier (husky/lint-staged).

## Struktur

| Folder                                    | Isi                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages`                               | Halaman per route (publik, warga, pejabat, admin)                                                                                       |
| `src/features`                            | Kode per domain, mis. `surat` (form dinamis surat, Terapkan, unggah hasil), `data-warga`, `approval-*`, `operator-desa`, `activity-log` |
| `src/shared`, `src/components`, `src/lib` | Komponen, util, label, dan API client bersama                                                                                           |
| `src/styles`                              | Design system (`sid-global.css`)                                                                                                        |
| `src/types`                               | Tipe domain & API lintas fitur (`@/types`), bentuknya dari API Resource backend                                                         |

## Perintah

```powershell
npm install
copy .env.example .env   # VITE_APP_NAME, VITE_API_URL, VITE_VAPID_PUBLIC_KEY
npm run dev              # http://127.0.0.1:5173
npm run lint
npm run typecheck        # tsc --noEmit (sekitar 20 detik); build Vite tidak memeriksa tipe
npm run test:run
npm run build
```

CI menjalankan lint, typecheck, test, dan build. Typecheck tidak dipasang di pre-commit karena memeriksa seluruh proyek; jalankan sebelum push.

`VITE_APP_NAME` disamakan dengan `SID_APP_NAME` backend (default **SIDUTama**, label peran staf menjadi "Staf SIDUTama"). Identitas desa (nama, kontak, logo) diambil dari backend, bukan ditulis di kode.

## Dokumentasi terkait

- [`docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md`](../../docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md): routing, API client, dan design system.
- [`docs/STRUKTUR_FOLDER.md`](../../docs/STRUKTUR_FOLDER.md) dan [`docs/development/DEV-CODE-001_Code_Guidelines.md`](../../docs/development/DEV-CODE-001_Code_Guidelines.md): aturan organisasi dan konvensi kode.
