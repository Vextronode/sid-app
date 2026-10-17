# ARSITEKTUR FRONTEND
## SIDUTama (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-FE-001 |
| Status | Berlaku (Aktif) - Versi 1.2 (diselaraskan ke source `apps/frontend` per 2026-10-16) |
| Audiens | Frontend Developer, Reviewer, Tech Lead |
| Sifat Dokumen | Keputusan struktural & alasan di baliknya. Aturan kode sehari-hari ada di `DEV-CODE-001`. |
| Dokumen Induk | `SID-ARCH-SYS-001` |

---

## 1. Tech Stack (dari `package.json`)

| Layer | Teknologi | Catatan |
|---|---|---|
| UI | React 19 (function component) | JSDoc, bukan TypeScript |
| Build | Vite 8 (Rolldown) | Alias `@` → `src`; `build` membuang `console.*`/`debugger`; vendor dipisah ke chunk `react`, `charts`, `pdfjs` |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` | Token di `index.css` (`@theme static`, palet `pb-*`) dan CSS custom property `--sid-*` di `styles/sid-global.css`; font Bricolage Grotesque & Plus Jakarta Sans (`@fontsource`) |
| Server state | TanStack Query 5 | `staleTime` 60 detik, `retry` 1, tanpa refetch saat fokus |
| HTTP | Axios | `withCredentials` + `withXSRFToken` |
| Form | React Hook Form + Zod | |
| Routing | React Router 7 | |
| Grafik | Recharts | |
| PDF | `pdfjs-dist` (pratinjau PDF), `jspdf` | |
| Ikon | `lucide-react` | |
| PWA | `vite-plugin-pwa` (Workbox, `registerType: autoUpdate`) | Service worker mengimpor `public/push-handler.js` untuk Web Push |
| Test | Vitest + Testing Library + jsdom; Playwright (skrip screenshot) | |
| Kualitas | ESLint 10, Prettier, Husky + lint-staged | |

---

## 2. Pola Arsitektur & Alur Data

SPA yang berkomunikasi dengan Laravel API lewat REST, terautentikasi Sanctum cookie.

- **Server state** (surat, warga, notifikasi, konten) lewat TanStack Query dengan kunci terpusat di `shared/lib/queryKeys.js` (`surat`, `kependudukan`, `notifications`, `cms`, `adminConfig`). Aksi yang mengubah surat (mis. keputusan) meng-invalidate `queryKeys.surat.all`.
- **Sesi** di `features/auth/contexts/AuthContext.jsx` (React Context): mengambil `GET /api/user`, CSRF `GET /sanctum/csrf-cookie`, logout `POST /logout`, dan membersihkan cache query saat logout.
- **UI state** tetap lokal (`useState`). Tidak ada state manager global (Redux/Zustand).
- **Identitas desa dari API.** Nama, logo, kontak, dan foto desa diambil dari `/api/villages/profile` atau `/api/public/*`; tidak di-hardcode di komponen.

---

## 3. Struktur Folder (aktual)

```
src/
  App.jsx                 definisi route + GuestRoute/ProtectedRoute
  main.jsx                QueryClientProvider + CSS global
  components/
    layout/               MainLayout, OfficialLayout, OperatorDesaLayout, WargaLayout,
                          AdminLayout, AppHeader, SiteFooter, PublicPageHead, ScrollToTop
    ui/                   Button, Input, StatusBadge, OverdueBadge, SimplePagination, PageLoader, NewsCard
  constants/              suratStatus
  features/
    auth/                 AuthContext (patchUser, pemeriksaan role_forbidden), form login/register,
                          loginRedirect, userPhoto (foto akun vs foto jabatan)
    surat/                API surat/tipe/tanda tangan, DynamicSuratForm, FileUploader,
                          SignatureCard, SignatureRequestsCard, FulfillmentPanel,
                          LetterTypeSettingsPanel, DetailSuratModal, util letterTypeConfig
    warga-surat/, warga-help/
    profil-warga/         EditProfilWargaModal, ProfilePhoto (foto profil akun di halaman Profil)
    approval/             ApprovalStepRenderer, ApprovalStepper, SuratDetailModal, api keputusan
    approval-rt/, approval-rw/, approval-kadus/, approval-kades/
    operator-desa/        roleNavigation (kapabilitas route operator), kartu dashboard
    data-warga/, pekerjaan/, kelola-wilayah/, manajemen-user/
    organisasi/           OrganisasiManager (slot Ketua/Wakil/Anggota, promosi, foto anggota)
    kelola-berita/        berita + kategori berita
    profil-desa-admin/    Kelola Profil Desa (identitas, kop, logo, foto beranda, stempel)
    peraturan/, notifikasi/ (popover, WebPushControls, deep link), dashboard-mobile/
    beranda/              header publik (AccountNavLink: Masuk / Dashboard Saya), konten beranda
    profil-desa/          OrgChart (bagan Perangkat Desa, BPD, Lembaga Desa)
    berita/, info-desa/, info/ (halaman informasi, dev-only)
    cetak-surat/
  pages/                  halaman publik & warga; pages/admin untuk pejabat/operator
  components/ui/          PageLoader, UserAvatar (foto akun di header, avatar default)
  lib/                    api.js (instance Axios + submitDecision; memancarkan event role_forbidden),
                          authEvents.js, pdfjs.js, constants/routes, constants/app (APP_NAME dari
                          VITE_APP_NAME, STAF_APP_LABEL)
  shared/lib/             queryClient, queryKeys, publicVillageParams, villageName, copyText
  styles/                 sid-global.css, public.css, beranda.css
  test/                   setup Vitest
public/
  push-handler.js         handler `push` & `notificationclick` untuk service worker
  assets/                 ikon PWA dan aset seeder (logo/foto default)
```

Struktur berbasis fitur menjaga batas domain; halaman (`pages/`) merakit komponen fitur.

---

## 4. Lapisan API Client

`src/lib/api.js` adalah satu instance Axios untuk seluruh panggilan:
- `baseURL` = `VITE_API_URL` atau origin halaman; `withCredentials` dan `withXSRFToken` aktif; header `Accept: application/json`, `X-Requested-With`.
- Interceptor respons: 403 dengan `code: password_change_required` → redirect ke `/ganti-password`.
- Error lain diteruskan ke pemanggil; bentuk error backend adalah format Laravel `{ message, errors? }` (bukan `{ error: { code, message, details } }`).
- Modul API per fitur (`features/*/api*.js`) membungkus endpoint domainnya.

---

## 5. Routing & Access Guard

Semua route didefinisikan di `App.jsx`:
- `GuestRoute` — untuk halaman login/register/lupa & reset password; user yang sudah login diarahkan ke halaman default role (atau `?redirect=` yang diizinkan) dan ke `/ganti-password` bila wajib ganti kata sandi.
- `ProtectedRoute allowedRoles` — belum login → `/loginpage?redirect=...`; wajib ganti password → `/ganti-password`; role tidak diizinkan → `/`.
- **Layout route** menjaga header/sidebar tetap terpasang: `PublicShell` (MainLayout) untuk halaman publik, `OfficialShell` (OfficialLayout, untuk 8 role pejabat) untuk seluruh `/admin/*`. OfficialLayout memakai sidebar operator untuk Kasi/Kaur/Petugas Desa dan bilah atas untuk RT/RW/Kadus/Kades/Sekdes.
- Halaman operator dibatasi lewat `features/operator-desa/constants/roleNavigation.js` (`OPERATOR_ROUTE_CAPABILITIES`), mis. `/admin/data-warga` untuk Petugas, Kasi, Kaur; halaman kelola lain hanya Petugas Desa; `/admin/surat-saya` untuk pejabat non-Petugas.
- Halaman selain beranda dimuat lazy (`React.lazy` + `Suspense`).
- `/buka-notifikasi` adalah tujuan klik Web Push; meneruskan ke daftar surat yang sesuai peran (atau "Surat Saya" bila penerima adalah pemohon).
- Halaman informasi (Kebijakan Privasi, Aksesibilitas, PPID) hanya didaftarkan di mode dev.
- Respons 403 `code: role_forbidden` memancarkan event `sid:role-forbidden`; AuthContext memeriksa `/api/user` tanpa loader dan, bila perannya berubah (mis. dirotasi), memuat ulang ke `/loginpage` sehingga `GuestRoute` meneruskan ke dashboard peran baru. Staf aplikasi yang merotasi dirinya sendiri langsung dibawa ke `/daftar-surat`.
- Nama aplikasi (`VITE_APP_NAME`, default SIDUTama) dipakai di judul login, `<title>` (plugin kecil di `vite.config.js`), manifest PWA, dan label peran `staf_sid` ("Staf {nama aplikasi}").

| Kelompok | Route utama |
|---|---|
| Publik | `/`, `/berita`, `/berita/:id`, `/profil-desa`, `/bpd`, `/lembaga-desa` (`?lembaga=lpm\|karang_taruna\|pkk`), `/peraturan-desa` |
| Auth | `/loginpage`, `/register`, `/lupa-password`, `/password-reset/:token`, `/ganti-password` |
| Warga | `/daftar-surat`, `/jenis-surat`, `/pengajuan-surat/:kode?`, `/daftar-surat-saya`, `/profile` |
| RT/RW/Kadus/Kades | `/admin/dashboard-surat-{rt,rw,kadus,kades}`, `/admin/list-{rt,rw,kadus,kades}` |
| Operator | `/admin/operator-desa`, `/admin/operator-desa/surat`, `/admin/data-warga`, `/admin/manajemen-user`, `/admin/pejabat-desa`, `/admin/kelola-{wilayah,pekerjaan,berita,peraturan,profil-desa}`, `/admin/approval-{settings,flows}`, `/admin/log-aktivitas`, `/admin/organisasi/{bpd,lembaga}` |
| Pejabat (umum) | `/admin/profile`, `/admin/surat-saya` |

---

## 6. Komponen Kunci

### 6.1 `ApprovalStepRenderer`
Merender tombol Setujui/Tolak hanya bila: step aktif (`current_step.approver_position`) cocok dengan role user (`rt` → rt; `kepala_desa` → kepala_desa/sekretaris_desa), status surat masih dapat diputuskan, dan belum ada keputusan untuk level itu. RW, Kadus, Kasi/Kaur tidak pernah mendapat tombol. Tidak ada logika per-role di luar pemetaan posisi → role tersebut.

### 6.2 `DynamicSuratForm`
Membangun form pengajuan dari `letter_type.form_fields` (text, textarea, date, number, nik, select, file) dan slot tanda tangan (`signature_slots`), lalu mengirim `multipart/form-data` (`payload[...]`, `files[...]`, `signers[...]`, `signature_files[...]`). Validasi akhir tetap di backend.

### 6.3 Tanda tangan & Terapkan
`SignatureCard` (buat/lihat TTD pribadi), `SignatureRequestsCard` (setujui dengan kata sandi/tolak/blokir permintaan TTD), `FulfillmentPanel` (tinjau & Terapkan perubahan data untuk Kasi/Kaur/Petugas), `LetterTypeSettingsPanel` (masa berlaku, penugasan, status aktif).

### 6.4 Web Push
`useWebPushSubscription` + `WebPushControls`: meminta izin, `PushManager.subscribe()` dengan `VITE_VAPID_PUBLIC_KEY`, lalu `POST /api/push-subscriptions`; menonaktifkan memanggil `DELETE`. `push-handler.js` menampilkan notifikasi dan membuka URL same-origin saat diklik.

---

## 7. Design System

Tailwind v4 CSS-first. Token warna aplikasi didefinisikan di `src/index.css` (`@theme static`, palet `pb-*` seperti `pb-ink`, `pb-laut`, `pb-padi`) dan variabel `--sid-*` di `styles/sid-global.css` (mis. `--sid-primary: #185fa5`). Komponen memakai utility dari token tersebut, bukan hex arbitrer.

---

## 8. Build, PWA & Environment

- `.env`: `VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_VAPID_PUBLIC_KEY` (harus sama dengan backend).
- Dev server `127.0.0.1:5173` mem-proxy `/api` dan `/sanctum` ke `127.0.0.1:8000`.
- PWA manifest (nama "SIDUTama Cibenda", ikon 192/512/maskable), `navigateFallback` ke `index.html` kecuali `/api`, `/sanctum`, `/storage`, `/up`; gambar di-cache `StaleWhileRevalidate` 7 hari; chunk pdfjs tidak di-precache.
- Image Docker `sid-web` menyajikan hasil build lewat Nginx bersama proxy ke PHP-FPM (lihat `deploy/`).

---

## 9. Referensi Silang

| Kebutuhan | Dokumen |
|---|---|
| Aturan kode | `DEV-CODE-001` |
| Testing | `DEV-TEST-001` |
| Kontrak API | `docs/api_spec/openapi.yaml` |
| Pipeline & otorisasi backend | `SID-ARCH-BE-001` S3, S4 |

---

## 10. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal |
| 1.1 | - | Terminologi `flow_steps`, RW tanpa tombol keputusan, catatan scope Tier 2 |
| 1.2 | 2026-10-16 | Diselaraskan ke source: stack aktual (React 19, Vite 8, Tailwind 4, PWA), struktur folder aktual, API client & format error Laravel, routing berbasis layout route + `roleNavigation`, komponen form dinamis/TTD/Terapkan/Web Push, token desain `pb-*` |
