<!--
====================================================================
FILE GABUNGAN - SIDUTama Cibenda - Dokumen Arsitektur
====================================================================
File ini adalah GABUNGAN dari 3 dokumen arsitektur yang aslinya
terpisah. Setiap dokumen asli dipisahkan dengan komentar penanda
"MULAI DOKUMEN" dan "AKHIR DOKUMEN" di bawah, lengkap dengan kode
dokumen aslinya, supaya konteks dan batas antar dokumen tetap jelas
meski sudah digabung dalam satu file.

Daftar isi dokumen yang digabung:
  1. SID-ARCH-SYS-001 - System Architecture (v1.1)   - Dokumen Induk
  2. SID-ARCH-BE-001  - Backend Architecture (v1.0)  - Turunan
  3. SID-ARCH-FE-001  - Frontend Architecture (v1.1) - Turunan

Urutan pembacaan yang disarankan: SYS -> BE -> FE, karena SYS adalah
titik masuk tunggal (single entry point) yang merujuk ke BE dan FE
sebagai dokumen detail per sisi.
====================================================================
-->

<!-- ============================================================ -->
<!-- MULAI DOKUMEN 1 DARI 3: SID-ARCH-SYS-001 (System Architecture, v1.1) -->
<!-- ============================================================ -->

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

<!-- ============================================================ -->
<!-- AKHIR DOKUMEN 1 DARI 3: SID-ARCH-SYS-001 -->
<!-- ============================================================ -->


<!-- ============================================================ -->
<!-- MULAI DOKUMEN 2 DARI 3: SID-ARCH-BE-001 (Backend Architecture, v1.0) -->
<!-- ============================================================ -->

# ARSITEKTUR BACKEND
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-BE-001 |
| Status | Berlaku (Aktif) - Versi 1.0 |
| Audiens | Backend Developer, Reviewer, Tech Lead, QA Coordinator |
| Sifat Dokumen | Keputusan struktural & alasan di baliknya. Aturan penulisan kode sehari-hari ada di `DEV-CODE-001`. Skema tabel lengkap ada di dokumen skema domain (lihat S10). |
| Dokumen Induk | `SID-ARCH-SYS-001` (System Architecture) |

---

## 1. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Framework | Laravel (REST API, pisah repo dari Frontend) | Laravel berperan murni sebagai API provider, tidak merender view |
| Autentikasi | Laravel Sanctum | SPA cookie-based, HttpOnly cookie - bukan localStorage/Bearer token manual |
| Otorisasi | Laravel Policy + middleware RBAC kustom | Lihat S4 - RBAC tidak cukup ditangani `spatie/laravel-permission` generik karena ada segmentasi non-hierarkis |
| Database Engine | PostgreSQL 16 | MVCC, partial index, JSONB, `EXPLAIN ANALYZE` untuk benchmarking |
| ORM | Eloquent ORM | Enkripsi field via `$casts`, raw query dilarang |
| Queue & Jobs | Laravel Queue (driver: database di Tahap 1; Redis + Horizon di Tahap 2) | Async: notifikasi, reminder deadline, PDF generation dipicu sinkron tapi tidak diblok proses lain |
| Event System | Laravel Events & Listeners | `LetterSubmitted`, `FlowStepDecided`, dst - lihat S3 |
| Scheduler | Laravel Scheduler (cron) | Reminder overdue (setiap jam), backup terjadwal |
| PDF Generation | `barryvdh/laravel-dompdf` | On-demand, tidak ada file tersimpan di server - lihat S6 |
| Import Data | `maatwebsite/excel` | Import massal data warga |
| Audit Trail | `spatie/laravel-activitylog` + tabel `letter_status_logs` kustom | Lihat S8 |
| API Docs | Postman / Swagger (OpenAPI) | Wajib sebelum handover |
| Dev Monitoring | Laravel Telescope | Dev/staging only |
| Data Dummy | Laravel Seeders & Factories | Untuk benchmarking query (10.000-50.000 records) |

---

## 2. Pola Arsitektur & Alur Data

**Pola:** Layered Architecture dengan pemisahan tegas per tanggung jawab:

```
Controller  →  Form Request  →  Service  →  Repository  →  Eloquent Model  →  DB
                                     ↓
                                  Policy (otorisasi)
                                     ↓
                             Event → Listener → Job (Queue) → Notification
```

**Alasan struktural per layer:**

- **Controller** hanya menangani HTTP concern (parsing request, memanggil Service, membentuk response). Tidak pernah berisi query atau business rule.
- **Form Request** menangani validasi input murni (format, required, unique constraint sederhana). Validasi yang butuh business context (misal "apakah surat ini masih di step yang sesuai") tetap di Service, bukan di Form Request, karena butuh akses ke state lain yang bukan urusan validasi input.
- **Service** adalah satu-satunya layer yang boleh mengorkestrasi banyak Repository dan menjalankan `DB::transaction()`. Business rule (gate logic, resolusi approver, kalkulasi `expires_at`) hidup di sini, bukan di Controller maupun Model.
- **Repository** membungkus query Eloquent. Alasan tetap dipertahankan meski proyek berskala capstone (bukan enterprise besar): domain Surat-Menyurat punya query yang sama dipakai lintas Service (`findByFlowStepAndStatus` dipakai baik oleh dashboard, notifikasi, maupun reminder scheduler) - tanpa Repository, query itu akan terduplikasi atau Service saling bergantung ke Model orang lain.
- **Policy** khusus untuk pertanyaan "bolehkah user ini melakukan aksi ini pada resource ini" - dipisah dari Service supaya aturan otorisasi bisa diaudit di satu tempat per resource, konsisten dengan pola `Gate`/`Policy` bawaan Laravel.

Pola ini **tidak berubah** dari TDD v3.2 s.d. v5.0 (Controller → Service → Repository → Eloquent → DB) - dokumen ini menegaskan ulang sebagai keputusan final, bukan draft.

---

## 3. Arsitektur Domain: Pipeline Approval Dinamis (Config over Code)

Ini adalah keputusan arsitektur backend paling penting, karena merealisasikan prinsip *Config over Code* dari `SID-ARCH-SYS-001` S1 dan menjadi sumber data untuk `ApprovalStepRenderer` di Frontend (`SID-ARCH-FE-001` S6).

### 3.1 Masalah yang diselesaikan

Sebelum TDD v5.0, alur approval hardcode 4 tahap (`RT → RW → Kadus → Kasi`), tercermin di `letters.status` sebagai ENUM granular per posisi (`rt_approved`, `kadus_rejected`, dst). Setiap penambahan/pengurangan tahap approval untuk jenis surat tertentu memaksa `ALTER TYPE` enum dan perubahan kode Controller/Service per role. Ini tidak scalable ketika desa punya kebutuhan alur berbeda-beda per jenis surat (misal surat sederhana cukup 2 tahap, surat sensitif tetap 3 tahap).

### 3.2 Solusi struktural: `letter_categories` → `approval_flows` → `flow_steps`

```
letter_categories (gate awal, jarang berubah)
  code: approval_normal | upload_mandiri | dokumen_pendukung | update_data
  handler_class → menentukan handler/modul yang menangani surat kategori ini
       │
       ▼
approval_flows (anak dari category, urutan step spesifik)
  1 category bisa punya BANYAK flow (flow baru = tambah row, bukan ubah kode)
       │
       ▼
flow_steps (urutan approver per flow)
  step_order, approver_position ENUM('rt','kepala_desa','sekdes',
                                       'kasi_pelayanan','kaur_tu_umum'),
  is_final
```

**Keputusan desain kunci (dan alasannya):**

