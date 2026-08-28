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
  - **Berbasis posisi murni** (Kepala Desa, Sekretaris Desa, Kasi/Kaur): resolve via `officials.position IN (...)` + `is_active=true`, **tanpa join wilayah sama sekali**. Kades/Sekdes resolve keduanya sekaligus (siapa pun yang aktif di posisi itu), karena keduanya saling menggantikan di step yang sama (lihat S3.3).

### 3.3 First-Action-Wins: Kades/Sekdes Concurrent Approval

Kepala Desa dan Sekretaris Desa bisa saling menggantikan di step approval yang sama (`approver_position` bisa cocok untuk keduanya di satu `flow_step`). Ini **disengaja disederhanakan di application layer**, bukan row-level lock atau unique constraint di database:

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

### 5.2 Warga Non-NIK / Domisili Sementara

Berbeda dari warga ber-NIK (master data 4 lapis di `citizens`), warga tanpa NIK terdaftar (pendatang sementara yang belum tervalidasi sebagai warga Cibenda) **tidak** mendapat record master data. Backend menangani ini sebagai **data transaksional** yang melekat langsung pada dokumen/permohonan terkait (misal field bebas di `letters` untuk pemohon yang belum jadi `citizens`), bukan entitas warga paralel. Ini konsisten dengan keputusan v5.0 bahwa `residency_type` (lokal/pendatang) tetap kolom di `citizens` yang sama untuk warga yang **sudah** terverifikasi NIK-nya - bukan tabel warga terpisah.

### 5.3 Staging Perubahan Data Self-Service

Untuk perubahan data warga yang diinput sendiri oleh warga (bukan oleh Petugas Desa), backend menerapkan pola *staging*: perubahan tidak langsung menimpa `citizens`, melainkan disimpan sebagai draft/pending yang menunggu verifikasi Petugas Desa sebelum diterapkan. Ini konsisten dengan prinsip *Human-in-the-Loop* di `SID-ARCH-SYS-001` S1 - data kependudukan bersifat sensitif dan legal, sehingga perubahan mandiri warga tidak boleh langsung menjadi source of truth tanpa verifikasi manusia.

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

## 10. Referensi Silang

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

## 11. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal, disusun selaras dengan `SID-ARCH-SYS-001` v1.0, `SID-ARCH-FE-001` v1.0, dan skema TDD v5.0 (Category+Flow approval dinamis, restrukturisasi data kependudukan, 9-role RBAC flat) |
