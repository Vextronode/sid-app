# Laporan Sinkronisasi Dokumentasi

## Batch 17 — Sosio-Ekonomi per KK, Stempel Desa, Pekerjaan Baku (2026-10-06)

Dokumentasi diselaraskan terhadap migration, route, request, resource, dan service backend aktif. Penambahan pada batch ini mencakup upload/preview privat stempel desa dan tanda tangan Kepala Desa aktif. Tidak ada file backend/frontend yang diubah dan tidak ada commit.

| ID | Dokumen | Sebelum | Sesudah |
|---|---|---|---|
| B17-01 | OpenAPI | Sosio-ekonomi per warga, tanpa katalog pekerjaan/upload gambar | Sosio-ekonomi per KK, CRUD pekerjaan, upload dan preview terproteksi stempel serta TTD |
| B17-02 | TDD-01..06 | Rujukan skema/flow v5.1 dan pekerjaan bebas | Status v5.2, level KK dan occupation_id, sumber PDF terkini, keputusan terbuka diperbarui |
| B17-03 | ERD dan class diagram | CitizenSocioeconomic, occupation teks, 22 tabel | FamilySocioeconomic, Occupation, village stamp, 23 tabel |
| B17-04 | Use-case, activity, component, deployment | TTD/stempel dianggap milik pejabat; tidak ada alur upload privat | TTD Kades aktif + stempel desa, upload/preview privat, katalog pekerjaan dan survei KK |
| B17-05 | Arsitektur backend/sistem | Sosio-ekonomi warga dan stempel officials | Sosio-ekonomi keluarga, pekerjaan baku per desa, file gambar privat |
| B17-06 | Changelog FE | Tidak ditemukan pada working tree | Ditambahkan changelog kontrak backend yang relevan untuk integrasi FE |

### Verifikasi terhadap source backend

- Migration aktif: `family_socioeconomics.family_id` adalah UUID FK UNIQUE ke `families` (cascade delete), dengan `household_income_range` enum `<1jt`, `1-3jt`, `3-5jt`, `5-10jt`, `>10jt`; migration `occupations` menyimpan `village_id`, `name` VARCHAR(100), `is_active`, `sort_order` serta unique index `(village_id, LOWER(name))`. `citizens.occupation_id` FK ke `occupations.id` menggunakan RESTRICT.
- Route aktif: `GET/PUT /families/{id}/socioeconomic`, `GET/POST /occupations`, `PATCH/DELETE /occupations/{id}`, `POST/GET /villages/profile/stamp`, dan `POST/GET /officials/{official}/signature`.
- Upload memakai multipart field `stamp` atau `signature`, validasi image PNG/JPG/JPEG/WebP dan `max:5120` KB. File masuk private storage; preview memerlukan autentikasi Petugas Desa dengan scope desa, dan tanda tangan dibatasi pada Kepala Desa aktif yang belum mengakhiri masa jabatan.
- Resource desa mengeluarkan `has_stamp_img`, bukan path `stamp_img`. Resource pejabat mengeluarkan `has_signature_img`; kolom legacy `stamp_img` pejabat tetap ikut ada tetapi tidak dipakai PDF. Stempel PDF berasal dari `villages.stamp_img`, TTD dari `officials.signature_img`.
- Kode akhir berbeda dari beberapa asumsi rencana awal: profil desa publik tidak mengekspos path stempel, melainkan indikator `has_stamp_img`; endpoint preview tidak publik. Route upload/preview TTD bersifat terpisah dari rotasi pejabat. Kolom legacy `officials.stamp_img` tetap dipertahankan.

### Keputusan belum final dan tidak diverifikasi

- Belum diputuskan: nasib `officials.stamp_img`; definisi periode penghasilan rumah tangga; penanganan kebutuhan sosio-ekonomi untuk warga tanpa KK; enkripsi `family_socioeconomics`; isi katalog pekerjaan selain tiga seed awal dan pemetaan nama pekerjaan pada import.
- Tidak diverifikasi terhadap source backend: kebutuhan FE selain Petugas Desa mengakses daftar pekerjaan; kebutuhan mempublikasikan file gambar atau menyediakan URL publik; rencana penghapusan kolom legacy `officials.stamp_img`.

### Hasil validasi dan sapu silang

- `npm exec --yes --package=@redocly/cli redocly -- lint docs/api_spec/openapi.yaml` — **belum hijau**: 14 error dan 43 warning pada operasi lama yang tidak disentuh (security di file autentikasi/infrastruktur, parameter route organisasi desa, dan warning response); file path/schema baru batch ini tidak melaporkan error setelah koreksi YAML.
- Pemeriksaan PlantUML belum dijalankan karena CLI/JAR tidak tersedia lokal; unduhan validator tidak selesai.
- Pencarian `citizen_socioeconomics`, `CitizenSocioeconomic`, route citizen socioeconomic lama, dan token kolom `income_range` tidak menemukan residu pada kontrak API aktif atau TDD-01 s.d. TDD-05. Istilah tabel lama tetap sebagai sejarah pada TDD-06, catatan revisi ERD, laporan sinkronisasi, dan keterangan route lama yang dihapus pada changelog FE.
- Hitungan 22 tabel hanya tersisa pada catatan historis v5.0 di OpenAPI dan laporan batch terdahulu; hitungan state aktif di TDD-03, ERD, komponen, dan deployment adalah 23 tabel domain / 25 tabel aplikasi non-framework.
- Line ending: `openapi.yaml` ditemukan memakai LF sebelum dan sesudah patch, sehingga tidak dinormalisasi; `docs-sync-report.md` tetap CRLF.

---

## Batch 16 — Audit Migration, Index, & Class Diagram (2026-10-06)

Putaran ini menyelesaikan audit **kolom demi kolom** seluruh migration vs TDD-03, menambahkan kolom **Status** ke seluruh tabel indexing strategy, dan melengkapi class diagram dengan semua kelas yang sebelumnya missing. Source code menjadi acuan; tidak ada file `apps/` yang diubah.

### B16.1 Koreksi tipe/constraint kolom di TDD-03

| ID | Tabel | Kolom | Sebelum (TDD-03) | Sesudah (sesuai migration) |
|---|---|---|---|---|
| B16-01 | hamlets | name | VARCHAR(100) | VARCHAR(255) |
| B16-02 | hamlets | code | VARCHAR(20) | VARCHAR(255) |
| B16-03 | rws | number | VARCHAR(5) | VARCHAR(255) |
| B16-04 | rws | full_label | VARCHAR(20) | VARCHAR(255) |
| B16-05 | rts | number | VARCHAR(5) | VARCHAR(255) |
| B16-06 | rts | full_label | VARCHAR(30) | VARCHAR(255) |
| B16-07 | citizens | nik_hash | VARCHAR(64) | VARCHAR(255) |
| B16-08 | citizens | father_name_text | VARCHAR(100) | VARCHAR(255) |
| B16-09 | citizens | mother_name_text | VARCHAR(100) | VARCHAR(255) |
| B16-10 | citizens | origin_region | VARCHAR(150) | VARCHAR(255) |
| B16-11 | families | no_kk_hash | VARCHAR(64) | VARCHAR(255) |
| B16-12 | officials | phone_wa | VARCHAR(20) | VARCHAR(255) |
| B16-13 | letter_types | name | VARCHAR(100) | VARCHAR(255) |
| B16-14 | letter_types | is_active | DEFAULT true | NOT NULL (tanpa default) |
| B16-15 | letter_types | validity_days | INT | UNSIGNED INT |
| B16-16 | approval_settings | deadline_hours | INT | UNSIGNED INT |
| B16-17 | approval_settings | reminder_hours | INT | UNSIGNED INT |
| B16-18 | notifications | data | JSON | TEXT |

Semua perubahan diverifikasi terhadap file migration di `apps/backend/database/migrations/`. Rule: `$table->string('col')` di Laravel = VARCHAR(255); `$table->string('col', N)` = VARCHAR(N).

### B16.2 Audit indexing strategy — kolom Status ditambahkan

Seluruh tabel di Section 4 "Indexing Strategy" TDD-03 kini memiliki kolom **Status** yang membedakan:
- ✅ **Aktif** — index ada di migration (termasuk auto-generated dari `->unique()`, `->index()`, `uuidMorphs()`)
- 📋 **Planned** — index didokumentasikan sebagai rencana tapi belum ada di migration

Ringkasan per tabel:

