# ARSITEKTUR FRONTEND
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-FE-001 |
| Status | Berlaku (Aktif) - Versi 1.0 |
| Audiens | Frontend Developer, Reviewer, Tech Lead |
| Sifat Dokumen | Keputusan struktural & alasan di baliknya. Aturan penulisan kode sehari-hari ada di `DEV-CODE-001`. |
| Dokumen Induk | `SID-ARCH-SYS-001` (System Architecture) |

---

## 1. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Framework UI | React (function component only) | |
| Build Tool | Vite | |
| Styling | Tailwind CSS | Terintegrasi dengan `sid-design-tokens.css` (lihat S6) |
| Server State | TanStack Query | Lihat rasional pemilihan di S2 |
| Form & Validasi | React Hook Form + Zod | |
| Routing | React Router | |
| Type Documentation | JSDoc (bukan TypeScript) | |
| Linting/Formatting | ESLint + Prettier + Husky (pre-commit) | Detail konfigurasi di `DEV-CODE-001` |
| Testing | Lihat `DEV-TEST-001` | |

---

## 2. Pola Arsitektur & Alur Data

**Pola:** Single Page Application (SPA), berkomunikasi dengan Backend Laravel API melalui REST, terautentikasi via Sanctum.

**Pemisahan Server State vs UI State** - ini keputusan struktural, bukan sekadar preferensi library:

- **Server state** (data yang sumber kebenarannya ada di Backend - daftar surat, status `PipelineStep`, data warga) ditangani **TanStack Query**. Alasan: data ini butuh caching, invalidasi saat berubah, dan sinkronisasi ulang otomatis - menyimpannya manual di `useState`/Context berisiko FE menampilkan data yang sudah usang tanpa disadari developer.
- **UI state** (modal terbuka, tab aktif) tetap `useState`/`useReducer` lokal - tidak dipaksakan lewat state management global. Pemakaian state management library global (Redux, Zustand, dsb.) **sengaja dihindari** kecuali kebutuhan nyata membuktikan Context tidak cukup - konsisten dengan prinsip anti-premature-abstraction yang berlaku di seluruh arsitektur program.

---

## 3. Struktur Folder (Feature-Based)

```
/src
  /features
    /surat                  (pengajuan & approval surat)
    /kependudukan           (master data, staging perubahan data)
    /cms                    (Profil Desa, Berita - Admin Desa)
    /admin-config           (konfigurasi pipeline, Bidang/Jabatan - Superadmin)
  /shared
    /components             (komponen lintas-fitur)
    /hooks                  (hook lintas-fitur)
    /lib                    (api client, utilitas)
  /routes                   (definisi routing & access guard per Tier)
```

**Alasan struktural:** dengan 5-Tier RBAC dan 4 domain bisnis yang cukup independen satu sama lain (lihat `SID-ARCH-SYS-001` S2), struktur folder berbasis tipe file (`/components`, `/pages`, `/hooks` generik) akan cepat kehilangan batas domain. Struktur feature-based menjaga setiap domain bisnis tetap mandiri dan mudah ditelusuri oleh kontributor baru.

Aturan penerapan detail (kapan komponen boleh naik ke `/shared`, dsb.) ada di `DEV-CODE-001`.

---

## 4. Lapisan API Client

Satu lapisan terpusat (`/shared/lib/api`) membungkus seluruh komunikasi ke Backend - menangani penyisipan token Sanctum, normalisasi format error sesuai kontrak baku (`{ error: { code, message, details } }`), dan penanganan sesi kedaluwarsa secara seragam.

**Alasan struktural:** tanpa lapisan ini, penanganan token/error akan terduplikasi di banyak komponen, dan perubahan kontrak API di Backend akan memaksa perubahan di banyak titik Frontend sekaligus.

---

## 5. Arsitektur Routing & Access Guard

Routing dikelompokkan berdasarkan RBAC Tier. Satu komponen `ProtectedRoute`/guard terpusat membaca Tier & Segment dari sesi pengguna dan mengarahkan (redirect) pengguna yang tidak berwenang - bukan pengecekan kewenangan yang ditulis berulang di tiap halaman.

Halaman dengan beban berat (dashboard Admin, halaman konfigurasi pipeline Superadmin) menggunakan lazy-loading (`React.lazy` + `Suspense`) agar tidak membebani waktu muat awal aplikasi bagi pengguna Tier lain yang tidak mengakses halaman tersebut.

---

## 6. Pola Komponen Kunci: `ApprovalStepRenderer`

Ini adalah komponen paling penting secara arsitektural di SIDUTama Frontend, karena **merealisasikan prinsip pipeline dinamis Backend di sisi antarmuka**.

**Masalah yang diselesaikan:** Backend sudah dirancang agar alur persetujuan surat (`PipelineStep`) sepenuhnya data-driven - siapa penyetuju, apakah reject-capable atau sign-of-record, semua bisa berubah lewat konfigurasi tanpa deploy ulang Backend. Jika Frontend membuat komponen terpisah per role (`RTApprovalCard`, `RWApprovalCard`, `KadusApprovalCard`, dst.), setiap perubahan konfigurasi pipeline di Backend akan tetap memaksa perubahan kode Frontend - meniadakan manfaat arsitektur data-driven yang sudah dibangun.

**Solusi struktural:** satu komponen generik `ApprovalStepRenderer` menerima `approver_ref` dan `authority_type` sebagai data dari API, lalu merender antarmuka yang sesuai (tombol Reject hanya muncul jika `authority_type = reject_capable`). Komponen ini tidak pernah memuat logic spesifik per role di dalam kodenya sendiri.

Detail implementasi (batas ukuran, dokumentasi props) ada di `DEV-CODE-001`.

---

## 7. Integrasi Design System

`tailwind.config.js` meng-extend theme dari token yang didefinisikan di `sid-design-tokens.css` (warna primer, warna status semantik: amber/blue/green/red/coral). Ini memastikan satu sumber kebenaran desain - nilai warna tidak pernah ditulis manual sebagai hex di dalam kode komponen.

---

## 8. Referensi Silang

| Kebutuhan | Dokumen |
|---|---|
| Aturan penulisan kode (naming, batas ukuran komponen, konvensi styling) | `DEV-CODE-001` |
| Strategi & cakupan pengujian Frontend | `DEV-TEST-001` |
| Skema `LetterType`/`PipelineStep` yang menjadi sumber data `ApprovalStepRenderer` | `SID_Arsitektur_RoleSegmentation_Pipeline_Kependudukan_Tahap2.md` |

---

## 9. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal |
