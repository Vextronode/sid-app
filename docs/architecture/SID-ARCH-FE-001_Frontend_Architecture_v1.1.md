# ARSITEKTUR FRONTEND
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-FE-001 |
| Status | Berlaku (Aktif) - Versi 1.1 |
| Audiens | Frontend Developer, Reviewer, Tech Lead |
| Sifat Dokumen | Keputusan struktural & alasan di baliknya. Aturan penulisan kode sehari-hari ada di `DEV-CODE-001`. |
| Dokumen Induk | `SID-ARCH-SYS-001` (System Architecture) |

---

## 1. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Framework UI | React (function component only) | |
| Build Tool | Vite | |
| Styling | Tailwind CSS | Terintegrasi dengan `sid-design-tokens.css` (lihat S7) |
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

- **Server state** (data yang sumber kebenarannya ada di Backend - daftar surat, status `flow_steps` yang sedang aktif, data warga) ditangani **TanStack Query**. Alasan: data ini butuh caching, invalidasi saat berubah, dan sinkronisasi ulang otomatis - menyimpannya manual di `useState`/Context berisiko FE menampilkan data yang sudah usang tanpa disadari developer.
- **UI state** (modal terbuka, tab aktif) tetap `useState`/`useReducer` lokal - tidak dipaksakan lewat state management global. Pemakaian state management library global (Redux, Zustand, dsb.) **sengaja dihindari** kecuali kebutuhan nyata membuktikan Context tidak cukup - konsisten dengan prinsip anti-premature-abstraction yang berlaku di seluruh arsitektur program.

---

## 3. Struktur Folder (Feature-Based)

```
/src
  /features
    /surat                  (pengajuan & approval surat)
    /kependudukan           (master data, staging perubahan data)
    /cms                    (Profil Desa, Berita - Admin Desa)
    /admin-config           (konfigurasi pipeline approval, Bidang/Jabatan - Petugas Desa)
  /shared
    /components             (komponen lintas-fitur)
    /hooks                  (hook lintas-fitur)
    /lib                    (api client, utilitas)
  /routes                   (definisi routing & access guard per Tier)
```

**Alasan struktural:** dengan RBAC berlapis (lihat `SID-ARCH-SYS-001` S4) dan 4 domain bisnis yang cukup independen satu sama lain (lihat `SID-ARCH-SYS-001` S2), struktur folder berbasis tipe file (`/components`, `/pages`, `/hooks` generik) akan cepat kehilangan batas domain. Struktur feature-based menjaga setiap domain bisnis tetap mandiri dan mudah ditelusuri oleh kontributor baru.

> Catatan: `/admin-config` sebelumnya dilabeli "Superadmin" - karena role Superadmin belum diimplementasikan (lihat `SID-ARCH-SYS-001` S4), halaman-halaman di folder ini saat ini diakses oleh `petugas_desa` (Tier 2 - Admin Desa/Eksekutif).

Aturan penerapan detail (kapan komponen boleh naik ke `/shared`, dsb.) ada di `DEV-CODE-001`.

---

## 4. Lapisan API Client

Satu lapisan terpusat (`/shared/lib/api`) membungkus seluruh komunikasi ke Backend - menangani penyisipan token Sanctum, normalisasi format error sesuai kontrak baku (`{ error: { code, message, details } }`), dan penanganan sesi kedaluwarsa secara seragam.

**Alasan struktural:** tanpa lapisan ini, penanganan token/error akan terduplikasi di banyak komponen, dan perubahan kontrak API di Backend akan memaksa perubahan di banyak titik Frontend sekaligus.

---

## 5. Arsitektur Routing & Access Guard

Routing dikelompokkan berdasarkan RBAC Tier (lihat `SID-ARCH-SYS-001` S4 untuk mapping Tier ke `users.role`). Satu komponen `ProtectedRoute`/guard terpusat membaca `role` dari sesi pengguna, memetakannya ke Tier yang relevan di sisi Frontend, dan mengarahkan (redirect) pengguna yang tidak berwenang - bukan pengecekan kewenangan yang ditulis berulang di tiap halaman.