| Tabel | Aktif | Planned | Catatan |
|---|---|---|---|
| letters | 5 (status, village_status, flow_step, overdue, nik_hash) | 5 (village, submitted_at, citizen, on_behalf, village_date) | nik_hash auto-generated name |
| letter_status_logs | 2 (letter, created) | 0 | Lengkap |
| citizens | 1 (nik_hash UNIQUE) | 8 | Paling banyak planned |
| notifications | 1 (notifiable composite) | 1 (read_at) | |
| officials | 1 (idx_officials_term) | 8 | Migration punya `(is_active, term_ends_at)`, bukan per-kolom |
| rws | 1 (idx_rws_village) | 1 (idx_rws_hamlet) | TDD awal tulis hamlet, migration tulis village |
| rts | 1 (idx_rts_village) | 2 (rw, active) | |
| hamlets | 0 | 1 (village) | FK auto-index di beberapa engine |
| letter_approvals | 3 (letter, deadline, level) | 0 | Lengkap |
| letter_categories | 1 (code UNIQUE) | 0 | Lengkap |
| approval_flows | 0 | 1 (category) | |
| flow_steps | 2 (flow_order UNIQUE, position) | 0 | Lengkap |
| families | 1 (nokk_hash UNIQUE) | 2 (village, rt) | |
| citizen_socioeconomics | 1 (citizen UNIQUE) | 0 | Lengkap |

### B16.3 Class diagram dilengkapi

File `docs/diagram/code/class/01_Class_Core_v5.puml` diperbarui. Package "Komponen backend aktif yang belum ditampilkan" sekarang mencakup **semua** class yang sebelumnya missing:

| Layer | Kelas ditambahkan |
|---|---|
| Controller | `DashboardController` (3 method), `LetterDownloadController` (2 method), `ProfileController` (2 method) |
| Auth Controller | `AuthenticatedSessionController`, `RegisteredUserController`, `NewPasswordController`, `PasswordResetLinkController`, `EmailVerificationNotificationController`, `VerifyEmailController` |
| Service | `ApprovalFlowService` (4 method), `ApprovalSettingService` (3 method), `DashboardService` (3 method), `KasiLetterService` (2 method), `UsernameGenerator` (1 method) |
| Repository | `LetterNumberCounterRepository` (1 method), `NotificationRepository` |
| Middleware | `EnsurePasswordIsChanged` (1 method), `EnsureUserHasRole` (1 method) |

Relasi dependency (→) juga ditambahkan: 6 controller→service + 9 service→repository baru.

### B16.4 Koreksi FormRequest vs OpenAPI schema

| ID | FormRequest | OpenAPI Schema | Mismatch | Fix yang diterapkan |
|---|---|---|---|---|
| B16-19 | `KadesDecisionRequest` / `RtDecisionRequest`: field `status` | `DecisionRequest`: field `action` | Field name berbeda! | OpenAPI diubah `action` → `status`; `required: [action]` → `required: [status]` |
| B16-20 | `StoreFamilyRequest`: validasi `rw_id` | `FamilyCreateRequest`: tidak ada `rw_id` | Field missing di OpenAPI | `rw_id` (integer, nullable) ditambahkan |
| B16-21 | `UpdateFamilyRequest`: validasi `rw_id` | `FamilyUpdateRequest`: tidak ada `rw_id` | Field missing di OpenAPI | `rw_id` (integer, nullable) ditambahkan |
| B16-22 | `UpdateApprovalSettingRequest`: `required` | `ApprovalSettingUpdateRequest`: tidak ada `required` | Required missing | `required: [deadline_hours, reminder_hours]` + `minimum` ditambahkan |
| B16-23 | `UpdateNewsRequest`: validasi `thumbnail` | `NewsUpdateRequest`: tidak ada `thumbnail` | Field missing di OpenAPI | `thumbnail` (binary, nullable) ditambahkan |

Spot check match (tidak perlu koreksi):
- `StoreLetterRequest` ↔ `LetterCreateRequest` ✅
- `StoreCitizenRequest` ↔ `CitizenCreateRequest` ✅
- `PromoteOfficialRequest` ↔ OpenAPI official schemas ✅
- `LoginRequest` ↔ `LoginRequest` ✅
- `RegisterUserRequest` ↔ `RegisterRequest` ✅
- `StoreNewsRequest` ↔ `NewsCreateRequest` ✅
- `StoreRegulationRequest` / `UpdateRegulationRequest` ↔ `VillageRegulationCreateRequest` ✅
- `StoreHamletRequest` ↔ `HamletCreateRequest` ✅
- `StoreRtRequest` ↔ `RtCreateRequest` ✅
- `StoreRwRequest` ↔ `RwCreateRequest` ✅
- `LetterIndexRequest` ↔ path query params ✅
- `StoreApprovalFlowRequest` / `ReplaceApprovalFlowStepsRequest` ✅
- `ImportCitizensRequest` ✅
- `UpdateProfileRequest` / `UpdatePasswordRequest` ✅

### B16.5 Item belum dikerjakan

- Perbandingan **menyeluruh** seluruh Resource (43 file) vs schema response OpenAPI — belum dimulai.
- Sequence diagram, usecase diagram, Policy, Seeder, `CitizensImport`, `PdfService` vs docs belum diaudit ulang.

### B16.6 File yang berubah pada Batch 16

`docs/technical_design/TDD-03_Database_Schema.md`, `docs/diagram/code/class/01_Class_Core_v5.puml`, `docs/docs-sync-report.md`, `docs/api_spec/schemas/letters/letters.yaml`, `docs/api_spec/schemas/families/families.yaml`, `docs/api_spec/schemas/approval-settings/approval-settings.yaml`, `docs/api_spec/schemas/news/news.yaml`.

---

## Batch 15 — Koreksi Lanjutan (2026-10-06)

Putaran ini mengeksekusi koreksi berdasarkan temuan review manual terhadap output Batch 14 dan Addendum. Source code menjadi acuan; tidak ada file `apps/` yang diubah.

### B15.1 Koreksi yang diterapkan

| ID | Dokumen | Perubahan | Bukti source |
|---|---|---|---|
| B15-01 | `TDD-04` baris 57–68 (Logging & Audit Trail) | Tabel audit trail ditambah kolom Status. Baris login/logout, akses data sensitif, dan CRUD warga diubah dari klaim aktif `spatie/activitylog` menjadi **Planned**. Hanya jabatan (`OfficialAssignmentService`) dan `letter_status_logs` yang **Aktif**. Paragraf penutup dikoreksi. | `findstr /s activity app/*.php`: hanya `OfficialAssignmentService.php:359` memanggil `activity('official')`; tidak ada model dengan trait `LogsActivity` |
| B15-02 | `TDD-04` baris 38 (enkripsi field) | Klaim ambigu "NIK, No KK, dan alamat" diganti dengan daftar eksplisit 5 field: `citizens.nik`, `families.no_kk`, `families.family_address`, `letters.applicant_nik`, `letters.applicant_address`. Ditegaskan `citizens.address` **tidak** terenkripsi. | `Family.php:32-33`, `Letter.php:44-45`, `Citizen.php:58` — `$casts` hanya 5 field; `Citizen.address` tanpa cast |
| B15-03 | `TDD-03` baris 98 (`users.role`) | Constraint diubah dari NOT NULL → **NULL** | `create_users_table.php:19` — `->nullable()` |
| B15-04 | `TDD-03` baris 101 (`users.is_active`) | Constraint diubah dari DEFAULT true → **NOT NULL tanpa default** | `create_users_table.php:25` — `->boolean('is_active')` tanpa `->default()` |
| B15-05 | `docs-sync-report.md` A.3 & 3.7 | Jumlah `$ref` dikoreksi dari 484 → **485** | `Select-String -SimpleMatch '$ref'` pada 99 file YAML menghasilkan 485 |
| B15-06 | `docs-sync-report.md` A.3 (Non-fungsional) | Klaim "hanya `Citizen.nik` terenkripsi" diganti dengan daftar 5 field lengkap | Idem B15-02 |
| B15-07 | `docs-sync-report.md` 3.2 (Bukti utama) | Daftar enkripsi dikoreksi lengkap 5 field + `Citizen.address` tidak terenkripsi | Idem B15-02 |
| B15-08 | `docs-sync-report.md` K-02 | Teks "Tetap dua versi (16 dan 18)" diubah menjadi netral: "Tidak ditentukan dari source; docs menandai sebagai Tidak diverifikasi" | Docs sudah netral, tidak menyebut versi spesifik |
| B15-09 | `docs-sync-report.md` A.4 (activity_log) | Status diubah dari "perlu konfirmasi" → **Dikonfirmasi**; TDD-04 sudah dikoreksi | Hasil B15-01 |

### B15.2 Temuan pelanggaran guardrail

