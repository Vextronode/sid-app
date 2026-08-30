# ARSITEKTUR SISTEM
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-SYS-001 |
| Status | Berlaku (Aktif) - Versi 1.1 |
| Nama Aplikasi | SIDUTama Cibenda (nickname: **SIDUTama**) |
| Kode Proyek | SID (tidak berubah, terpisah dari nama aplikasi) |
| Audiens | Seluruh developer (Backend & Frontend), Reviewer, Tech Lead, QA Coordinator, kontributor baru |
| Sifat Dokumen | **Titik masuk tunggal (single entry point).** Dokumen ini dirancang agar developer dapat memahami keseluruhan sistem SIDUTama hanya dengan membaca dokumen ini. Detail teknis per sisi ada di dokumen turunan yang dirujuk pada setiap bagian. |

---

## 1. Visi & Prinsip Arsitektur

SIDUTama Cibenda dibangun di atas empat prinsip arsitektur yang bersifat final dan tidak dapat diubah tanpa melalui Architecture Working Group (AWG):

1. **Independent Domain.** SIDUTama berdiri sendiri secara domain, database, dan deployment dari sistem lain dalam ekosistem program (SIGAP, CibendaMart). Interoperabilitas antar sistem disiapkan lewat API, bukan melalui shared database.
2. **Konfigurasi di atas Kode (Config over Code).** Aspek yang dapat berubah tanpa keterlibatan developer (alur persetujuan surat, pemetaan jenis surat ke penyetuju) bersifat data-driven, bukan hardcoded. Direalisasikan lewat struktur `letter_categories` → `approval_flows` → `flow_steps` (lihat S2.1 dan `SID-ARCH-BE-001` S3).
3. **RBAC Berlapis (Layered RBAC).** Kewenangan sistem dikomunikasikan dalam 5 kelompok tier untuk kebutuhan navigasi & orientasi (Superadmin, Admin Desa/Eksekutif, Staff Desa, RT/RW, Warga) - lihat S4 untuk penjelasan bagaimana pengelompokan ini dipetakan ke struktur role yang sebenarnya diimplementasikan di database.
4. **Human-in-the-Loop untuk Keputusan Sensitif.** Sistem menyediakan data dan alat bantu; keputusan yang berdampak pada warga (approval surat, klasifikasi data sensitif) tetap berada di tangan manusia.

---

## 2. Peta Domain Bisnis (POV)

SIDUTama melayani empat domain bisnis utama. Setiap domain memiliki dokumen arsitektur/skema detail tersendiri - bagian ini hanya memberi orientasi.

### 2.1 Pelayanan Surat-Menyurat & Pipeline Dinamis
Domain inti SIDUTama. Setiap jenis surat (`letter_types`) dikelompokkan ke dalam empat kategori perilaku (`letter_categories.code`): Approval Normal, Upload Mandiri, Dokumen Pendukung, dan Update Data Kependudukan. Di dalam kategori Approval Normal, alur persetujuan konkret ditentukan oleh `approval_flows` beserta urutan penyetujunya (`flow_steps.approver_position`, `flow_steps.is_final`) - satu kategori bisa memiliki banyak flow berbeda, dan flow baru ditambahkan sebagai data, bukan perubahan kode. Domain ini juga mencakup mekanisme operasional pendukung yang **sudah** memiliki desain (overdue/reminder, fallback broadcast), serta dua mekanisme (void/cancel, verifikasi surat berbasis QR) yang **baru sebatas disebut sebagai wacana** - belum punya skema atau keputusan teknis, lihat `SID-ARCH-BE-001` S10.

### 2.2 Manajemen Kependudukan
Mengelola data warga (master data 4 lapis: identitas inti, sosio-demografi, indikator sosio-ekonomi, klasifikasi kesejahteraan). Seluruh warga tercatat - baik berstatus lokal maupun pendatang - selalu memiliki NIK terverifikasi pada satu tabel yang sama; pembedaan lokal/pendatang murni status (`residency_type`), bukan struktur data terpisah (lihat `SID-ARCH-BE-001` S5.2). Mencakup mekanisme impor massal (Excel) yang sudah didesain (UC-09). Kapabilitas warga mengajukan perubahan data secara self-service (staging) **masih sebatas wacana** - bertentangan dengan UC-09 saat ini yang aktornya hanya Petugas Desa, lihat `SID-ARCH-BE-001` S10.

### 2.3 Manajemen Informasi Desa (CMS)
Pengelolaan Profil Desa, Berita & Pengumuman, dan Peraturan Desa yang tampil di halaman publik. Domain ini dimiliki eksklusif oleh `petugas_desa` - **bukan** seluruh Tier 2. Kepala Desa dan Sekretaris Desa (juga bagian Tier 2, lihat S4) secara eksplisit **tidak** memiliki akses ke domain ini; scope mereka di sistem murni sebagai approver aktif di domain Surat-Menyurat (S2.1). Pengelompokan Tier 2 sebagai satu label navigasi tidak berarti seluruh anggotanya berbagi akses domain yang sama - lihat S4 untuk penjelasan lengkap.

### 2.4 Governance & RBAC
Mengatur struktur RBAC (lihat S4), segmentasi Bidang/Jabatan untuk Staff Desa, serta struktur wilayah administratif (Dusun/RW/RT) yang menjadi dasar gating pada domain Surat-Menyurat dan Kependudukan.

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

Autentikasi antara Frontend dan Backend menggunakan **Laravel Sanctum** (SPA cookie-based, bukan Bearer token manual). Detail pola auth, middleware RBAC, dan kontrak API diatur di dokumen arsitektur masing-masing sisi.