- **`letters.status` generik** (`pending | in_progress | approved | rejected`), bukan granular per posisi. Posisi "sedang di step mana" dibaca dari `letters.current_step_order` di-JOIN ke `flow_steps` - bukan dari nama status. Ini menghilangkan kebutuhan `ALTER TYPE` setiap kali ada flow baru.
- **`letters.flow_id` adalah snapshot**, bukan live-reference ke `letter_types.flow_id`. Diisi saat surat disubmit dan dikunci. Alasan: kalau admin mengubah konfigurasi flow di `letter_types` di tengah proses berjalannya suatu surat, surat yang sedang berjalan tidak boleh "nyasar" (lompat step atau stuck) - kontrak alurnya sudah ditentukan sejak submit.
- **RW bukan approver** - tidak pernah muncul sebagai `approver_position` di `flow_steps`. RW hanya penerima notifikasi FYI, side-effect non-blocking yang dipicu Event, tidak pernah menjadi gate. Konsekuensi struktural: endpoint decision/approval **tidak pernah dibuka untuk role RW** di level route, bukan hanya disembunyikan di UI.
- **Kadus dihapus total dari domain approval.** `officials.position='kadus'` tetap valid sebagai jabatan struktural (dipakai domain Governance/CMS untuk halaman publik), tapi tidak pernah menjadi target resolve di `OfficialService` untuk konteks approval surat.
- **Resolve approver dua pola berbeda, harus dibedakan eksplisit di kode:**
  - **Berbasis wilayah** (RT): resolve via `citizens.rt_id → rts.id`, lalu cari `officials` aktif dengan `rt_id` yang sama.
  - **Berbasis posisi murni** (Kepala Desa, Sekretaris Desa, Kasi/Kaur): resolve via `officials.position IN (...)` + `is_active=true`, **tanpa join wilayah sama sekali**. Untuk step yang `approver_position`-nya mencakup baik `kepala_desa` maupun `sekdes`, resolve mengembalikan pejabat aktif di kedua posisi tersebut (lihat S3.3 untuk catatan status keputusan ini).

### 3.3 First-Action-Wins: Kades/Sekdes Concurrent Approval

⚠️ **Catatan status keputusan:** apakah Sekretaris Desa benar-benar ikut menjadi approver di step yang sama dengan Kepala Desa masih berstatus **rekomendasi/asumsi default** di Rangkuman Percakapan v5.0 (bukan keputusan final eksplisit - user menjawab "no preference" saat ditanya, direkomendasikan mengikuti prinsip v4.2 di mana Sekdes selalu scope identik Kades). Bagian ini mendokumentasikan bagaimana backend **akan** menangani skenario tersebut *jika* keputusan itu dikonfirmasi final - implementasikan dengan asumsi ini boleh berubah, dan konfirmasikan ulang ke pemilik proyek sebelum mengunci desain ini di kode produksi.

Dengan asumsi di atas: Kepala Desa dan Sekretaris Desa bisa saling menggantikan di step approval yang sama (`approver_position` bisa cocok untuk keduanya di satu `flow_step`). Ini **disengaja disederhanakan di application layer**, bukan row-level lock atau unique constraint di database:

- Endpoint decision melakukan `SELECT ... FOR UPDATE` sederhana atau re-check status di dalam `DB::transaction()` sebelum commit - siapa pun (Kades atau Sekdes) yang request-nya sampai lebih dulu ke transaction yang berhasil commit, itu yang tercatat.
- Request kedua yang datang setelah step sudah berpindah akan gagal di gate re-validasi (`InvalidLetterStatusException`, pola yang sama dengan gate logic RT→RW di v4.2), bukan dengan mekanisme locking khusus.
- **Trade-off yang diterima secara sadar**: untuk traffic desa kecil dengan jumlah aktor terbatas per posisi, risiko race condition nyata sangat rendah. Menambah mekanisme locking canggih di titik ini dianggap over-engineering untuk skala proyek ini.

### 3.4 Kategori di luar `approval_normal`

Untuk `upload_mandiri`, `dokumen_pendukung`, dan `update_data`, setiap tetap **wajib** direferensikan ke satu row `approval_flows` (misal flow "Direct - Tanpa Approval Bertingkat" dengan `flow_steps` kosong/minimal), meski secara bisnis tidak melalui approval bertingkat. Alasan: menjaga satu pola query generik (`JOIN flow_steps ON flow_id + current_step_order`) berlaku seragam di seluruh sistem tanpa percabangan kondisi khusus per kategori di level query dashboard.

`handler_class` di `letter_categories` menentukan Service/Handler mana yang memproses surat kategori tersebut - pola *Strategy* sederhana: Controller men-dispatch ke handler berdasarkan `category.handler_class`, bukan `if/else` bertingkat berdasarkan `category.code` yang tersebar di banyak tempat.

---

## 4. Arsitektur RBAC & Otorisasi

### 4.1 Struktur peran

Backend mengimplementasikan RBAC sebagai **9 nilai `users.role` ENUM flat** (bukan hierarki tabel terpisah):

```
warga, rt, rw, kadus, kasi_pelayanan, kaur_tu_umum,
petugas_desa, kepala_desa, sekretaris_desa
```