| ID | Temuan | Status |
|---|---|---|
| G-01 | 61 file YAML di `docs/api_spec/` menggunakan LF-only | **Bukan pelanggaran** — `git ls-files --eol` menunjukkan `i/lf w/lf` pada semua file; file-file ini sudah LF di repo sejak awal, bukan konversi CRLF→LF |
| G-02 | File baru `docs/auth-approval-flow-baseline.md` (untracked) | File **belum di-track** oleh git (`??` di status). Tidak memengaruhi docs yang ter-track. Rekomendasi: hapus atau tambahkan ke `.gitignore` jika tidak diperlukan |
| G-03 | Header Batch 14: addendum di atas isi Batch 14 | Diperbaiki dengan menambahkan Batch 15 terpisah di atas; struktur sekarang: Batch 15 → Batch 14 Addendum → Batch 14 → Batch 12 (kronologis terbalik) |

### B15.3 Item belum dikerjakan (diteruskan dari A.4)

- Perbandingan **menyeluruh** seluruh FormRequest (53 file) vs schema request OpenAPI.
- Perbandingan **menyeluruh** seluruh Resource (43 file) vs schema response OpenAPI.
- ~~Audit tipe/nullability/default/index/FK kolom demi kolom seluruh migration vs TDD-03 dan ERD (baru `users.role` dan `users.is_active` yang dikoreksi).~~ → **Selesai di Batch 16** (B16.1 + B16.2: 18 koreksi kolom + seluruh index diberi status).
- ~~Class diagram masih belum memuat: `ApprovalFlowService`, `ApprovalSettingService`, `DashboardController`/`DashboardService`, `KasiLetterService`, `LetterDownloadController`, `LetterNumberCounterRepository`, `UsernameGenerator`, `EnsurePasswordIsChanged`, `EnsureUserHasRole`, `ProfileController`, dan 6 controller auth.~~ → **Selesai di Batch 16** (B16.3: 20+ class ditambahkan + 15 relasi dependency).
- Sequence/usecase/Policy/Seeder/`CitizensImport`/`PdfService` vs docs belum diaudit ulang.

### B15.4 File yang berubah pada Batch 15

`docs/technical_design/TDD-03_Database_Schema.md`, `docs/technical_design/TDD-04_Security_NFR_Compliance.md`, `docs/docs-sync-report.md`.

---

## Batch 14 — Addendum Verifikasi Ulang (2026-10-06)

Putaran ini memverifikasi ulang isi Batch 14 di bawah terhadap source. Isi Batch 14 tetap dipertahankan sebagai histori. PHP dan PlantUML CLI tidak tersedia; route diparse **statis** dari `routes/api.php`, `routes/auth.php`, `routes/web.php`, `bootstrap/app.php`. Tidak ada migration, seeder, test, atau commit yang dijalankan. Tidak ada file di `apps/` yang diubah.

### A.1 Koreksi terhadap hipotesis prompt

| ID | Hipotesis prompt | Hasil verifikasi |
|---|---|---|
| H-01 | `docs/docs-changed.md` tidak ada | File **ada** di zip (isi: daftar Batch 12). Rujukan di Batch 12 tidak rusak; anotasi koreksi lama dipertahankan. |
| H-02 | Banyak class fiktif (`ApprovalDeadlineService`, `ContactService`, `RegionController`, dst.) | Pemeriksaan nama class docs vs `apps/backend/app`: tidak ada lagi sebagai klaim aktif. Sisa nama non-source: `HashingService` (sudah berlabel Next Dev/Planned), `KadusApprovalController`/`RwApprovalController`/`KasiApprovalController`/`FlowStepApprovalController` (hanya catatan historis berlabel). |
| H-03 | Middleware peran bernama `petugas_desa` | Source memakai alias `role:` (`EnsureUserHasRole`), nilai dari `UserRole::middleware(...)`, mis. `role:petugas_desa` (`app/Enums/UserRole.php`; `bootstrap/app.php:30-33`). |
| H-04 | TDD-03: 22 tabel domain + 2 operasional | **PASS.** Migration menghasilkan 22 tabel domain + `letter_number_counters` + `activity_log` = 24. |

### A.2 Perubahan addendum

| ID | Klasifikasi | Dokumen & lokasi | Sebelum → Sesudah | Bukti source |
|---|---|---|---|---|
| N-01 | BENTROK | `api_spec/schemas/letters/letters.yaml` `LetterCreateRequest` | Field `supporting_document` (wajib bila `verification_type=document`) → dihapus; ditambah `payload` (object nullable), `attachments` (array file pdf/jpg/jpeg/png, maks 2048 KB; hanya divalidasi), `purpose` maxLength 500 | `app/Http/Requests/StoreLetterRequest.php:15-47`; `LetterService.php:66` (hanya `payload` disimpan); grep `attachments` di service/controller: 0 hasil |
| N-02 | BENTROK | `api_spec/paths/letters/letters.yaml` POST | Contoh 422 `missing_document` dihapus; deskripsi 422 disesuaikan; requestBody juga menerima `application/json` | idem |
| N-03 | TERTINGGAL | `api_spec/paths/letters/letters.yaml` GET | Query `from`, `to`, `applicant_name` ditambahkan (filter `submitted_at` tanggal; `to` `after_or_equal:from`) | `LetterIndexRequest.php:25-40`; `LetterService.php:280-298` |
| N-04 | PLANNED | `TDD-02` UC-03, `TDD-01` baris Validasi Kelayakan Surat | Perilaku `verification_type` auto/manual/document diberi label Planned; backend hanya menyimpan atribut | `LetterType.php:19`; grep `verification_type`/`LetterVerificationType` di `app/` (di luar Enum/Resource): hanya `LetterType.php:19` |
| N-05 | PLANNED | `TDD-01` (Sistem Notifikasi), `TDD-02` (UC-22 catatan overdue) | "reminder deadline"/"notifikasi reminder" tersirat aktif → dilabeli Belum diimplementasi (Planned) | `routes/console.php` hanya `inspire`; `reminded_at`/`reminder_hours` hanya di Model/Resource/Request/Seeder |
| N-06 | BENTROK (typo) | `TDD-03` baris `reminder_hours` | Karakter rusak `???` → tanda pisah | — |
| N-07 | DIGANTI | `diagram/code/class/01_Class_Core_v5.puml` komentar historis | Kalimat sisa "melayani Kades, Sekdes, Kasi, Kaur" diberi anotasi tidak berlaku | `routes/api.php` blok `/kades`, `/kasi`; `KasiLetterController` |
| N-08 | Kosmetik | Judul Batch 14 | Karakter `?` rusak → `—` | — |

### A.3 Hasil verifikasi (dijalankan)

| Pemeriksaan | Hasil |
|---|---|
| YAML + `$ref` | **PASS** — 99 file, 485 `$ref`, 0 rusak (setelah perubahan) |
| Route↔OpenAPI (method+path) | **PASS** — 108 operasi di kedua sisi, selisih 0/0 (97 `/api` hasil parse statis + 11 web/infra; `/logout` satu operasi) |
| Tautan Markdown relatif | **PASS** — 0 rusak |
| PlantUML `@startuml`/`@enduml` | **PASS** — 27 file berpasangan (`02_ERD_Pendukung_v7.puml` memakai indentasi di awal baris; valid). Keseimbangan `alt/opt/loop ... end` dan `plantuml -checkonly` **TIDAK DIJALANKAN** (CLI tidak tersedia; keseimbangan tidak diperiksa mendalam) |
| Nama class docs vs source | **PASS dengan catatan** — hanya sisa nama historis berlabel dan nama schema OpenAPI (`*Request` pada schema bukan class FormRequest) |
| Non-fungsional vs config | **PASS** — AES-256-CBC (`config/app.php:98`), argon2id memory 65536/time 4/threads 1 (`config/hashing.php`), limiter `register` 5/menit/IP + 10/jam/hash NIK (`AppServiceProvider.php:33-38`), `throttle:6,1` verifikasi email. Field terenkripsi: `Citizen.nik`, `Family.no_kk`, `Family.family_address`, `Letter.applicant_nik`, `Letter.applicant_address`; `Citizen.address` **tidak** terenkripsi |
| Test DB | **PASS** — `phpunit.xml` memakai SQLite `:memory:`; tidak ada klaim sebaliknya yang ditemukan di DEV-TEST-001 pada pemeriksaan ini |
| `apps/` tidak berubah | **PASS** — `git diff --stat` hanya menampilkan `docs/` |

### A.4 Belum dikerjakan pada putaran ini (jujur)

