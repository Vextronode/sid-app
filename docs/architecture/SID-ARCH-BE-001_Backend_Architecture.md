# ARSITEKTUR BACKEND
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-BE-001 |
| Status | Berlaku (Aktif) - Versi 1.1 — v5.1 Auth & Approval Flow |
| Audiens | Backend Developer, Reviewer, Tech Lead, QA Coordinator |
| Sifat Dokumen | Keputusan struktural & alasan di baliknya. Aturan penulisan kode sehari-hari ada di `DEV-CODE-001`. Skema tabel lengkap ada di dokumen skema domain (lihat S10). |
| Dokumen Induk | `SID-ARCH-SYS-001` (System Architecture) |

---

## 1. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Framework | Laravel (REST API, pisah repo dari Frontend) | Laravel berperan murni sebagai API provider, tidak merender view |
| Autentikasi | Laravel Sanctum | SPA cookie-based, HttpOnly cookie - bukan localStorage/Bearer token manual |
| Otorisasi | Laravel Policy + middleware RBAC kustom | Tidak ada dependency package RBAC pihak ketiga di `composer.json`; role memakai middleware aplikasi dan Laravel Policy. |
| Database Engine | PostgreSQL (`DB_CONNECTION=pgsql`; versi tidak diverifikasi dari source) | Source menetapkan driver, bukan versi server. **Status: Tidak diverifikasi terhadap source backend** untuk versi PostgreSQL yang dipakai saat deployment. |
| ORM | Eloquent ORM | Enkripsi field via `$casts`, raw query dilarang |
| Queue & Jobs | Framework mendukung queue; `.env.example` menetapkan driver database | Tidak ditemukan Job aplikasi untuk notifikasi/reminder. `LetterStatusNotification` memakai kanal database dan dikirim langsung oleh service. |
| Event System | Tidak ada class Event/Listener aplikasi pada `app/` | Approval service memanggil notifikasi secara langsung. |
| Scheduler | `routes/console.php` hanya mendaftarkan command `inspire` | Reminder approval otomatis berstatus Planned; backup dan penjadwalan infrastruktur tidak diverifikasi dari source backend. |
| PDF Generation | `barryvdh/laravel-dompdf` | On-demand, tidak ada file tersimpan di server - lihat S6 |
| Import Data | `maatwebsite/excel` | Import massal data warga |
| Audit Trail | `spatie/laravel-activitylog` + tabel `letter_status_logs` kustom | Lihat S8 |


### Komponen backend aktif (ringkasan source)

| Lapisan | Komponen yang aktif |
|---|---|
| Service domain | `CitizenSocioeconomicService`, `HamletService`, `LetterCategoryService`, `LetterTypeService`, `PublicPageService`, `RtService`, `RwService`, `VillageOrgMemberService`, `VillageOrgPositionService` |
| Repository domain | `CitizenSocioeconomicRepository`, `HamletRepository`, `LetterApprovalRepository`, `LetterStatusLogRepository`, `RtRepository`, `RwRepository`, `VillageOrgMemberRepository`, `VillageOrgPositionRepository` |
| Policy dan middleware | `LetterPolicy`, `OfficialPolicy`, `RegionPolicy`, `EnsureUserIsActive` (`account.active`), `EnsureEmailIsVerified` (`verified`) |
| Integrasi dan operasi | `CitizensImport`, `PetugasFirstCommand` (`petugas:first`), `RegionContainsCitizensException`, `RegionHasActiveCitizensException` |

Daftar ini mencatat komponen publik/domain; bukan inventaris seluruh class framework.
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
- **Repository** membungkus query Eloquent. Alasan tetap dipertahankan meski proyek berskala capstone (bukan enterprise besar): domain Surat-Menyurat punya query yang sama dipakai lintas Service (`findByFlowStepAndStatus` dipakai dashboard dan notifikasi) - tanpa Repository, query itu akan terduplikasi atau Service saling bergantung ke Model orang lain.
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
  step_order, approver_position untuk flow baru: 'rt','kepala_desa',
  is_final