Pengelompokan "Tier" (Admin Desa/Eksekutif, Staff Desa, RT/RW, Warga) yang dipakai di dokumen SYS/FE adalah **label kelompok untuk kebutuhan navigasi & guard di sisi Frontend**, bukan tabel/kolom terpisah di database. Backend tidak menyimpan "tier" sebagai data - middleware RBAC memetakan `role` ke kelompok otorisasi yang relevan per endpoint secara langsung dari 9 nilai ENUM di atas. Slot "Superadmin" **belum diimplementasikan** - tidak ada role, middleware, atau guard untuk itu di backend hingga kebutuhannya jelas.

**Catatan penting yang harus dijaga konsisten:** pengelompokan "Admin Desa/Eksekutif" di FE/SYS menyatukan `petugas_desa` dengan `kepala_desa`/`sekretaris_desa` untuk kebutuhan label navigasi, **tapi scope otorisasi keduanya di backend tetap terpisah tegas** sesuai TDD:
- `petugas_desa`: full visibility seluruh pipeline surat (termasuk yang `rejected` di step manapun), plus akses CRUD konfigurasi (wilayah, jabatan, tipe surat versi sederhana, deadline, organisasi non-struktural, peraturan desa, CMS).
- `kepala_desa` / `sekretaris_desa`: sejak v5.0 adalah **approver aktif** (bukan lagi read-only monitoring seperti v4.2) di step yang menggantikan posisi Kadus lama, tapi **tidak** punya akses ke domain konfigurasi/CMS milik Petugas Desa.

Policy dan middleware harus mengecek `role` secara eksplisit per kebutuhan endpoint, tidak boleh menggunakan pengelompokan tier sebagai basis pengecekan otorisasi di backend.

### 4.2 Segmentasi fungsional di dalam role

Untuk Staff Desa (`kasi_pelayanan`, `kaur_tu_umum`), resolusi kewenangan **bukan** dari wilayah, melainkan dari `letter_types` (via `flow_steps.approver_position` yang cocok dengan `role` user login) - lihat S3.2. Kolom `letter_types.assigned_role` (peninggalan v4.2) dipertahankan sebagai **derived cache**, bukan source of truth - Policy tetap memvalidasi lewat `flow_steps`, bukan `assigned_role` langsung, untuk mencegah drift antara dua sumber data yang seharusnya sinkron.

### 4.3 Implementasi teknis

- Middleware kustom (bukan murni `spatie/laravel-permission`) diperlukan karena kebutuhan gate ganda: **role check** (apakah role user termasuk yang diizinkan endpoint ini) **dan** **context check** (apakah user ini punya wewenang atas *resource spesifik* ini - wilayah untuk RT, posisi untuk Kades/Sekdes/Staff). `spatie/laravel-permission` menangani lapisan pertama dengan baik, tapi lapisan kedua tetap harus custom Policy per resource (`LetterPolicy::decide()`), konsisten dengan pola yang sudah dipakai sejak v3.2 (`OfficialService::isOfficialAuthorized()`).
- Setiap endpoint decision (approve/reject) **selalu** melakukan re-validasi gate di dalam Service sebelum `DB::transaction()`, bukan hanya mengandalkan hasil Policy di awal request - pola *double-check* yang sudah baku sejak sequence diagram RT/RW Approval v4.2, untuk menangani race condition antara buka halaman dan submit keputusan.

---

## 5. Arsitektur Domain: Manajemen Kependudukan

### 5.1 Pemisahan KK vs Data Individu

Backend mengikuti prinsip *single source of truth* dari skema v5.0: `families` (tipis, hanya fakta level-keluarga: `no_kk`, `family_address`, `family_status`) terpisah dari `citizens` (fakta level-individu, termasuk `address` domisili riil yang bisa berbeda dari `family_address`). Service layer (`CitizenService`, `FamilyService`) **tidak boleh** menyalin data KK ke `citizens` atau sebaliknya sebagai denormalisasi tambahan di luar `families.head_of_family_id` yang memang sudah didefinisikan sebagai denormalisasi opsional terjaga manual.

### 5.2 Warga Lokal vs Pendatang — Satu Tabel, Bukan Dua

**Tidak ada kategori "warga Non-NIK" di domain ini.** Ini koreksi eksplisit terhadap draft awal dokumen arsitektur - keputusan final TDD v5.0 (Patch Guide v4.2→v5.0, PATCH 41) menegaskan: **setiap row di `citizens` sudah pasti memiliki NIK** (`nik`/`nik_hash` adalah bagian inti skema sejak v3.2), baik untuk warga lokal maupun pendatang. Tidak ada jalur di mana seseorang menjadi warga tercatat di sistem tanpa NIK terverifikasi.