- Perbandingan **menyeluruh** seluruh FormRequest vs schema request (tipe/required/min/max), selain `StoreLetterRequest` dan `LetterIndexRequest`.
- Perbandingan **menyeluruh** `app/Http/Resources/*` vs schema response (field kondisional `whenLoaded`).
- Pemeriksaan tipe/nullability/default/index/FK kolom demi kolom migration vs TDD-03 dan ERD (hanya nama tabel dan hitungan yang diverifikasi).
- Class diagram masih belum memuat: `ApprovalFlowService`, `ApprovalSettingService`, `DashboardController`/`DashboardService`, `KasiLetterService`, `LetterDownloadController`, `LetterNumberCounterRepository`, `UsernameGenerator`, `EnsurePasswordIsChanged`, `EnsureUserHasRole`, `ProfileController`, dan controller auth. SID-ARCH-BE-001 mendaftar komponen secara umum (pencocokan nama kasar tidak konklusif).
- Sequence/usecase/Policy/Seeder/`CitizensImport`/`PdfService` vs docs belum diaudit ulang.
- `activity_log`: **Dikonfirmasi** — tidak ada model aplikasi memakai trait `LogsActivity`; hanya `OfficialAssignmentService` yang memanggil `activity('official')`. TDD-04 Logging & Audit Trail telah dikoreksi: baris login/logout, akses data sensitif, dan CRUD warga ditandai Planned; hanya jabatan dan `letter_status_logs` yang Aktif.

### A.5 Butuh keputusan pemilik proyek (tambahan)

| ID | Pertanyaan | Opsi | Status sementara di docs |
|---|---|---|---|
| K-01 | Apakah `attachments` dan `verification_type` akan diimplementasikan (simpan berkas, wajibkan dokumen)? | Implementasi / hapus validasi | Dokumentasi: hanya divalidasi; Planned |
| K-02 | Versi PostgreSQL 16 vs 18 | 16 / 18 | Tidak ditentukan dari source (`DB_CONNECTION=pgsql`); docs menandai sebagai Tidak diverifikasi tanpa memilih versi |

### A.6 Drift komentar/kode di source (tambahan, source tidak diubah)

- Komentar `routes/api.php` di blok `letter-types` menyebut api_spec menulis PATCH padahal OpenAPI sudah PUT.
- `StoreLetterRequest` menerima `attachments` tanpa konsumen di service.

### A.7 File yang berubah pada addendum

`docs/api_spec/paths/letters/letters.yaml`, `docs/api_spec/schemas/letters/letters.yaml`, `docs/technical_design/TDD-01_Overview_Scope_Roles.md`, `docs/technical_design/TDD-02_UseCase_Descriptions.md`, `docs/technical_design/TDD-03_Database_Schema.md`, `docs/diagram/code/class/01_Class_Core_v5.puml`, `docs/docs-sync-report.md`, `docs/route-diff.md`.

---

## Batch 14 — Sinkronisasi terhadap Source Backend Final

Tanggal audit: 2026-10-06. Source backend menjadi acuan; tidak ada file `apps/` yang diedit oleh audit ini.

### 3.1 Ringkasan eksekutif

- Batch ini mengoreksi dokumentasi enkripsi field, rate limit, notifikasi, struktur backend, parameter/security OpenAPI, versi PostgreSQL, dan status reminder.
- Snapshot route-list menghasilkan 97 operasi API dan 12 record route web/infrastruktur; setelah `/logout` yang berimpit dihitung sekali, OpenAPI memiliki 108 operasi unik.
- Pencocokan method/path dua arah menghasilkan 0 route-only dan 0 OpenAPI-only.
- Pemeriksaan security dan role per operasi menghasilkan 0 mismatch setelah kontrak dikoreksi.
- Satu perbedaan nama parameter berasal dari route source sendiri (`GET /letters/{id}` dan `DELETE /letters/{letter}`); keputusan pemilik proyek masih diperlukan untuk normalisasi.
- Versi PostgreSQL yang dipakai deployment tidak bisa ditentukan dari `DB_CONNECTION=pgsql`; konflik 16/18 tetap menunggu keputusan.
- Status backup, worker, topologi deployment, dan penjadwalan OS diberi label Tidak diverifikasi terhadap source backend.
- Ledger rinci disimpan sementara di `%TEMP%\docs-sync-ledger.md`; ringkasan klasifikasi dan bukti dicatat di bawah.

### 3.2 Temuan menurut klasifikasi

Jumlah adalah jumlah entri ledger, bukan jumlah file. Satu temuan dapat mengubah beberapa dokumen.

| Klasifikasi | Jumlah | Ringkasan |
|---|---:|---|
| BENTROK | 5 | Enkripsi alamat; event/job notifikasi; kontrak security/role; struktur folder generik; klaim async queue. |
| TERTINGGAL | 2 | Class backend domain dan satu literal enum reason yang belum tercantum. |
| DIHAPUS/DIGANTI | 1 | Class fiktif/historis yang ditampilkan sebagai implementasi aktif. |
| PLANNED | 1 | Reminder approval otomatis; kolom konfigurasi tetap aktif. |
| TIDAK DIVERIFIKASI | 1 | Versi DB, deployment, backup, dan worker eksternal. |
| DIKECUALIKAN | 2 | Enum legacy approval dan route yang dikomentari. |
| PERLU KEPUTUSAN | 2 | Versi PostgreSQL; nama parameter GET/DELETE `/letters/{...}`. |

**Bukti utama:** `Citizen::$casts` mengenkripsi NIK (`app/Models/Citizen.php:58`); `Family::$casts` mengenkripsi `no_kk` dan `family_address` (`app/Models/Family.php:32-33`); `Letter::$casts` mengenkripsi `applicant_nik` dan `applicant_address` (`app/Models/Letter.php:44-45`); `Citizen.address` tidak terenkripsi; notifikasi status memakai kanal `database` (`app/Notifications/LetterStatusNotification.php:20`); level approval aktif RT/Kades (`app/Enums/ApprovalLevel.php:16-22`); `DB_CONNECTION=pgsql` (`.env.example:27`); command console aplikasi hanya `inspire` (`routes/console.php:6`).

### 3.3 Perubahan yang diterapkan

| ID | Klasifikasi | Perubahan | Bukti source |
|---|---|---|---|
| C-01 | BENTROK | Menghapus klaim bahwa `citizens.address` dienkripsi; field terenkripsi disamakan pada TDD-02/03/04 dan ARCH-BE. | `app/Models/Citizen.php:58`; `app/Models/Family.php:31-32`; `app/Models/Letter.php:49-50` |
| C-02 | BENTROK | Mengganti event/listener/job notifikasi aktif dengan pemanggilan `LetterStatusNotification` langsung dari service. | `app/Services/LetterService.php:139-153`; `RtApprovalService.php:171-255`; `KadesApprovalService.php:199-240`; `LetterStatusNotification.php:20` |
| C-03 | BENTROK | Menetapkan security OpenAPI sesuai middleware; menambah aktor role yang hilang; menyelaraskan 11 nama path parameter. | `routes/api.php`; `routes/auth.php`; `bootstrap/app.php:28-33` |
| C-04 | TERTINGGAL | Menambahkan komponen domain yang terlewat ke class diagram dan inventaris ARCH-BE. | Class tersedia pada `apps/backend/app/Services`, `Repositories`, `Http/Controllers/Api`, `Policies`, `Middleware`, `Imports`, `Console/Commands`, dan `Exceptions`. |
| C-11 | TERTINGGAL | Menambahkan literal enum alasan tahap RT dilewati ke TDD-03 dan ERD. | `apps/backend/app/Enums/LetterFlowLogReason.php:7` |
| C-05 | DIHAPUS/DIGANTI | Menghapus class palsu dari deklarasi aktif dan menggunakan class controller/service/repository yang ada. | `app/Http/Controllers/Api/KadesApprovalController.php:13`; `app/Services/HamletService.php:13`; `app/Repositories/HamletRepository.php:8` |
| C-06 | PLANNED | Reminder otomatis ditandai Planned; dokumentasi membedakan kolom `reminded_at`/`reminder_hours` dari job scheduler yang belum ada. | `app/Models/ApprovalSetting.php:20`; `routes/console.php:6` |
| C-07 | TIDAK DIVERIFIKASI | Menandai versi PostgreSQL, worker/deployment, dan backup sebagai hal di luar bukti source. | `.env.example:27`; `routes/console.php:6` |
| C-08 | BENTROK | Mengganti contoh backend Order/Product dengan struktur aplikasi yang nyata. | `apps/backend/app/Http/Controllers/Api/` dan `apps/backend/app/Services/` |
| C-09 | DIKECUALIKAN | Menjelaskan enum approval legacy; hanya `rt` dan `kepala_desa` yang keluar dari `approverCases()`. | `app/Enums/ApprovalLevel.php:16-22` |
| C-10 | PERLU KEPUTUSAN | Menahan normalisasi parameter karena route GET dan DELETE memberi nama berbeda untuk template path sama. | `routes/api.php:236-237` |