```

**Keputusan desain kunci (dan alasannya):**

- **`letters.status` generik** (`pending | in_progress | approved | rejected`), bukan granular per posisi. Posisi "sedang di step mana" dibaca dari `letters.current_step_order` di-JOIN ke `flow_steps` - bukan dari nama status. Ini menghilangkan kebutuhan `ALTER TYPE` setiap kali ada flow baru.
- Enum database `flow_steps.approver_position` masih memuat `sekdes` untuk kompatibilitas data lama, tetapi validasi flow baru hanya menerima `rt` dan `kepala_desa`; step final wajib `kepala_desa`. Kades dan Sekdes sama-sama dapat memutuskan pada step `kepala_desa`.
- **`letters.flow_id` adalah snapshot**, bukan live-reference ke `letter_types.flow_id`. Diisi saat surat disubmit dan dikunci. Alasan: kalau admin mengubah konfigurasi flow di `letter_types` di tengah proses berjalannya suatu surat, surat yang sedang berjalan tidak boleh "nyasar" (lompat step atau stuck) - kontrak alurnya sudah ditentukan sejak submit.
- **RW bukan approver** - tidak pernah muncul sebagai `approver_position` di flow aktif. RW menerima notifikasi FYI database yang dikirim langsung oleh `RtApprovalService`. Konsekuensi struktural: endpoint decision/approval **tidak pernah dibuka untuk role RW** di level route, bukan hanya disembunyikan di UI.
- **Kadus bukan approver.** `officials.position='kadus'` tetap valid sebagai jabatan struktural; setelah RT approve, Kadus aktif menerima FYI non-blocking hanya untuk surat dengan `citizen.hamlet_id` yang sama. Kadus tidak menjadi target resolve step approval dan tidak memiliki endpoint keputusan.
- **Resolve approver dua pola berbeda, harus dibedakan eksplisit di kode:**
  - **Berbasis wilayah** (RT): resolve via `citizens.rt_id → rts.id`, lalu cari `officials` aktif dengan `rt_id` yang sama.
  - **Berbasis posisi murni** (Kepala Desa/Sekdes tahap final): resolve pejabat aktif tanpa join wilayah. Kasi/Kaur bukan approver dan tidak di-resolve dari `flow_steps`.
- **Tahap yang dilewati:** hanya tahap non-final dengan pejabat aktif dapat dilewati bila seluruh approver eligible merupakan pemohon. Tahap tanpa pejabat aktif tidak dilewati. Tahap final tidak pernah dilewati; tanpa approver lain selain pemohon, submit ditolak. Tahap RT yang dilewati tidak memicu FYI RW.

### 3.3 First-Action-Wins: Kades/Sekdes Concurrent Approval

**Keputusan final (K7/K13):** Kepala Desa dan Sekretaris Desa saling menggantikan pada tahap final yang sama; pemohon Kades diputuskan Sekdes dan sebaliknya. Mekanisme first-action-wins dijalankan pada application layer:

- Endpoint decision menjalankan `SELECT ... FOR UPDATE` terhadap row surat di dalam `DB::transaction()`, lalu memeriksa ulang status aktif dan step `kepala_desa` sebelum mencatat keputusan.
- Request kedua menunggu row lock, lalu gagal dengan 409 jika surat sudah terminal atau step aktif sudah berubah. Keputusan pertama yang berhasil diproses menang.

### 3.4 Kategori di luar `approval_normal`

Untuk `upload_mandiri`, `dokumen_pendukung`, dan `update_data`, setiap tetap **wajib** direferensikan ke satu row `approval_flows` (misal flow "Direct - Tanpa Approval Bertingkat" dengan `flow_steps` kosong/minimal), meski secara bisnis tidak melalui approval bertingkat. Alasan: menjaga satu pola query generik (`JOIN flow_steps ON flow_id + current_step_order`) berlaku seragam di seluruh sistem tanpa percabangan kondisi khusus per kategori di level query dashboard.

`handler_class` di `letter_categories` menentukan Service/Handler mana yang memproses surat kategori tersebut - pola *Strategy* sederhana: Controller men-dispatch ke handler berdasarkan `category.handler_class`, bukan `if/else` bertingkat berdasarkan `category.code` yang tersebar di banyak tempat.

### 3.5 Isolasi konfigurasi per desa

`approval_flows` dan `letter_types` memiliki `village_id`. Service mengambil desa dari akun Petugas Desa yang terautentikasi, lalu membatasi daftar, pencarian, dan perubahan konfigurasi ke desa tersebut. Flow atau jenis surat milik desa lain diperlakukan sebagai tidak ditemukan (HTTP 404). Public API memilih data desa melalui `village_code`; ID desa tidak diterima sebagai pengganti scope otorisasi pada endpoint konfigurasi.

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
- `petugas_desa`: full visibility seluruh pipeline surat, termasuk rejected; pengelolaan jabatan, reset password non-Petugas Desa, dan konfigurasi desa.
- `kepala_desa` / `sekretaris_desa`: approver pada tahap final; tidak memiliki akses ke domain konfigurasi/CMS milik Petugas Desa. Dashboard mereka mengecualikan surat miliknya sendiri.
- `kasi_pelayanan` / `kaur_tu_umum`: notifikasi setelah final approve dan akses baca/unduh surat approved sesuai `assigned_role`; bukan approver.

Policy dan middleware harus mengecek `role` secara eksplisit per kebutuhan endpoint, tidak boleh menggunakan pengelompokan tier sebagai basis pengecekan otorisasi di backend.

### 4.2 Segmentasi fungsional di dalam role

Untuk Kasi/Kaur (`kasi_pelayanan`, `kaur_tu_umum`), `letter_types.assigned_role` menentukan surat selesai yang role-nya boleh baca/unduh; nilai NULL memberi akses kepada kedua role. Kasi/Kaur tidak lagi memiliki aksi approval maupun tahap di flow.

### 4.3 Implementasi teknis

- Middleware kustom (bukan murni `middleware RBAC aplikasi`) diperlukan karena kebutuhan gate ganda: **role check** (apakah role user termasuk yang diizinkan endpoint ini) **dan** **context check** (apakah user ini punya wewenang atas *resource spesifik* ini - wilayah untuk RT, posisi untuk Kades/Sekdes/Staff). `middleware RBAC aplikasi` menangani lapisan pertama dengan baik, tapi lapisan kedua tetap harus custom Policy per resource (`LetterPolicy::decide()`), konsisten dengan pola yang sudah dipakai sejak v3.2 (`OfficialService::isOfficialAuthorized()`).
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

Service approval/surat mengirim `LetterStatusNotification` secara langsung melalui kanal database. Source tidak memiliki Event/Listener aplikasi, Job notifikasi, atau kanal email untuk notifikasi status.

**Perubahan struktural v5.0 yang harus dipegang backend:**

- Service keputusan RT/Kades mengirim notifikasi database secara langsung kepada pemohon, approver berikutnya, RW, atau Kadus sesuai hasil proses. Source tidak memiliki `FlowStepAdvanced`, Event/Listener khusus, maupun Job notifikasi.
- Notifikasi FYI ke RW dan Kadus tetap ada sebagai side-effect non-blocking setelah RT approve; RW dicocokkan melalui wilayah RW citizen, Kadus melalui `citizen.hamlet_id`. Bila tahap RT dilewati, FYI tidak dikirim. Setelah tahap final approve, notifikasi surat selesai dikirim ke Kasi/Kaur yang cocok dengan `assigned_role`.
- Jika pejabat RT atau RW aktif tidak ditemukan, resolver mengembalikan daftar kosong; tidak ada fallback broadcast ke `petugas_desa`. Approval yang memerlukan RT tetap tidak dapat diputuskan tanpa RT aktif.

---

## 8. Audit Trail & Keamanan Data

- **Enkripsi field sensitif**: AES-256-CBC via `$casts` Eloquent untuk `citizens.nik`, `families.no_kk`, `families.family_address`, `letters.applicant_nik`, dan `letters.applicant_address`; `citizens.address` tidak terenkripsi oleh model. Pola dual-column (`nik`/`nik_hash`, `no_kk`/`no_kk_hash`) dipertahankan konsisten untuk semua data yang butuh pencarian tanpa membuka enkripsi - `no_kk_hash` di `families` mengikuti pola yang sama persis dengan `nik_hash` sejak v3.2, bukan pola baru.
- **Password**: Argon2id, bukan bcrypt.
- **Authentication & forced password change**: login dengan username, register NIK+password dan rate limit khusus. Password sementara mengaktifkan `must_change_password`; API mengembalikan `password_change_required` sampai password diganti.
- **Official assignment**: `OfficialAssignmentService` mengorkestrasi promote/demote/rotate/bootstrap dalam transaksi dan mencatat activity log; CLI `petugas:first` hanya untuk bootstrap Petugas pertama, sedangkan demote dan reset password dilakukan melalui dashboard/API.
- **Audit trail** dua lapis: `spatie/laravel-activitylog` untuk perubahan data model umum (CRUD warga, jabatan, dst), dan `letter_status_logs` sebagai audit trail khusus domain surat (mencatat `old_status`/`new_status` generik + `actor_id` + IP + user agent) - dipisah karena domain surat butuh struktur query spesifik (riwayat per surat, urut kronologis) yang tidak sepenuhnya terlayani oleh log generik.
- **Data in transit**: HTTPS wajib (TLS 1.2/1.3), Secure cookie + `SameSite=Strict`.
- **Data at rest**: `APP_KEY` di `.env`, tidak pernah di-commit, tidak boleh diregenerate di production.
- Standar keamanan lintas program lebih detail ada di `AWG-SEC-001` s.d. `AWG-SEC-007` (lihat S10) - dokumen ini hanya mencakup keputusan yang spesifik untuk domain SIDUTama.

---

## 9. Reliabilitas & Constraint Operasional

| Constraint | Dampak | Solusi |
|---|---|---|
| Queue worker harus selalu aktif | Notifikasi & reminder tidak berjalan jika worker mati | Supervisor (Tahap 1) → Laravel Horizon (Tahap 2) |
| Deadline approval terlewat tidak auto-reject | Surat bisa mandek jika pejabat tidak action | Saat daftar surat dimuat, backend menghitung overdue dari deadline approval aktif. Scheduler dan pengiriman reminder otomatis belum diimplementasikan. |
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
| 1.0 | - | Penyusunan awal, disusun selaras dengan `SID-ARCH-SYS-001` v1.0 dan skema TDD v5.0 |
| 1.1 | - | v5.1 Auth & Approval Flow: keputusan Kades/Sekdes ditutup, Kasi/Kaur menjadi read-only, tahap submit pejabat, password change guard, OfficialAssignmentService, dashboard dan notifikasi diselaraskan. |