Pembeda lokal vs pendatang murni kolom `residency_type ENUM('lokal','pendatang')` pada `citizens` yang sama - **bukan** tabel terpisah, **bukan** entitas paralel, dan **bukan** kategori "data transaksional tanpa record master". Backend secara sengaja **tidak** membangun jalur mana pun (baik di `letters` maupun tabel lain) yang memungkinkan seseorang tercatat sebagai pemohon/warga tanpa melalui `citizens` terlebih dahulu - ini untuk mencegah duplikasi logic dan risiko integritas data yang justru menjadi alasan utama keputusan "tidak dipisah tabel" di v5.0.

Alur bagi pendatang yang belum terverifikasi NIK-nya di `citizens` (misal baru pindah, KK belum diproses desa) **bukan** kasus "Non-NIK" - itu murni kasus "belum terdaftar sebagai warga sama sekali", ditangani sama seperti warga mana pun yang NIK-nya belum ada di database: tidak bisa register akun (UC-17, gate NIK harus ditemukan di `citizens`), dan tidak bisa submit surat self-service sampai Petugas Desa mencatatnya lebih dulu ke `citizens` (via UC-09, dengan `residency_type='pendatang'` jika relevan).

### 5.3 Perubahan Data oleh Warga

Sesuai TDD (UC-09), pengelolaan data `citizens` - termasuk koreksi/update - **hanya dilakukan oleh Petugas Desa**. Tidak ada mekanisme di mana warga mengedit data kependudukannya sendiri secara langsung maupun bertahap; ini konsisten dengan prinsip *Human-in-the-Loop* (`SID-ARCH-SYS-001` S1) yang menempatkan Petugas Desa sebagai satu-satunya pencatat resmi data sensitif ini.

> Kapabilitas "warga mengajukan perubahan datanya sendiri" pernah disebut sepintas di `SID-ARCH-SYS-001` S2.2 sebagai *staging perubahan data self-service*, tapi ini **belum punya desain maupun keputusan final** - lihat S12 (Wacana Next Dev - Belum Ada Desain).

### 5.4 Impor Massal

`maatwebsite/excel` dijalankan sinkron per-baris dengan validasi individual (format NIK, duplikasi `nik_hash`), baris gagal di-skip dan dilaporkan dalam ringkasan hasil - bukan all-or-nothing transaction, karena satu file impor bisa berisi ratusan baris dan kegagalan satu baris tidak boleh membatalkan baris lain yang valid.

---

## 6. PDF Generation: On-Demand, Bukan Persisten

Keputusan final sejak v4.0: **tidak ada kolom path PDF** di `letters`, tidak ada file surat tersimpan permanen di server. Setiap klik tombol download memicu generate ulang dari `letter_types.template` (HTML Blade) + data surat terkini + TTD/stempel dari `officials` (Kades aktif), lalu langsung di-stream sebagai response binary.

**Alasan struktural (bukan sekadar penghematan storage):** PDF yang persisten berisiko menjadi *stale* jika data surat berubah setelah digenerate (misal koreksi nama pemohon), dan menambah kompleksitas manajemen storage/cleanup yang tidak sepadan untuk traffic desa kecil. Trade-off latency generate-per-klik diterima sebagai biaya yang wajar.

Gate akses berbeda per role: `warga` dicek `expires_at`, role lain (Petugas Desa, Staff, Kades, Sekdes) selalu bisa generate tanpa cek masa berlaku.

---

## 7. Arsitektur Notifikasi & Event

Pola event-driven tidak berubah dari v3.2: `Action → Controller → Event → Listener → Notification Job (Queue) → tabel notifications → opsional email`.

**Perubahan struktural v5.0 yang harus dipegang backend:**

- Setiap perpindahan `current_step_order` (approve) memicu Event generik (`FlowStepAdvanced`), bukan Event spesifik per posisi (`RtApproved`, `RwApproved`, dst seperti v4.2). Listener men-dispatch notifikasi ke `approver_position` di step berikutnya, di-resolve lewat `OfficialService` sesuai pola S3.2 - satu Listener generik menggantikan kebutuhan Listener terpisah per tahap.
- Notifikasi ke RW tetap ada tapi levelnya **side-effect non-blocking** yang dipicu bersamaan (bukan berurutan menunggu) dengan resolusi approver berikutnya - RW tidak pernah berada di jalur kritis proses.
- Fallback broadcast (RT wilayah tidak ditemukan) tetap dipertahankan: kirim ke seluruh `petugas_desa` aktif, bukan gagal diam-diam.