---

## 4. RBAC: Tier Navigasi vs Role Implementasi

Bagian ini secara khusus mengklarifikasi hubungan antara **5 Tier** yang disebut di S1 sebagai prinsip komunikasi/navigasi, dengan **struktur role yang sebenarnya diimplementasikan** di database dan middleware backend.

**Penting:** 5-Tier **bukan** tabel atau kolom terpisah di database. Backend hanya menyimpan `users.role` sebagai satu ENUM datar berisi 9 nilai. Tier adalah label pengelompokan di level dokumentasi dan navigasi Frontend (menentukan struktur menu, guard routing) di atas 9 role tersebut - lihat `SID-ARCH-BE-001` S4.1 untuk detail implementasi otorisasi yang sesungguhnya.

| Tier | Label Navigasi | `users.role` yang termasuk | Catatan |
|---|---|---|---|
| 1 | Superadmin | *(belum ada)* | Slot dicadangkan untuk kebutuhan masa depan (misal admin lintas-desa jika sistem berkembang multi-desa). **Tidak diimplementasikan** - tidak ada role, middleware, atau halaman untuk tier ini saat ini. |
| 2 | Admin Desa / Eksekutif | `petugas_desa`, `kepala_desa`, `sekretaris_desa` | Satu label navigasi untuk dua kelompok dengan scope otorisasi **berbeda tegas**: `petugas_desa` adalah operator dengan full visibility pipeline surat + akses konfigurasi (wilayah, jabatan, tipe surat, CMS); `kepala_desa`/`sekretaris_desa` adalah approver aktif di step tertentu pipeline surat (sejak v5.0), tanpa akses konfigurasi. Pengelompokan tier ini **tidak menghapus** perbedaan scope ini di backend. |
| 3 | Staff Desa | `kasi_pelayanan`, `kaur_tu_umum` | Approver final di pipeline surat, resolusi kewenangan berbasis posisi (bukan wilayah) |
| 4 | RT/RW | `rt`, `rw` | RT tetap approver bergerbang wilayah; RW sejak v5.0 **bukan approver**, murni penerima notifikasi FYI - lihat `SID-ARCH-BE-001` S3.2 |
| 5 | Warga | `warga` | Self-service: submit surat, lihat status, download surat sendiri |

Setiap kali dokumen arsitektur atau turunannya menyebut "Tier X", itu harus dibaca sebagai referensi ke kelompok role pada tabel di atas - bukan entitas independen yang punya perilaku sendiri di luar role yang menyusunnya.

---

## 5. Topologi Deployment

| Environment | Lokasi Hosting | Aktif Sejak |
|---|---|---|
| Staging | Hosting Kampus | Sejak Sprint Foundation |
| Production | Hosting Desa | Setelah Gate G7 (Deployment Ready) tercapai |

Detail konfigurasi environment (`.env`, secret handling) diatur di **DEV-CODE-001 (Code Guidelines)**.

---

## 6. Tabel Navigasi Dokumen

Dokumen ini sengaja tidak memuat detail teknis per sisi - gunakan tabel berikut untuk menuju dokumen yang relevan.

| Kebutuhan | Dokumen Rujukan |
|---|---|
| Arsitektur & tech stack Frontend | `SID-ARCH-FE-001` |
| Arsitektur & tech stack Backend | `SID-ARCH-BE-001` |
| Aturan penulisan kode sehari-hari | `DEV-CODE-001` (Code Guidelines) |
| Strategi & cakupan pengujian | `DEV-TEST-001` (Testing) |
| Alur kerja Git & review | `DEV-GIT-001` (Git Workflow) |
| Skema domain Surat & Pipeline (`letter_categories`, `approval_flows`, `flow_steps`) | `SID_Arsitektur_RoleSegmentation_Pipeline_Kependudukan_Tahap2.md`, `SID_Addendum_KategoriLetterType_OperasionalPipeline_Verifikasi.md` |
| Skema domain Kependudukan | `SID_MasterData_Kependudukan_NIK_Cibenda.md` |
| Alur interaksi per aktor (Business Workflow) | `01_BWF_Overview_v1.puml` s.d. `05_BWF_SistemOtomatis_v1.puml` |
| Standar keamanan lintas program | `AWG-SEC-001` s.d. `AWG-SEC-007` |
| Standar observability lintas program | `AWG-OBS-001`, `AWG-OBS-002` |

---

## 7. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal sebagai titik masuk arsitektur SIDUTama Cibenda |
| 1.1 | - | Tambah S4 (RBAC: Tier Navigasi vs Role Implementasi) untuk mengklarifikasi bahwa 5-Tier adalah label di atas 9-role ENUM TDD v5.0, bukan struktur DB terpisah. Selaraskan istilah pipeline surat di S2.1 & S6 ke terminologi skema final (`letter_categories`/`approval_flows`/`flow_steps`), menggantikan istilah `PipelineStep` generik sebelumnya. Koreksi S2.2: hapus penyebutan "warga Non-NIK" - bertentangan dengan keputusan final TDD v5.0 bahwa seluruh warga tercatat selalu punya NIK, dibedakan murni lewat `residency_type`. Koreksi S2.3: CMS eksklusif milik `petugas_desa`, bukan seluruh Tier 2 (Kades/Sekdes tidak punya akses). Tandai QR Verification, Void/Cancel, dan Staging Perubahan Data Self-Service di S2.1/S2.2 sebagai wacana belum berdesain, lihat `SID-ARCH-BE-001` S10. |