### 3.4 Butuh keputusan pemilik proyek

| ID | Pertanyaan | Opsi | Dampak ke docs | Status sementara di docs |
|---|---|---|---|---|
| D-01 | Versi PostgreSQL deployment yang dijadikan standar: 16 atau 18? | Pilih satu versi dari keputusan deployment | Set `SETUP.md`, ARCH-BE, deployment diagram | Ditandai Tidak diverifikasi; tidak memilih versi |
| D-02 | Apakah route GET `/api/letters/{id}` akan diubah menjadi `{letter}` agar konsisten dengan DELETE `/api/letters/{letter}`? | Ubah route/controller atau pertahankan perbedaan | Nama path OpenAPI bersama tidak dapat mencerminkan dua placeholder sekaligus | OpenAPI memakai `{letter}` untuk kompatibilitas implicit binding DELETE; konflik GET dicatat |

### 3.5 Drift komentar/kode di source (rekomendasi untuk tim)

- Komentar di `routes/api.php` sekitar blok officials menyebut pelonggaran role, sedangkan route aktif memakai middleware `petugas_desa`; dokumentasi mengikuti middleware kode.
- Komentar pada blok Kades/Sekdes masih menyebut keputusan final sebagai rekomendasi, sedangkan route/controller/service menyediakan keputusan final. Source tidak diubah.
- Migration `letter_approvals` menyebut job pengingat dalam komentar index; source tidak memiliki job tersebut. Index `deadline_at` tetap ada, mekanisme pengingat berstatus Planned.

### 3.6 Cakupan per lapisan

| Lapisan | File diperiksa | File pada diff kerja | Catatan |
|---|---:|---:|---|
| OpenAPI root/paths/schemas/responses/index | 99 YAML | 79 | Semua file YAML diparse; route/security/role diperiksa. |
| TDD-01..06 | 6 | 5 | TDD-03 field database diperiksa sebagian; audit tipe/constraint lengkap belum dijalankan. |
| ARCH-BE + ARCH-SYS (bagian backend) | 2 | 2 | Klaim enkripsi, queue/event, scheduler, stack dan infra diperiksa. |
| ERD/class/sequence/usecase/activity/component/deployment | 27 PlantUML | 27 | Pemeriksaan struktur PlantUML; CLI tidak tersedia. |
| Workflow bisnis | 5 PlantUML | 4 | Reminder diberi status Planned. |
| Dev/operasional/backend-patch | Sesuai path pada daftar | 5 | Bagian backend saja. |
| route-diff + sync report | 2 | 2 | Snapshot Batch 14 dan laporan ini. |

**Catatan baseline:** working tree sudah memiliki perubahan docs sebelum audit dimulai. Daftar 3.8 mencatat seluruh path docs dalam scope yang terlihat pada diff saat laporan dibuat; bukan atribusi bahwa semua perubahan tersebut dibuat selama turn ini.

### 3.7 Hasil verifikasi wajib

| Pemeriksaan | Hasil | Angka/metode |
|---|---|---|
| YAML + `$ref` | PASS | 99 file parse; 485 `$ref`; 0 file/fragmen hilang. |
| Route ? OpenAPI method/path | PASS | 108 operasi unik; 0 route-only; 0 OpenAPI-only; `GET|HEAD` dihitung GET. |
| Nama parameter, security, role | PARTIAL / PERLU KEPUTUSAN | 0 security mismatch; 0 role gap; 1 konflik nama source pada GET/DELETE `/letters/{...}`. |
| Enum | PASS / PARTIAL | 93/93 nilai enum source ditemukan di docs; `ApprovalLevel::approverCases()` aktif RT/Kades dan nilai legacy diberi catatan. Pemeriksaan seluruh nilai doc-only tidak dijalankan terpisah. |
| Skema migration ? TDD-03/ERD | TIDAK DIJALANKAN penuh | 22 tabel domain + `letter_number_counters` dan `activity_log` terlihat di dokumen; pemeriksaan semua tipe, nullability, default, index, FK, on-delete, dan ERD belum dijalankan. |
| Nama class seluruh docs ? source | PARTIAL | Deklarasi class pada dua diagram diperiksa; beberapa nama historis/schema contract bukan class PHP. Pemindaian penuh seluruh dokumen belum dilakukan. |
| PlantUML struktural | PASS | 27 file; pasangan start/end dan blok `alt/opt/loop/group/par` seimbang. |
| PlantUML CLI | TIDAK DIJALANKAN | `plantuml` tidak tersedia di PATH. |
| Tautan Markdown relatif | PASS terbatas | 1 tautan Markdown standar ditemukan; 0 target rusak. |
| Label status | PARTIAL | Label Planned/Tidak diverifikasi/Catatan legacy dipasang dan tercatat di klasifikasi; grep seluruh status lintas dokumen belum dijalankan final. |
| Batas perubahan + whitespace | PASS terbatas | `git diff --check` bersih; tidak ada file backend tracked yang diedit oleh audit. Ada `apps/backend/storage/test-results/` untracked pada baseline awal. |
| Line ending | PASS | Line ending dokumen dipertahankan; `docs/docs-sync-report.md` dinormalisasi ke CRLF sesuai instruksi. |

Tidak ada migration, seeder, atau test yang dijalankan. `php artisan route:list --json` hanya membaca route.

### 3.8 Daftar file docs dalam scope yang terlihat pada diff