---

## 8. Audit Trail & Keamanan Data

- **Enkripsi field sensitif**: AES-256-CBC via `$casts` Eloquent untuk `citizens.nik`, `citizens.address`, `families.no_kk`, `letters.applicant_nik`, `letters.applicant_address`. Pola dual-column (`nik`/`nik_hash`, `no_kk`/`no_kk_hash`) dipertahankan konsisten untuk semua data yang butuh pencarian tanpa membuka enkripsi - `no_kk_hash` di `families` mengikuti pola yang sama persis dengan `nik_hash` sejak v3.2, bukan pola baru.
- **Password**: Argon2id, bukan bcrypt.
- **Audit trail** dua lapis: `spatie/laravel-activitylog` untuk perubahan data model umum (CRUD warga, jabatan, dst), dan `letter_status_logs` sebagai audit trail khusus domain surat (mencatat `old_status`/`new_status` generik + `actor_id` + IP + user agent) - dipisah karena domain surat butuh struktur query spesifik (riwayat per surat, urut kronologis) yang tidak sepenuhnya terlayani oleh log generik.
- **Data in transit**: HTTPS wajib (TLS 1.2/1.3), Secure cookie + `SameSite=Strict`.
- **Data at rest**: `APP_KEY` di `.env`, tidak pernah di-commit, tidak boleh diregenerate di production.
- Standar keamanan lintas program lebih detail ada di `AWG-SEC-001` s.d. `AWG-SEC-007` (lihat S10) - dokumen ini hanya mencakup keputusan yang spesifik untuk domain SIDUTama.

---

## 9. Reliabilitas & Constraint Operasional

| Constraint | Dampak | Solusi |
|---|---|---|
| Queue worker harus selalu aktif | Notifikasi & reminder tidak berjalan jika worker mati | Supervisor (Tahap 1) → Laravel Horizon (Tahap 2) |
| Deadline approval terlewat tidak auto-reject | Surat bisa mandek jika pejabat tidak action | `SendApprovalReminderJob` berjalan tiap jam via Scheduler, set `is_overdue=true`, kirim reminder - tidak pernah mengubah status surat secara otomatis |
| Kades/Sekdes concurrent approve tanpa DB lock | Kemungkinan kecil race condition di traffic tinggi | Diterima sebagai trade-off sadar (lihat S3.3), bukan bug yang belum ditangani |
| PDF regenerate setiap klik | Latency kecil per request download | Diterima, lihat S6 |
| Redis & Docker belum dipakai Tahap 1 | Queue & environment belum optimal/konsisten antar mesin | Queue driver database cukup untuk traffic desa kecil, migrasi terjadwal Tahap 2 |

---

## 10. Wacana Next Dev — Belum Ada Desain

Tiga istilah berikut disebut sepintas di `SID-ARCH-SYS-001` S2.1/S2.2 sebagai bagian scope domain, tapi **tidak punya skema tabel, UC, maupun keputusan teknis apa pun** di TDD v3.2 s.d. v5.0 manapun. Bagian ini sengaja hanya mencatat *bahwa istilah ini pernah disebut*, bukan mendesainnya - mendesain tanpa keputusan sumber akan berisiko menciptakan skema baru yang tidak pernah disepakati. Jangan mulai implementasi apa pun untuk ketiganya sebelum ada keputusan eksplisit dari pemilik proyek.