Karena satu Tier (Admin Desa/Eksekutif) mencakup role dengan scope berbeda (`petugas_desa` vs `kepala_desa`/`sekretaris_desa` - lihat `SID-ARCH-SYS-001` S4), guard di level route tetap harus memeriksa `role` secara spesifik untuk halaman yang scope-nya tidak identik di dalam satu Tier yang sama (misalnya halaman konfigurasi tipe surat hanya untuk `petugas_desa`, sedangkan halaman approval surat untuk `kepala_desa`/`sekretaris_desa`) - pengelompokan Tier tidak menggantikan kebutuhan pengecekan role granular ini.

Halaman dengan beban berat (dashboard Admin, halaman konfigurasi pipeline approval) menggunakan lazy-loading (`React.lazy` + `Suspense`) agar tidak membebani waktu muat awal aplikasi bagi pengguna Tier lain yang tidak mengakses halaman tersebut.

---

## 6. Pola Komponen Kunci: `ApprovalStepRenderer`

Ini adalah komponen paling penting secara arsitektural di SIDUTama Frontend, karena **merealisasikan prinsip pipeline dinamis Backend di sisi antarmuka**.

**Masalah yang diselesaikan:** Backend sudah dirancang agar alur persetujuan surat sepenuhnya data-driven lewat struktur `letter_categories` → `approval_flows` → `flow_steps` (lihat `SID-ARCH-BE-001` S3) - siapa penyetuju di tiap tahap (`flow_steps.approver_position`) dan apakah tahap itu tahap terakhir (`flow_steps.is_final`) semuanya bisa berubah lewat konfigurasi tanpa deploy ulang Backend. Jika Frontend membuat komponen terpisah per role (`RTApprovalCard`, `RWApprovalCard`, `KadesApprovalCard`, dst.), setiap perubahan konfigurasi flow di Backend akan tetap memaksa perubahan kode Frontend - meniadakan manfaat arsitektur data-driven yang sudah dibangun.

**Solusi struktural:** satu komponen generik `ApprovalStepRenderer` menerima data step aktif dari API (`current_step_order` surat, di-JOIN Backend ke `flow_steps` yang cocok) berisi minimal `approver_position` dan `is_final`, lalu merender antarmuka yang sesuai:

- Tombol **Setujui** dan **Tolak** dirender jika `approver_position` step aktif cocok dengan `role` user yang login.
- Label/badge "Tahap Final" dirender jika `is_final = true` pada step tersebut - dipakai FE untuk menampilkan pesan konfirmasi berbeda ("keputusan ini akan menerbitkan nomor surat" vs "keputusan ini akan diteruskan ke tahap berikutnya").
- Untuk role yang bukan approver di step manapun (khususnya **RW**, yang sejak v5.0 tidak pernah menjadi `approver_position` yang valid di `flow_steps` - lihat `SID-ARCH-BE-001` S3.2), komponen ini **tidak pernah merender tombol approve/reject sama sekali**. RW hanya menerima data surat dalam mode notifikasi/riwayat read-only, dilayani komponen tampilan terpisah (bukan `ApprovalStepRenderer`), karena secara struktural RW tidak pernah menjadi target endpoint decision.

Komponen ini tidak pernah memuat logic spesifik per role di dalam kodenya sendiri - satu-satunya input yang menentukan perilakunya adalah data step yang diterima dari API.

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
| Skema `letter_types`/`letter_categories`/`approval_flows`/`flow_steps` yang menjadi sumber data `ApprovalStepRenderer` | `SID_Arsitektur_RoleSegmentation_Pipeline_Kependudukan_Tahap2.md` |
| Detail implementasi Backend untuk pipeline dinamis, resolve approver, dan RBAC | `SID-ARCH-BE-001` S3, S4 |

---

## 9. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal |
| 1.1 | - | Ganti istilah `PipelineStep`/`approver_ref`/`authority_type: reject_capable` menjadi terminologi skema final TDD v5.0 (`flow_steps.approver_position`, `flow_steps.is_final`) di S6. Tambah penjelasan eksplisit bahwa RW tidak pernah merender tombol approve/reject. Tambah catatan di S3 & S5 soal perbedaan scope role di dalam Tier Admin Desa/Eksekutif, selaras dengan `SID-ARCH-SYS-001` v1.1 S4. |