- `docs/SETUP.md`
- `docs/STRUKTUR_FOLDER.md`
- `docs/api_spec/00_INDEX.md`
- `docs/api_spec/openapi.yaml`
- `docs/api_spec/paths/approval-flows/approval-flow-detail.yaml`
- `docs/api_spec/paths/approval-flows/approval-flow-steps.yaml`
- `docs/api_spec/paths/approval-flows/approval-flows.yaml`
- `docs/api_spec/paths/approval-settings/approval-setting-detail.yaml`
- `docs/api_spec/paths/approval-settings/approval-settings.yaml`
- `docs/api_spec/paths/auth/forgot-password-v51.yaml`
- `docs/api_spec/paths/auth/login.yaml`
- `docs/api_spec/paths/auth/logout.yaml`
- `docs/api_spec/paths/auth/profile-password-v51.yaml`
- `docs/api_spec/paths/auth/profile-v51.yaml`
- `docs/api_spec/paths/auth/register.yaml`
- `docs/api_spec/paths/auth/reset-password-v51.yaml`
- `docs/api_spec/paths/auth/verification-notification.yaml`
- `docs/api_spec/paths/auth/verify-email.yaml`
- `docs/api_spec/paths/citizens/citizen-detail.yaml`
- `docs/api_spec/paths/citizens/citizen-socioeconomics.yaml`
- `docs/api_spec/paths/citizens/citizens-wilayah.yaml`
- `docs/api_spec/paths/citizens/citizens.yaml`
- `docs/api_spec/paths/citizens/import.yaml`
- `docs/api_spec/paths/dashboard/dashboard.yaml`
- `docs/api_spec/paths/families/families.yaml`
- `docs/api_spec/paths/families/family-detail.yaml`
- `docs/api_spec/paths/infrastructure/csrf-cookie.yaml`
- `docs/api_spec/paths/infrastructure/health.yaml`
- `docs/api_spec/paths/infrastructure/root.yaml`
- `docs/api_spec/paths/infrastructure/storage.yaml`
- `docs/api_spec/paths/kades/letter-decision.yaml`
- `docs/api_spec/paths/kades/letter-detail.yaml`
- `docs/api_spec/paths/kades/letters.yaml`
- `docs/api_spec/paths/kasi/letter-detail.yaml`
- `docs/api_spec/paths/kasi/letters.yaml`
- `docs/api_spec/paths/letter-types/letter-type-detail.yaml`
- `docs/api_spec/paths/letter-types/letter-types.yaml`
- `docs/api_spec/paths/letters/download.yaml`
- `docs/api_spec/paths/letters/letter-detail.yaml`
- `docs/api_spec/paths/letters/letters.yaml`
- `docs/api_spec/paths/letters/preview-v51.yaml`
- `docs/api_spec/paths/news/news-detail.yaml`
- `docs/api_spec/paths/officials/demote-v51.yaml`
- `docs/api_spec/paths/officials/official-detail.yaml`
- `docs/api_spec/paths/officials/officials.yaml`
- `docs/api_spec/paths/officials/promote-v51.yaml`
- `docs/api_spec/paths/officials/rotate.yaml`
- `docs/api_spec/paths/public/contact-us.yaml`
- `docs/api_spec/paths/public/home.yaml`
- `docs/api_spec/paths/public/letter-types.yaml`
- `docs/api_spec/paths/public/news.yaml`
- `docs/api_spec/paths/public/regulations.yaml`
- `docs/api_spec/paths/public/village-profile.yaml`
- `docs/api_spec/paths/regulations/regulation-detail.yaml`
- `docs/api_spec/paths/rt/letter-decision.yaml`
- `docs/api_spec/paths/rt/letter-detail.yaml`
- `docs/api_spec/paths/rt/letters.yaml`
- `docs/api_spec/paths/rw/letter-detail.yaml`
- `docs/api_spec/paths/rw/letters.yaml`
- `docs/api_spec/paths/users/reset-password-v51.yaml`
- `docs/api_spec/paths/users/toggle-status-v51.yaml`
- `docs/api_spec/paths/users/user-detail.yaml`
- `docs/api_spec/paths/users/users.yaml`
- `docs/api_spec/paths/village-org/member-detail.yaml`
- `docs/api_spec/paths/village-org/members.yaml`
- `docs/api_spec/paths/village-org/position-detail.yaml`
- `docs/api_spec/paths/village-org/positions.yaml`
- `docs/api_spec/paths/wilayah/hamlet-detail.yaml`
- `docs/api_spec/paths/wilayah/hamlets.yaml`
- `docs/api_spec/paths/wilayah/rt-detail.yaml`
- `docs/api_spec/paths/wilayah/rts.yaml`
- `docs/api_spec/paths/wilayah/rw-detail.yaml`
- `docs/api_spec/paths/wilayah/rws.yaml`
- `docs/api_spec/schemas/approval-settings/approval-settings.yaml`
- `docs/api_spec/schemas/auth/auth.yaml`
- `docs/api_spec/schemas/common/errors.yaml`
- `docs/api_spec/schemas/dashboard/dashboard.yaml`
- `docs/api_spec/schemas/letter-categories/letter-categories.yaml`
- `docs/api_spec/schemas/letter-types/letter-types.yaml`
- `docs/api_spec/schemas/letters/letters.yaml`
- `docs/api_spec/schemas/users/users.yaml`
- `docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md`
- `docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md`
- `docs/auth-approval-flow-final-report.md`
- `docs/backend-patch/auth-approval-flow-analysist.md`
- `docs/backend-patch/auth-approval-flow-plan.md`
- `docs/bussines_workflow/01_Entry_Point_Overview.puml`
- `docs/bussines_workflow/03_SID_POV_RTRW_StaffDesa.puml`
- `docs/bussines_workflow/04_SID_POV_Admin_Eksekutif_Superadmin.puml`
- `docs/bussines_workflow/05_SistemOtomatis.puml`
- `docs/diagram/code/alur_sistem_and_arsitektur_teknis/01_Activity_AlurSistem_v5.puml`
- `docs/diagram/code/alur_sistem_and_arsitektur_teknis/02_Component_ArsitekturTeknis_v5.puml`
- `docs/diagram/code/class/01_Class_Core_v5.puml`
- `docs/diagram/code/class/02_Class_Pendukung_v5.puml`
- `docs/diagram/code/deployment/01_Deployment_Architecture_Detail_v5.puml`
- `docs/diagram/code/deployment/02_Deployment_Architecture_HighLevel_v5.puml`
- `docs/diagram/code/erd/01_ERD_Core_v7.puml`
- `docs/diagram/code/erd/01_ERD_Core_v7_PATCH.md`
- `docs/diagram/code/erd/02_ERD_Pendukung_v7.puml`
- `docs/diagram/code/sequence/01_Sequence_InputSurat_v5.puml`
- `docs/diagram/code/sequence/02_Sequence_RegisterWarga_v5.puml`
- `docs/diagram/code/sequence/03_Sequence_RTApproval_v5.puml`
- `docs/diagram/code/sequence/04_Sequence_NotifikasiRW_SideEffect_v5.puml`
- `docs/diagram/code/sequence/05_Sequence_ProcessFlowStep_Generic_v5.puml`
- `docs/diagram/code/usecase/01_UC_Warga_v5.puml`
- `docs/diagram/code/usecase/02_UC_PetugasDesa_SuratWarga_v5.puml`
- `docs/diagram/code/usecase/03_UC_PetugasDesa_WilayahJabatan_v5.puml`
- `docs/diagram/code/usecase/04_UC_PetugasDesa_KontenKonfigurasi_v5.puml`
- `docs/diagram/code/usecase/05_UC_KepalaDesa_SekretarisDesa_v5.puml`
- `docs/diagram/code/usecase/06_UC_RT_v5.puml`
- `docs/diagram/code/usecase/07_UC_RW_v5.puml`
- `docs/diagram/code/usecase/08_UC_Kadus_v5.puml`
- `docs/diagram/code/usecase/09_UC_KasiKaur_v5.puml`
- `docs/docs-sync-report.md`
- `docs/route-diff.md`
- `docs/technical_design/TDD-01_Overview_Scope_Roles.md`
- `docs/technical_design/TDD-02_UseCase_Descriptions.md`
- `docs/technical_design/TDD-03_Database_Schema.md`
- `docs/technical_design/TDD-04_Security_NFR_Compliance.md`
- `docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md`

---

## Riwayat Batch 12

# Laporan Sinkronisasi Dokumentasi — Batch 12

**Catatan versi:** perubahan dokumen TDD menandai revisi sebagai
**v5.1 — Auth & Approval Flow**. Implementasi/rute dan migration yang
berjalan menjadi acuan ketika berbeda dari spesifikasi historis.

