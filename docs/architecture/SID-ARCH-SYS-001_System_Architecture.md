# ARSITEKTUR SISTEM
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-SYS-001 |
| Status | Berlaku (Aktif) - Versi 1.0 |
| Nama Aplikasi | SIDUTama Cibenda (nickname: **SIDUTama**) |
| Kode Proyek | SID (tidak berubah, terpisah dari nama aplikasi) |
| Audiens | Seluruh developer (Backend & Frontend), Reviewer, Tech Lead, QA Coordinator, kontributor baru |
| Sifat Dokumen | **Titik masuk tunggal (single entry point).** Dokumen ini dirancang agar developer dapat memahami keseluruhan sistem SIDUTama hanya dengan membaca dokumen ini. Detail teknis per sisi ada di dokumen turunan yang dirujuk pada setiap bagian. |

---

## 1. Visi & Prinsip Arsitektur

SIDUTama Cibenda dibangun di atas empat prinsip arsitektur yang bersifat final dan tidak dapat diubah tanpa melalui Architecture Working Group (AWG):

1. **Independent Domain.** SIDUTama berdiri sendiri secara domain, database, dan deployment dari sistem lain dalam ekosistem program (SIGAP, CibendaMart). Interoperabilitas antar sistem disiapkan lewat API, bukan melalui shared database.
2. **Konfigurasi di atas Kode (Config over Code).** Aspek yang dapat berubah tanpa keterlibatan developer (alur persetujuan surat, pemetaan jenis surat ke penyetuju) bersifat data-driven, bukan hardcoded.
3. **RBAC Berlapis (Layered RBAC).** Kewenangan sistem diatur dalam 5 tingkat (Superadmin, Admin Desa/Eksekutif, Staff Desa, RT/RW, Warga), dengan segmentasi fungsional di dalam tingkat yang memerlukannya (Bidang untuk Staff Desa, segmen operasional/political untuk Admin Desa/Eksekutif).
4. **Human-in-the-Loop untuk Keputusan Sensitif.** Sistem menyediakan data dan alat bantu; keputusan yang berdampak pada warga (approval surat, klasifikasi data sensitif) tetap berada di tangan manusia.

---

## 2. Peta Domain Bisnis (POV)

SIDUTama melayani empat domain bisnis utama. Setiap domain memiliki dokumen arsitektur/skema detail tersendiri - bagian ini hanya memberi orientasi.

### 2.1 Pelayanan Surat-Menyurat & Pipeline Dinamis
Domain inti SIDUTama. Setiap jenis surat memiliki alur persetujuan (`PipelineStep`) yang dapat berbeda-beda, dikelompokkan ke dalam empat kategori perilaku (`LetterType.category`): Approval Normal, Upload Mandiri, Dokumen Pendukung, dan Update Data Kependudukan. Domain ini juga mencakup mekanisme operasional pendukung: overdue/reminder, void/cancel, fallback broadcast, dan verifikasi surat berbasis QR.

### 2.2 Manajemen Kependudukan
Mengelola data warga ber-NIK (master data 4 lapis: identitas inti, sosio-demografi, indikator sosio-ekonomi, klasifikasi kesejahteraan) dan warga Non-NIK/domisili sementara (data transaksional, tanpa record master). Mencakup mekanisme impor massal (Excel) dan staging perubahan data self-service.

### 2.3 Manajemen Informasi Desa (CMS)
Pengelolaan Profil Desa, Berita & Pengumuman, dan Peraturan Desa yang tampil di halaman publik. Domain ini dimiliki eksklusif oleh segmen Admin Desa (Tier 2), terpisah dari segmen Eksekutif yang bersifat monitoring.

### 2.4 Governance & RBAC
Mengatur struktur 5-Tier RBAC, segmentasi Bidang/Jabatan untuk Staff Desa, serta struktur wilayah administratif (Dusun/RW/RT) yang menjadi dasar gating pada domain Surat-Menyurat dan Kependudukan.

---

## 3. Komponen Sistem

```
┌──────────────────────┐        ┌───────────────────────┐        ┌─────────────────────┐
│   Frontend (SPA)     │◄──────►│   Backend (API)       │◄──────►│   Database          │
│   React + Vite       │  REST  │   Laravel API         │        │   (engine: lihat    │
│   (lihat SID-ARCH-FE)│        │   (lihat SID-ARCH-BE) │        │    SID-ARCH-BE)     │
└──────────────────────┘        └───────────┬───────────┘        └─────────────────────┘
                                            │
                                            ▼
                                 ┌────────────────────────┐
                                 │  Layanan Pendukung     │
                                 │  - Endpoint Verifikasi │
                                 │    QR (publik)         │
                                 │  - Notifikasi          │
                                 └────────────────────────┘
```

Autentikasi antara Frontend dan Backend menggunakan **Laravel Sanctum** (token-based). Detail pola auth, middleware RBAC, dan kontrak API diatur di dokumen arsitektur masing-masing sisi.

---

## 4. Topologi Deployment

| Environment | Lokasi Hosting | Aktif Sejak |
|---|---|---|
| Staging | Hosting Kampus | Sejak Sprint Foundation |
| Production | Hosting Desa | Setelah Gate G7 (Deployment Ready) tercapai |

Detail konfigurasi environment (`.env`, secret handling) diatur di **DEV-CODE-001 (Code Guidelines)**.

---

## 5. Tabel Navigasi Dokumen

Dokumen ini sengaja tidak memuat detail teknis per sisi - gunakan tabel berikut untuk menuju dokumen yang relevan.

| Kebutuhan | Dokumen Rujukan |
|---|---|
| Arsitektur & tech stack Frontend | `SID-ARCH-FE-001` |
| Arsitektur & tech stack Backend | `SID-ARCH-BE-001` |
| Aturan penulisan kode sehari-hari | `DEV-CODE-001` (Code Guidelines) |
| Strategi & cakupan pengujian | `DEV-TEST-001` (Testing) |
| Alur kerja Git & review | `DEV-GIT-001` (Git Workflow) |
| Skema domain Surat & Pipeline | `SID_Arsitektur_RoleSegmentation_Pipeline_Kependudukan_Tahap2.md`, `SID_Addendum_KategoriLetterType_OperasionalPipeline_Verifikasi.md` |
| Skema domain Kependudukan | `SID_MasterData_Kependudukan_NIK_Cibenda.md` |
| Alur interaksi per aktor (Business Workflow) | `01_BWF_Overview_v1.puml` s.d. `05_BWF_SistemOtomatis_v1.puml` |
| Standar keamanan lintas program | `AWG-SEC-001` s.d. `AWG-SEC-007` |
| Standar observability lintas program | `AWG-OBS-001`, `AWG-OBS-002` |

---

## 6. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal sebagai titik masuk arsitektur SIDUTama Cibenda |