| Istilah | Disebut di | Pertanyaan terbuka yang harus dijawab lebih dulu |
|---|---|---|
| **QR Verification** | `SID-ARCH-SYS-001` S2.1 (mekanisme operasional pendukung), S3 (kotak "Endpoint Verifikasi QR" di diagram komponen) | Token disimpan di kolom mana pada `letters`? Digenerate kapan (saat `kasi_approved`, atau setiap kali PDF di-generate ulang - ingat PDF bersifat on-demand, S6)? Halaman verifikasi publik menampilkan data apa saja (risiko privasi NIK)? Berlaku untuk kategori surat mana saja? |
| **Void/Cancel Surat** | `SID-ARCH-SYS-001` S2.1 (mekanisme operasional pendukung) | Status baru di `letters.status` (saat ini hanya 4 nilai: `pending/in_progress/approved/rejected`) atau kolom terpisah? Siapa yang berwenang void - Petugas Desa saja, atau approver terkait? Berlaku untuk surat yang sudah `approved` saja, atau juga `in_progress`? Apakah `letter_number` yang sudah terbit ikut dibatalkan/dicatat sebagai riwayat? |
| **Staging Perubahan Data Self-Service** | `SID-ARCH-SYS-001` S2.2 (scope domain Kependudukan) | Bertentangan langsung dengan UC-09 TDD saat ini (aktor hanya Petugas Desa) - apakah ini kapabilitas baru yang perlu UC baru? Field mana saja yang boleh diajukan warga? Siapa yang approve staging ini (Petugas Desa saja, atau ada gate lain)? |

---

## 11. Referensi Silang

| Kebutuhan | Dokumen |
|---|---|
| Aturan penulisan kode (naming, struktur folder detail, konvensi PSR-12) | `DEV-CODE-001` |
| Strategi & cakupan pengujian Backend | `DEV-TEST-001` |
| Alur kerja Git & review | `DEV-GIT-001` |
| Skema lengkap domain Surat & Pipeline (`letter_categories`, `approval_flows`, `flow_steps`, `letters`, dst) | `SID_Arsitektur_RoleSegmentation_Pipeline_Kependudukan_Tahap2.md`, `SID_Addendum_KategoriLetterType_OperasionalPipeline_Verifikasi.md` |
| Skema lengkap domain Kependudukan (`families`, `citizens`, `citizen_socioeconomics`, 4 lapis) | `SID_MasterData_Kependudukan_NIK_Cibenda.md` |
| Alur interaksi per aktor (Business Workflow) | `01_BWF_Overview_v1.puml` s.d. `05_BWF_SistemOtomatis_v1.puml` |
| Standar keamanan lintas program | `AWG-SEC-001` s.d. `AWG-SEC-007` |
| Standar observability lintas program | `AWG-OBS-001`, `AWG-OBS-002` |
| Komponen Frontend yang bergantung pada struktur pipeline ini | `SID-ARCH-FE-001` S6 (`ApprovalStepRenderer`) |

---

## 12. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal, disusun selaras dengan `SID-ARCH-SYS-001` v1.0, `SID-ARCH-FE-001` v1.0, dan skema TDD v5.0 (Category+Flow approval dinamis, restrukturisasi data kependudukan, 9-role RBAC flat) |
| 1.1 | - | Koreksi S5.2: hapus konsep "warga Non-NIK/domisili sementara" sebagai entitas terpisah - bertentangan dengan keputusan final TDD v5.0 (PATCH 41) bahwa seluruh warga tercatat, lokal maupun pendatang, selalu berada di `citizens` dengan NIK, dibedakan murni lewat kolom `residency_type`. Tambah disclaimer status asumsi di S3.3 (Kades/Sekdes saling menggantikan belum jadi keputusan final eksplisit). |
| 1.2 | - | Hapus desain spesifik "staging perubahan data" dari S5.3 (belum pernah jadi keputusan TDD, bertentangan dengan UC-09 yang aktornya hanya Petugas Desa). Tambah S10 (Wacana Next Dev - Belum Ada Desain) mencatat QR Verification, Void/Cancel Surat, dan Staging Perubahan Data Self-Service sebagai istilah yang disebut di `SID-ARCH-SYS-001` tapi belum punya skema/UC/keputusan apa pun - tidak untuk diimplementasikan sebelum ada keputusan eksplisit. |

<!-- ============================================================ -->
<!-- AKHIR DOKUMEN 2 DARI 3: SID-ARCH-BE-001 -->
<!-- ============================================================ -->


<!-- ============================================================ -->
<!-- MULAI DOKUMEN 3 DARI 3: SID-ARCH-FE-001 (Frontend Architecture, v1.1) -->
<!-- ============================================================ -->

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

<!-- ============================================================ -->
<!-- AKHIR DOKUMEN 3 DARI 3: SID-ARCH-FE-001 -->
<!-- ============================================================ -->

<!--
====================================================================
AKHIR FILE GABUNGAN
====================================================================
-->