| Butir | Dokumen/bagian | Ringkasan sinkronisasi |
|---|---|---|
| 1 | `docs/frontend-changelog-auth-approval-flow.md` | Changelog berisi contoh request/response login username, register NIK, profile/password, promote/demote/rotate, reset password, `scope=mine`, daftar Kasi, dashboard Kasi/Petugas/Kades, kode `password_change_required`, dan struktur `warnings`. |
| 2a | TDD-01 — Table 2, Table 3, Section 3.1, Table 4 | Peran Kasi/Kaur diubah menjadi notifikasi dan akses unduh; Kades/Sekdes menjadi tahap final. Alur default RT → Kades/Sekdes, submit pejabat, FYI RW setelah RT approve, dan aturan tahap dilewati diperbarui. |
| 2b | TDD-02 — UC-01 | Login menggunakan username; menampilkan `is_active` sebagai prasyarat dan `must_change_password` sebagai guard. |
| 2b | TDD-02 — UC-03 | Akun pejabat yang memiliki citizen dapat submit untuk dirinya. Tahap awal dinamis, tahap non-final milik pemohon dapat dilewati dengan syarat approver tersedia; final tidak dilewati dan self-approval dilarang. |
| 2b | TDD-02 — UC-04c | Kades/Sekdes memutuskan tahap final; actor aktual dicatat; final approve menghasilkan `letter_number`/`expires_at`. |
| 2b | TDD-02 — UC-04d | UC lama approval Kasi/Kaur diganti dengan notifikasi dan akses baca/unduh surat approved berdasarkan `assigned_role`. |
| 2b | TDD-02 — UC-08 | Masa berlaku ditegakkan terhadap pemohon tanpa memandang role; PDF tetap memakai tanda tangan/stempel Kades aktif. |
| 2b | TDD-02 — UC-14 | Pengelolaan jabatan promote/demote/rotate, reset password sementara, guard, audit, dan command petugas pertama/demote/reset didokumentasikan. |
| 2b | TDD-02 — UC-15 | Payload dashboard Kasi, widget masa jabatan Petugas, dan pengecualian surat sendiri pada Kades/Sekdes diperbarui. |
| 2b | TDD-02 — UC-17 | Register NIK + password, username otomatis `namadepan.NNNN`, respons 201, penggantian username/email profil diperbarui. |
| 2b | TDD-02 — UC-22 | Hanya level approver RT/Kades yang dikembalikan/diubah; Sekdes memutuskan pada step `kepala_desa`, sedangkan Kasi/Kaur bukan level approval aktif. |
| 2c | TDD-03 — users | UUID, username wajib unik, email nullable, `must_change_password`, dan Argon2id tercatat. |
| 2c | TDD-03 — officials | Tipe relasi user/citizen menggunakan UUID dan `term_ends_at` ditambahkan sebagai informasi masa jabatan. |
| 2c | TDD-03 — letter_number_counters | Tabel counter, FK UUID desa, FK bigint jenis surat, year, last_number, dan unique key per desa/tipe/tahun didokumentasikan. |
| 2c | TDD-03 — assigned_role/status pending | `assigned_role` menjadi penentu akses Kasi/Kaur (NULL berarti keduanya), bukan cache approver; definisi `pending` memasukkan surat yang belum mendapat keputusan meski tahap awal dilewati. |
| 2d | TDD-04/TDD-05 | Argon2id, rate limit register, audit jabatan, password change guard, guard petugas dan command CLI dicatat. Keputusan Sekdes tahap final dan `assigned_role` ditutup sebagai keputusan, bukan pertanyaan terbuka. |
| 2e | OpenAPI root, path, dan schema | Kontrak v5.1 diperbarui untuk login/register/profile/password, promote/demote/rotate, reset password, scope mine, read-only Kasi, dashboard, approval flow validation, approval settings, UUID dan `term_ends_at`. `POST /users` dan keputusan Kasi dihapus dari kontrak; server bisnis menggunakan prefix `/api`, operasi web auth memakai server root. |
| 2f | `01_Class_Core_v5.puml` | Menambahkan `OfficialAssignmentService`, `LetterFlowService`, `LetterNumberGenerator`, dan `ProfileService`; memperjelas `KasiLetterController` read-only dan `FlowStepApprovalController` khusus Kades/Sekdes. Catatan historis v5.0 ditandai sebagai superseded. |
> *Dikoreksi pada Batch 14: `FlowStepApprovalController` tidak ada di source; keputusan final ditangani `KadesApprovalController`.*
| Pendukung | `SID-ARCH-BE-001_Backend_Architecture.md` | Pipeline dua tahap, aturan skip, role Kasi/Kaur, first-action-wins, password guard, audit, dan assignment service diselaraskan dengan TDD/kode. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/erd/01_ERD_Core_v7.puml` | Memperjelas `assigned_role` sebagai akses baca/unduh Kasi/Kaur, posisi flow aktif hanya RT/Kades (Sekdes bertindak pada step Kades), enum skema legacy, masa jabatan, UUID, penghitung nomor surat, serta nullable placeholder dan kolom `reason` log sesuai migration. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/erd/02_ERD_Pendukung_v7.puml` | Menyelaraskan shadow entity user/desa dan notification morph dengan tipe UUID aktual; mencatat tidak adanya fallback broadcast. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/sequence/01_Sequence_InputSurat_v5.puml` | Menunjukkan snapshot flow, resolve start-step dan applicant skip, placeholder approval/deadline, notifikasi approver awal, serta satu transaksi tanpa resolver berulang. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/sequence/02_Sequence_RegisterWarga_v5.puml` | Mengganti alur email menjadi register NIK + password, username otomatis, dan login berbasis username. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/sequence/03_Sequence_RTApproval_v5.puml` | Worklist RT berdasarkan step aktif; mencatat guard pemohon, keputusan dalam transaksi, next actionable dinamis, FYI RW tanpa fallback, serta tidak menganggap nomor step tetap. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/sequence/04_Sequence_NotifikasiRW_SideEffect_v5.puml` | Menghapus fallback broadcast Petugas Desa; FYI dilewati bila pejabat RW aktif tidak ditemukan dan tidak menghambat approval. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/sequence/05_Sequence_ProcessFlowStep_Generic_v5.puml` | Membatasi keputusan pada Kades/Sekdes; Kasi/Kaur hanya notifikasi dan baca/unduh; finalisasi pada step `is_final`, update `nextActionable`, self-approval, lock transaksi, dan notifikasi sesuai aktor berikutnya. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/01_UC_Warga_v5.puml` | Menyelaraskan submit lintas-role bagi akun aktif ber-citizen, start-step dinamis, pemohon self-approval, dan masa berlaku unduhan. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/02_UC_PetugasDesa_SuratWarga_v5.puml` | Menghapus klaim fallback broadcast; notifikasi hanya kepada approver aktif yang di-resolve. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/03_UC_PetugasDesa_WilayahJabatan_v5.puml` | Menandai level approval settings aktif RT/Kades; nilai legacy Sekdes/Kasi/Kaur tidak diekspos sebagai setting aktif. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/04_UC_PetugasDesa_KontenKonfigurasi_v5.puml` | Menetapkan `assigned_role` sebagai pengendali akses surat Kasi/Kaur, bukan approver flow. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/05_UC_KepalaDesa_SekretarisDesa_v5.puml` | Menegaskan first-action-wins sebagai keputusan v5.1 yang memakai row lock, finalisasi, self-approval guard, dan pengecualian surat sendiri. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/06_UC_RT_v5.puml` | Menjelaskan RT sebagai approver berdasarkan step aktif/wilayah, applicant skip, nextActionable, serta FYI RW tanpa fallback. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/07_UC_RW_v5.puml` | Menegaskan RW read-only FYI dan tidak ada fallback broadcast saat RW aktif tidak ditemukan. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/08_UC_Kadus_v5.puml` | Menegaskan Kadus jabatan struktural non-approval dan membatasi daftar surat ke scope `mine`. |
| Sinkronisasi diagram lanjutan | `docs/diagram/code/usecase/09_UC_KasiKaur_v5.puml` | Mengganti narasi approver final lama menjadi notifikasi/read-only; memperbarui payload dashboard dan menandai catatan v5.0 usang. |

## Verifikasi kontrak

- `php artisan route:list --json` dijalankan dari `apps/backend` (hanya membaca daftar route; tidak menjalankan migration atau seeder).
- Seluruh operasi yang dideklarasikan pada OpenAPI dibandingkan dengan route Laravel; tidak ada operasi dokumentasi tanpa route yang cocok. Pencocokan memperlakukan `GET|HEAD` Laravel sebagai `GET` pada OpenAPI.
- Route auth web dan API logout, profile/password, promote/demote/rotate, reset/toggle status user, `letters?scope=mine`, Kasi, dashboard, dan approval settings/flows tercakup dalam pencocokan.
- Kasi tercatat GET-only; kontrak `PATCH /kasi/letters/{letter}` dihapus. Operasi stale `POST /families/{id}/members` dan `GET /letter-types/{id}` juga dihapus karena tidak ada pada route-list; detail tipe surat memakai parameter `{letterType}` sesuai route update.
- Tindak lanjut sinkronisasi route: operasi penghapusan citizen/family/hamlet, update dan penghapusan RT/RW, verifikasi email, cookie CSRF, storage, health, serta root `/` ditambahkan ke OpenAPI. Path `GET /citizens/{citizen}` dan `GET /hamlets/{hamlet}` yang tidak memiliki route aktif dihapus; parameter family/hamlet/RT/RW diselaraskan dengan implicit route model binding.
- Seluruh operasi OpenAPI kini memiliki route Laravel yang cocok; seluruh route Laravel, termasuk root `/`, terwakili. `GET|HEAD` Laravel dipetakan ke `GET` OpenAPI.
- Seluruh 99 file YAML di `docs/api_spec/` berhasil diparse dengan PyYAML; tidak ada `$ref` eksternal yang target filenya hilang.

Tidak ada migration, seeder, test, atau commit yang dijalankan/dibuat. Validasi ini hanya mencakup parsing YAML, `$ref`, dan pencocokan path/method OpenAPI dengan route-list. Lihat `docs/docs-changed.md` untuk daftar file dokumentasi yang berubah.
> *Dikoreksi pada Batch 14: `docs/docs-changed.md` bukan daftar resmi; daftar path docs dipindahkan ke Bagian 3.8 laporan ini.*

## Sinkronisasi diagram ERD, sequence, dan use case v5.1

Pemeriksaan lanjutan menemukan beberapa diagram yang belum mengikuti perilaku aktif. Ketiga kelompok diagram kini telah diperbarui sesuai skema migration serta controller/service/route yang berjalan. Catatan historis yang masih menyebut Kasi/Kaur sebagai approver, step bernomor tetap, dan fallback broadcast telah dihapus atau ditandai sebagai historis yang digantikan.

Validasi source-to-diagram dilakukan dengan membaca route `apps/backend/routes/api.php`, service approval/surat, repository surat, enum approval, dan controller aktif. Tidak ada kode, migration, seeder, atau test yang diubah. PlantUML CLI tidak tersedia di environment; pemeriksaan struktural seluruh lima sequence memastikan satu pasangan `@startuml`/`@enduml` dan jumlah fragment berimbang (PASS), sedangkan `git diff --check` juga PASS.

### Catatan hasil audit

Catatan sebelumnya mengenai worklist dan keputusan Kades/Sekdes sudah usang: `KadesApprovalService` memeriksa status aktif setelah row lock, dan test service/controller mencakup surat rejected serta keputusan kedua. Flow baru hanya menerima posisi step `rt` dan `kepala_desa`; Sekdes bertindak sebagai pejabat pengganti di tahap `kepala_desa`. Database PostgreSQL yang dikonfigurasi saat ini memiliki 0 row `flow_steps` dengan posisi `sekdes`. Kolom enum DB dipertahankan tanpa migrasi; worklist dan guard keputusan hanya menerima step `kepala_desa`.

### Temuan kode setelah sinkronisasi

- Bug statistik surat RW dikonfirmasi: `queryByVillageAndRw()` sebelumnya memfilter `citizens.rw_id`, padahal RW didapat melalui relasi `citizen.rt.rw_id`. Query kini menggunakan relasi tersebut dan test endpoint RW ditambahkan.
- Komentar lama pada service Kades dan resolver pejabat diperbarui agar menjelaskan tahap `kepala_desa` yang dapat dijalankan Kades maupun Sekdes. `FlowStep` mempertahankan enum legacy DB; validasi aplikasi melarang pembuatan step `sekdes` baru.
- Scope multi-desa untuk surat Petugas Desa kini menggunakan desa pada jabatan aktif untuk daftar, akses lihat/unduh/hapus, dan pemilihan Kades penanda tangan PDF. Seeder approval settings juga membuat konfigurasi aktif per desa. Ini menutup jalur yang diperiksa dalam patch; belum menyatakan seluruh endpoint administratif sudah diaudit untuk isolasi multi-desa.
- Level aktif pada `approval_settings` hanya `rt` dan `kepala_desa`: repository dan seeder hanya menyediakan dua level tersebut, dan API memvalidasi melalui `ApprovalLevel::approverCases()`. Enum PHP serta enum database masih menyimpan nilai legacy `sekdes`, `kasi_pelayanan`, dan `kaur_tu_umum` untuk kompatibilitas skema; nilai itu bukan setting yang diekspos atau dibuat oleh flow aktif.

## Sinkronisasi tambahan terhadap source backend

- TDD-03 mencatat `village_id` pada `approval_flows` dan `letter_types`, serta keunikan kode jenis surat per desa (`UNIQUE(village_id, code)`). Service mengambil tenant dari akun Petugas yang login; lookup konfigurasi lintas desa menghasilkan 404. `village_id` adalah kolom scope internal dan tidak ikut dalam resource API flow/jenis surat.
- OpenAPI daftar tipe surat disesuaikan dengan implementasi: hanya tipe aktif bertemplate untuk desa akun yang login; query `active_only` dan `category_id` tidak didukung oleh endpoint ini.
- Middleware `account.active` ditambahkan pada deskripsi keamanan dan kontrak 403 dengan `code: account_inactive`; logout tetap bisa diakses untuk mengakhiri sesi.
- Dokumentasi `petugas:first` menegaskan ID RT harus berasal dari desa yang dipilih. Belum ada command/prosedur pemulihan darurat bawaan untuk kasus tidak ada Petugas yang dapat login; hal tersebut menjadi kebutuhan runbook operasional.
- Diagram activity/workflow admin dikoreksi agar final approval dilakukan Kades/Sekdes dan Kasi/Kaur hanya menerima notifikasi setelah final approve. Scheduler reminder/backup tidak dinyatakan aktif karena belum ada task terjadwal pada source.
- Klaim sebelumnya yang ternyata sudah sesuai dan tidak diubah: SYS-001 menyebut Staff Desa bukan approver; `bussines_workflow/01`, TDD-02 UC-22, frontend changelog, dan SETUP sudah memakai tahap RT/Kades serta setup `petugas:first`/`migrate:fresh --seed`.
- Scope di SYS-001, TDD-01, workflow admin, dan use case Petugas diperjelas sebagai akses di desa sendiri. ERD menambahkan `village_id` flow/jenis surat serta uniqueness jenis surat per desa. TDD-02 dan ERD juga dikoreksi soal row lock keputusan Kades/Sekdes dan level deadline aktif.

## Verifikasi sinkronisasi final terhadap source aktif (6 Okt 2026)

Bagian ini memperbarui catatan route/API sebelumnya. Route source aktif
`apps/backend/routes/api.php`, `LetterController`, `LetterService`,
`LetterPolicy`, `LetterRepository`, request, dan resource diperiksa langsung.
Perubahan source backend yang sudah ada di worktree diperlakukan sebagai acuan
dan tidak diubah. Hasil metode/path pada Bagian 3.7 adalah snapshot audit
sebelumnya; hasil verifikasi di bawah berlaku untuk source yang ada saat ini.

### Perbedaan yang diselaraskan

- Daftar dan detail seluruh role memakai `GET /letters` dan
  `GET /letters/{id}`. Tidak ada route GET khusus `/rt/letters`,
  `/rw/letters`, `/kades/letters`, atau `/kasi/letters`; kontrak OpenAPI dan
  delapan file path lama yang menyatakan sebaliknya dihapus/diperbarui.
- Scope daftar mengikuti implementasi: RT untuk seluruh surat warga di RT;
  RW untuk surat wilayah yang sudah disetujui RT; Kadus untuk surat dusun yang
  sudah disetujui RT; Kades/Sekdes untuk surat desa yang disetujui RT atau
  tercatat melewati tahap RT; Kasi/Kaur untuk surat approved sesuai
  `assigned_role`; Petugas Desa untuk surat di desa; `scope=mine` untuk
  surat yang diajukan user. Keputusan tetap melalui endpoint khusus RT dan
  Kades/Sekdes.
- Koleksi daftar tidak dipaginasi oleh `LetterService::getScopedLetters()`;
  parameter `page` dan metadata pagination yang tidak dihasilkan backend
  dihapus dari kontrak.
- `rw_fyi_notified` diselaraskan dengan `LetterResource`: nilainya menunjukkan
  adanya keputusan approve RT, bukan bukti keberhasilan pengiriman notifikasi.
- Schema dan oneOf dashboard diperbarui: source masih menyediakan dashboard
  Kadus read-only (`fyi_letters`) dan scope daftar/detail surat Kadus setelah
  RT approve. Catatan lama yang menyebut dashboard/daftar wilayah Kadus dihapus
  dikoreksi di TDD dan use-case.
- Class diagram dibersihkan dari `KasiLetterController`, `KasiLetterService`,
  `RwFyiController`, dan `RwFyiService` yang sudah tidak ada di source.
  Controller keputusan RT/Kades kini hanya memodelkan `decision()` dan
  bergantung pada service approval masing-masing. Daftar service arsitektur
  juga tidak lagi mencantumkan `RwFyiService`.
- Sequence RT dan Kades/Sekdes diarahkan ke endpoint bersama untuk baca daftar
  dan detail; endpoint keputusan tetap spesifik role.
- Changelog frontend memakai endpoint daftar/detail bersama. Dokumen patch
  historis diberi penanda agar tidak diperlakukan sebagai kontrak aktif.

### Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| Route aktif | `php artisan route:list --json` berhasil; 100 operasi route terdaftar cocok dengan 100 operasi OpenAPI (HEAD dinormalisasi sebagai GET, parameter path dinormalisasi). |
| Parse seluruh YAML dan resolusi `$ref` | PASS: 91 file YAML, 0 parse error, 0 file/fragmen `$ref` hilang. |
| Kecocokan metode/path OpenAPI dengan route aktif | PASS: 0 route-only dan 0 OpenAPI-only. |
| `git diff --check -- docs` | PASS: tidak ada whitespace error. |
| Struktur PlantUML | PASS terbatas untuk 4 `.puml` yang disentuh: pasangan `@startuml`/`@enduml` dan blok sequence seimbang. |
| PlantUML CLI/render gambar | Tidak dijalankan; `plantuml` tidak tersedia di PATH, sehingga preview PNG tidak di-render ulang. |
| Backend tests | Tidak dijalankan karena perubahan pada sesi ini hanya dokumentasi. |

Worktree juga menunjukkan 22 file preview diagram `.png` dan
`docs/diagram/code/erd/01_ERD_Core_v7_PATCH.md` berstatus deleted. File-file itu
tidak dihapus atau dipulihkan oleh sinkronisasi ini; render PlantUML tidak
tersedia untuk membangun ulang preview.

Tidak ada commit yang dibuat; perubahan dokumentasi dibiarkan di worktree.
