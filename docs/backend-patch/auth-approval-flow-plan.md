> **Catatan Batch 14:** Dokumen ini bersifat historis. Jika uraian implementasi berbeda dari source backend final, ikuti source dan `docs-sync-report.md` Bagian 3.

# Plan Patch: Akun, Jabatan, dan Alur Persetujuan Surat (Auth + Approval Flow)

**Basis:** source code `backend.zip` (Laravel 13, Sanctum SPA, PostgreSQL prod / SQLite test, UUID untuk users/citizens/letters) + keputusan final percakapan analisis.
**Dokumen pendamping:** `auth-approval-flow-analysist.md` (laporan ketua), `auth-approval-flow-patch-prompt.md` (prompt per batch).
**Revisi 2:** registrasi = **NIK + password saja**; username otomatis `namadepan.NNNN`; username dapat diganti di profil; tanpa faktor kedua tanggal lahir (risiko diterima).
**Aturan emas (Revisi 3):** proyek belum production → perubahan skema dilakukan dengan **mengedit migration lama** (tanpa migration tambahan dan tanpa migration data); hanya TABEL BARU yang dibuat sebagai file baru. Semua DB dev/staging wajib `migrate:fresh --seed`.

---

## 0. Keputusan Final (sumber kebenaran patch ini)

| ID | Keputusan |
|---|---|
| K1 | Satu orang = satu akun. Pejabat/petugas = warga yang dipromote |
| K2 | Login `username`+`password`. Register: hanya `nik`, `password`, `password_confirmation`. `users.name` diambil dari `citizens`. **Username dibuat otomatis** (`namadepan.NNNN`, lihat 1.4) dan ditampilkan setelah register. Username & email dapat diubah di profil; email opsional |
| K3 | Petugas pertama di-bootstrap melalui CLI dengan NIK. Command membuat citizen, akun, dan jabatan bila belum tersedia atau memakai citizen/akun warga yang sudah ada; username otomatis dan password sementara wajib diganti. Selanjutnya promote dilakukan petugas. Demote petugas hanya oleh petugas lain. Self-demote dilarang. Petugas terakhir tidak boleh turun (abort + pesan) |
| K4 | Promote/demote pejabat oleh petugas: `users.role` + `officials` berubah dalam satu `DB::transaction()` |
| K5 | `officials.term_ends_at` = informasi; demote manual; **tanpa scheduler**; widget dashboard petugas "jabatan lewat masa" + "berakhir ≤30 hari" |
| K6 | Pejabat boleh `POST /letters` untuk dirinya. Hanya **tahap milik sendiri** dilewati; **step final tidak pernah dilewati**; tidak boleh menyetujui surat sendiri |
| K7 | Flow default: `RT (step 1)` → `kepala_desa (step 2, is_final)` (Sekdes saling menggantikan). `letter_number` & `expires_at` di step final Kades/Sekdes. TTD/stempel PDF **selalu Kades**. `letter_approvals.approval_level`/`approved_by` = aktor sebenarnya |
| K8 | Kasi/Kaur bukan approver: notifikasi hanya saat final approve + unduh/cetak. Warga pemohon juga bisa unduh |
| K9 | Notif FYI RW hanya setelah RT approve (tidak ada FYI bila tahap RT dilewati) |
| K10 | Pemohon RW/Kadus/Petugas/Kasi/Kaur: tidak ada tahap dilewati |
| K11 | Demote pejabat non-petugas yang meninggalkan surat tanpa approver: **peringatan** (respons `warnings`), bukan blokir |
| K12 | Register murni NIK + password (**tanpa** faktor kedua; risiko diterima). Rate limit tetap. Pesan galat: `NIK tidak terdaftar sebagai warga Desa Cibenda` / `NIK sudah terdaftar, silakan login`. Warga boleh mengganti username di profil; petugas melihat username di daftar akun untuk membantu warga yang lupa |
| K13 | Kades mengajukan → Sekdes yang memutuskan (dan sebaliknya); jabatan Kades/Sekdes/Kasi/Kaur selalu terisi bersama |
| K14 | Pesan self-demote saat petugas tersisa 1: `Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.` Bila petugas ≥2: `Anda tidak dapat menurunkan diri sendiri. Minta petugas lain untuk menurunkan Anda.` |

### Asumsi teknis (default, menunggu persetujuan; ubah plan jika ditolak)

A1 pasang `spatie/laravel-activitylog` · A2 rename `KasiApproval*` → `KasiLetter*` · A3 nomor surat `NNN/KODE/TAHUN` berurut via tabel counter · A4 `must_change_password` + reset password sementara oleh petugas (bukan untuk petugas lain) · A5 kunci dashboard Kasi/Petugas berubah · A6 rute auth hanya di web · A7 dev/staging di-reset (`migrate:fresh --seed`) · A8 pemohon Kades/Sekdes tanpa pasangan aktif → submit ditolak 422 · A9 `assigned_role` NULL → Kasi **dan** Kaur · A10 Kasi/Kaur hanya melihat surat `approved` dan sesuai `assigned_role` · A11 petugas tidak reset password petugas lain via API · A12 `GET /letters?scope=mine` · A13 `PATCH /officials` tidak boleh ubah posisi/akun/aktif milik jabatan berakun · A14 `User::official()` menjadi relasi jabatan **aktif** (+ `officials()` untuk riwayat) · A15 username otomatis = kata pertama nama (tanpa gelar) + `.` + 4 angka acak, bentrok → acak ulang · A16 warga boleh mengganti username di profil · A17 respons register `201` memuat username (auto-login tetap) · A18 migration lama diedit (belum production), `add_username_to_users_table` digabung ke `create_users_table`, tanpa migration data · A19 semua DB dev/staging di-reset dengan `migrate:fresh --seed`.

---

## 1. Spesifikasi Desain

### 1.1 Skema data (edit migration lama; tabel baru = file baru)

| Migration | Aksi | Isi |
|---|---|---|
| `2026_07_10_074714_create_users_table` | **EDIT** | `username` NOT NULL unik (digabung dari `add_username_to_users_table`, file itu **dihapus**), `email` nullable unik, tambah `must_change_password` boolean default false |
| `2026_08_14_210700_add_username_to_users_table` | **HAPUS** | digabung ke create_users_table |
| `2026_07_10_074721_create_officials_table` | **EDIT** | `term_ends_at` date nullable setelah `ended_at`; index `(is_active, term_ends_at)` |
| `2026_10_02_090200_create_letter_number_counters_table` | **BARU** | `id`, `village_id` uuid FK, `letter_type_id` FK, `year` smallint, `last_number` unsigned int default 0, timestamps, UNIQUE `(village_id, letter_type_id, year)` |
| Migration paket activitylog (publish) | **EDIT hasil publish** | `subject_id` & `causer_id` jadi `string(36)` nullable (users/citizens/letters UUID, officials bigint). Jangan pakai `nullableMorphs` bawaan |

Tidak ada migration data. Flow default 2 tahap, pembersihan `approval_settings` Kasi/Kaur, username seed, dan Sekdes ditangani **seeder** (B4) karena DB di-reset. Tidak ada perubahan enum DB (`flow_steps.approver_position`, `letter_approvals.approval_level`, `approval_settings.approval_level` tetap 5 nilai; pembatasan di lapisan aplikasi).

### 1.2 Enum & helper baru

- `App\Enums\OfficialPosition` (14 nilai) dengan: `userRole(): ?UserRole` (kepala_desa→KepalaDesa, rt→Rt, rw→Rw, kadus→Kadus, kasi_pelayanan→KasiPelayanan, kaur_tu_umum→KaurTuUmum, petugas_desa→PetugasDesa, sekdes→SekretarisDesa, selain itu null), `hasAccount(): bool`, `scopeColumn(): ?string` (rt→`rt_id`, rw→`rw_id`, kadus→`hamlet_id`, lain null), `isSingleHolderPerScope(): bool` (false hanya `petugas_desa`), `static accountPositions(): array`.
- `ApprovalLevel`: tambah `static approverCases()` → RT, KEPALA_DESA, SEKDES (nilai Kasi/Kaur dipertahankan untuk membaca data historis).

### 1.3 Kontrak API (target)

| Endpoint | Perubahan |
|---|---|
| `POST /login` | body `username`,`password`. Username dinormalisasi lowercase. Akun `is_active=false` → 403 `Akun tidak aktif, hubungi administrator`. Respons `{message, user: UserResource}` (`role`, `official` aktif, `must_change_password`) |
| `POST /register` | body hanya `nik`(digits:16), `password`+`password_confirmation`. Throttle `register`. Galat: NIK tak ditemukan/nonaktif → `NIK tidak terdaftar sebagai warga Desa Cibenda`; sudah punya akun → `NIK sudah terdaftar, silakan login`. Username digenerate `UsernameGenerator`. Respons **201** `{message, data:{username, name}}` + auto-login |
| `PATCH /profile` | `username` (sometimes, `^[a-z0-9_.]{4,30}$`, unik abaikan diri sendiri, dinormalisasi lowercase) dan/atau `email` (nullable/email/unik abaikan diri sendiri). Ubah email → `email_verified_at=null` |
| `PUT /profile/password` | `current_password`, `password`+confirmation. Set `must_change_password=false` |
| `POST /officials/promote` | petugas only. `user_id`, `position` (account positions), `rt_id`/`rw_id`/`hamlet_id` wajib sesuai posisi, `started_at`, `term_ends_at?`, `phone_wa?`, `notes?` → 201 `OfficialResource` |
| `POST /officials/{official}/demote` | petugas only. `notes?` → 200 `{message, data, warnings[]}` |
| `POST /officials/{official}/rotate` | petugas only. body `user_id` (akun warga baru), `started_at`, `term_ends_at?`, `notes?` (tanpa `citizen_id`; diturunkan dari akun). Tidak berlaku untuk `petugas_desa` |
| `POST /users` | **dihapus** |
| `PATCH /users/{user}` | hanya `name?`, `is_active?` (tanpa email) |
| `GET /users` | tetap; `UserResource` WAJIB memuat `username` agar petugas dapat membantu warga yang lupa username |
| `PATCH /users/{user}/toggle-status` | guard sama dengan update (tidak boleh diri sendiri / petugas terakhir) |
| `POST /users/{user}/reset-password` | petugas only; target bukan petugas & bukan diri sendiri; menghasilkan password sementara acak 12 karakter, `must_change_password=true`, respons memuat `temporary_password` sekali |
| `POST /letters` | semua akun aktif dengan `citizen_id` (bukan lagi hanya `warga`) |
| `GET /letters?scope=mine` | semua role: surat dengan `submitted_by = user` |
| `GET /kasi/letters`, `GET /kasi/letters/{letter}` | read-only; surat `approved` sesuai `assigned_role` (NULL → keduanya) di desa yang sama. `PATCH /kasi/letters/{letter}` **dihapus** |
| `GET /letters/{letter}/download` | `LetterPolicy::download`: pemohon, petugas/kades/sekdes se-desa, Kasi/Kaur sesuai `assigned_role`; syarat `approved`. Cek `expires_at` untuk pemohon (siapa pun role-nya) |
| `GET /dashboard` | Kasi: `{role, total_surat_selesai, completed_letters[], unread_notifications_count}`; Petugas: tambah `jabatan_lewat_masa[]`, `jabatan_segera_berakhir[]`; Kades/Sekdes: tanpa surat milik sendiri |

Middleware baru `password.changed` (alias): bila `must_change_password=true`, semua rute terproteksi selain `GET /user`, `PUT /profile/password`, `POST /logout` → 403 `{message, code:"password_change_required"}`.

### 1.4 Aturan inti alur surat

**Penentuan step** — `App\Services\LetterFlowService`:
- `approversFor(FlowStep, Letter)`: `OfficialService::resolveOfficialsForStep`.
- `isApplicantOfficial(Letter, Official)`: `official.user_id == letter.submitted_by` ATAU (`letter.citizen_id` & `official.citizen_id` sama).
- `eligibleApprovers`: raw dikurangi pemohon.
- Aturan skip (untuk step **non-final**): skip **hanya jika** raw tidak kosong **dan** eligible kosong. Raw kosong (jabatan vakum) → TIDAK skip.
- Step **final**: eligible kosong → `abort(422, 'Surat tidak dapat diproses: tidak ada pejabat berwenang pada tahap final.')`.
- `resolveStartStep(Letter)` & `nextActionable(Letter, int $afterOrder)` mengembalikan `{step, skipped[]}`. `logSkipped()` menulis `letter_status_logs` (`old_status`=`new_status`=status saat itu, `reason`: `Tahap {RT|Kepala Desa/Sekretaris Desa} dilewati: pemohon adalah pejabat pada tahap tersebut`, `actor_id` = pemohon/aktor yang memicu).

**Nomor surat** — `App\Services\LetterNumberGenerator::next(Letter): string` dalam transaksi pemanggil: ambil/buat baris counter `(village, letter_type, year)` dengan `lockForUpdate`, naikkan, format `sprintf('%03d/%s/%d', n, strtoupper(type.code), year)`.

**Finalisasi (Kades/Sekdes, step `is_final`)**: `status=approved`, `letter_number`, `expires_at` (jika `validity_days`), `processed_at`; `current_step_order` TIDAK dinaikkan; log status; notif pemohon (`letter_approved_final`) + Kasi/Kaur (`letter_ready_for_print`) sesuai `assigned_role`.

**Guard self-approval** di RT/Kades service: jika `submitted_by == user.id` atau citizen sama → `abort(403, 'Anda tidak dapat memutuskan surat milik Anda sendiri.')`. Daftar pending Kades/Dashboard Kades mengecualikan surat milik sendiri.

**Promote guard** (`OfficialAssignmentService::promote`): actor petugas; target user ada, `is_active`, `role=='warga'`, `citizen_id` terisi, `village_id` sama dengan actor, tidak punya official aktif; posisi ∈ account positions; wilayah sesuai posisi terisi & valid; `guardSinglePositionPerScope` (kecuali `petugas_desa`). Transaksi: buat official (`user_id`, `citizen_id` dari akun, `village_id`), `users.role = position.userRole()`, activity log `official.promoted`.

**Demote guard**: actor petugas; target official aktif ber-`user_id`. Bila posisi `petugas_desa`: pesan K14 untuk self; jumlah petugas aktif ≤1 → 409 (pesan K3). Transaksi: official `is_active=false`, `ended_at=today`; `users.role='warga'`; activity log `official.demoted`. `warnings`: hitung surat aktif yang tidak lagi punya approver (RT: surat di step `rt` untuk `rt_id` itu; Kades/Sekdes: bila tidak ada Kades/Sekdes aktif lain di desa).

**Rotate**: demote lama + promote baru (posisi & wilayah sama) dalam satu transaksi; menolak `petugas_desa`.

**Larangan di jalur lama**: `OfficialService::create` dengan posisi berakun + `user_id` → 422 (`Gunakan endpoint promote`). `OfficialService::update` pada official ber-`user_id` menolak perubahan `position`, `user_id`, `citizen_id`, `is_active`, `ended_at` (422, gunakan demote/rotate). `delete` pada official aktif ber-`user_id` → 409.

**Perintah konsol**: `petugas:first --nik=...` mencari citizen berdasarkan hash NIK; bila belum ada, command meminta data citizen wajib beserta desa dan RT, lalu membuat citizen, akun, dan official Petugas Desa dalam satu transaksi. Citizen yang sudah ada tanpa akun akan diberi akun; akun warga yang terhubung akan dipromosikan. Username dibuat otomatis; password sementara acak dicetak sekali dan `must_change_password` diaktifkan. Command menolak bila Petugas Desa aktif sudah ada. Demote dan reset password dilakukan melalui dashboard/API.

**Pembuatan username otomatis** — `App\Services\Auth\UsernameGenerator::generate(string $fullName): string`:
1. Normalisasi: `Str::ascii`, lowercase, titik/koma → spasi, pecah per kata.
2. Buang gelar di AWAL secara berulang (dibandingkan tanpa titik): `h, hj, haji, hajjah, dr, drg, drh, drs, dra, ir, prof, kh, ust, ustadz, ustadzah`.
3. Ambil **kata pertama** yang tersisa; sisakan hanya `[a-z0-9]`; potong maks 20 karakter; kosong → `warga`.
4. Kandidat `"{kata}.{angka 4 digit 1000–9999}"`; cek `UserRepository::usernameExists`; ulangi hingga 10 kali; lalu 5 digit (10000–99999) hingga 10 kali; masih gagal → `RuntimeException`.
5. Pembangkit angka dibungkus method `protected randomNumber(int $digits): int` agar bisa dikontrol di test.
6. Contoh: `Supratman` → `supratman.1274`; `Siti Aminah` → `siti.2518`; `H. Ahmad Fauzi` → `ahmad.NNNN`. Dua warga berawalan `Siti` mendapat username berbeda karena angka acak + pengecekan keunikan.
7. Kolom `unique` DB tetap pengaman akhir: `AuthService` menangkap pelanggaran unik username (balapan) dan mengulang maks 3×.
Panjang maksimum hasil = 20 + 1 + 5 = 26 ≤ 30 (lolos regex username profil).

**Hashing**: `HASH_DRIVER=argon2id` di `.env.example`; `config:publish hashing`; `phpunit.xml` set `HASH_DRIVER=bcrypt` + `BCRYPT_ROUNDS=4` agar test cepat; satu test memverifikasi `Hash::driver('argon2id')`.

---

## 2. Inventaris Efek Domino per Lapisan

### 2.1 Config / infrastruktur

| File | Perubahan |
|---|---|
| `composer.json` | `spatie/laravel-activitylog` |
| `config/hashing.php` (publish), `.env.example`, `phpunit.xml` | Argon2id; override test |
| `config/activitylog.php`, migration activitylog | publish + edit kolom ke string |
| `app/Providers/AppServiceProvider.php` | `RateLimiter::for('register', ...)` (5/menit per IP; 10/jam per hash NIK) |
| `bootstrap/app.php` | alias middleware `password.changed` |
| `routes/api.php`, `routes/web.php`, `routes/auth.php` | hapus `require auth.php` dari `api.php`; perbaiki `/logout` di `auth.php` → `logout`; hapus duplikat `POST /api/logout` hanya bila dipastikan tidak dipakai (cek test); tambah rute baru; hapus rute PATCH kasi & POST users; grup officials dibatasi `role:petugas_desa` |

### 2.2 Migration / Model / Enum

| File | Perubahan |
|---|---|
| Edit `create_users_table` & `create_officials_table`, hapus `add_username_to_users_table`, 1 migration baru `letter_number_counters` (1.1) | lihat 1.1 |
| `Models/User.php` | hapus `#[Fillable]` duplikat (pakai `$fillable` saja) + tambah `must_change_password`; casts `is_active`,`must_change_password` boolean; mutator `username` lowercase+trim; `official()` → relasi aktif; `officials()` riwayat |
| `Models/Official.php` | fillable & cast `term_ends_at`; scope `active()`, `termExpired()`, `termEndingWithin($days)` |
| `Models/LetterNumberCounter.php` (baru) | fillable, relasi |
| `Models/Letter.php` | helper `isOwnedBy(User)` |
| `Enums/OfficialPosition.php` (baru), `Enums/ApprovalLevel.php` | lihat 1.2 |
| `Http/Resources/UserResource.php` | pastikan `username` ada; tambah `must_change_password`; `official` hanya aktif |
| `Http/Resources/OfficialResource.php` | `term_ends_at` |
| `Notifications/LetterStatusNotification.php` | ikon/warna untuk `letter_approved_final`, `letter_ready_for_print`; pertahankan `kasi_approved` (legacy) |

### 2.3 Factory

| File | Perubahan |
|---|---|
| `UserFactory` | `username` unik lowercase; `must_change_password=false`; state `withoutEmail()`, `role(string)`, `inactive()`, `mustChangePassword()`. **Tetap kompatibel** untuk 281 pemakaian di 56 file test |
| `OfficialFactory` | `term_ends_at=null`; state `forUser(User)` (set `user_id`,`citizen_id`,`village_id` konsisten), `position(string)`, `inactive()`, `expiredTerm()` |
| `FlowStepFactory`, `ApprovalFlowFactory`, `LetterTypeFactory` | `LetterTypeFactory`: default `assigned_role` tetap; tidak ada perubahan wajib. Tambah helper flow `twoStep()` bila perlu |
| `LetterNumberCounterFactory` (baru) | opsional |

### 2.4 Seeder

| File | Perubahan |
|---|---|
| `ApprovalFlowSeeder` | flow `RT-Kades/Sekdes (2 Tahap)` (step 2 final); deskripsi diperbarui; `backfill...` tetap |
| `LetterTypeSeeder` | cari flow dengan nama baru |
| `ApprovalSettingSeeder` | hanya RT, KEPALA_DESA, SEKDES |
| `WilayahSeeder` | username konsisten snake_case tanpa spasi (mis. `kades_rusliana`); tambah **Sekretaris Desa** (citizen + user `sekretaris_desa` + official `sekdes`); isi email opsional; `term_ends_at` null |
| `AdminSeeder` | **hapus**; `DatabaseSeeder` hapus pemanggilan |
| `FlowStepSeeder` | tetap kosong (abaikan) |

### 2.5 Repository

| Repository | Perubahan |
|---|---|
| `UserRepository` | `findByUsername`, `usernameExists`; `countActiveByRole` tetap; `findWithFullProfile` memuat `official` aktif |
| `OfficialRepository` | `findActiveByUserId`, `existsActiveForUser`, `countActiveByPositionAndVillage`, `allTermExpiredActive($villageId)`, `allTermEndingWithin($villageId,$days)`, `findActiveByCitizenId`; ubah `findActiveVillageHeadWithCitizenOrFail` tidak perlu |
| `LetterRepository` | **hapus** `queryPendingAtFinalStepPosition`; tambah `queryApprovedForAssignedRole(?string,string)`, `countActiveAtStep(array $positions,string $villageId,?int $rtId)`; `queryPendingAtFlowStepPositions` & `findByFlowStepAndStatus` menerima opsi `excludeSubmittedBy` |
| `ApprovalSettingRepository` | `allForVillage` hanya level approver (rt, kepala_desa, sekdes) |
| `LetterNumberCounterRepository` (baru) | `lockOrCreate(...)` |

### 2.6 Service

| Service | Perubahan |
|---|---|
| `Auth/AuthService` | `registerWarga(nik, password)`: cari citizen via `nik_hash`; tolak bila tak ditemukan/nonaktif/sudah punya akun; username dari `UsernameGenerator`; `name` dari citizen; tanpa email; tangkap bentrok unik username (ulang maks 3×) |
| `Auth/UsernameGenerator` (baru) | lihat 1.4 |
| `ProfileService` (baru) | ubah username/email, ganti password |
| `UserService` | hapus `create`; guard di `toggleActive`; `update` tanpa email; tambah `resetPassword`; profil & ganti password ditangani `ProfileService` |
| `OfficialService` | `create/update/delete` guard baru; `rotate` dipindah ke assignment service; hapus `syncSekdesRole`; hapus `resolveVillageMonitoringOfficials`; tambah `resolveKasiKaurForLetter(Letter)` |
| `OfficialAssignmentService` (baru) | promote/demote/rotate/impact warnings/bootstrap petugas/force demote |
| `LetterFlowService` (baru), `LetterNumberGenerator` (baru) | lihat 1.4 |
| `LetterService` | `createLetter` (izin pejabat, guard citizen null, start step via flow service, log skip, notifikasi eligible), `getScopedLetters` (`scope=mine`, scope Kades exclude own, scope Kasi approved+assigned) |
| `RtApprovalService` | next step via `nextActionable`; guard self-approval; FYI RW tetap hanya saat RT approve |
| `KadesApprovalService` | finalisasi (nomor, expires, tanpa increment), non-final via flow service, guard self-approval, notifikasi baru |
| `KasiApprovalService` → `KasiLetterService` | read-only (`getCompletedLetters`, `getLetterDetail`) |
| `DashboardService` | `forKasiKaur` baru, `forKadesSekdes` exclude own, `forPetugasDesa` tambah pengingat jabatan, `stageLabel` hapus Kasi/Kaur |
| `PdfService` | cek expiry berlaku untuk pemohon (bukan hanya role warga); TTD tetap Kades |
| `ApprovalSettingService` | tidak lagi dipanggil untuk level kasi/kaur |
| `ApprovalFlowService` | tidak berubah; validasi di Request |

### 2.7 Controller / Request / Policy / Middleware

| File | Perubahan |
|---|---|
| `Auth/AuthenticatedSessionController` | respons `UserResource` |
| `Auth/RegisteredUserController` | tidak berubah signifikan |
| `Requests/Auth/LoginRequest` | normalisasi username, cek `is_active` |
| `Requests/Auth/RegisterUserRequest` | hanya `nik` (digits:16) dan `password` (confirmed, `Password::defaults()`) |
| `Api/UserController`, `StoreUserRequest` (hapus), `UpdateUserRequest`, route | lihat 1.3 |
| `Api/OfficialController`, `StoreOfficialRequest`, `UpdateOfficialRequest`, `RotateOfficialRequest` | + `PromoteOfficialRequest`, `DemoteOfficialRequest` baru |
| `Api/ProfileController`, `UpdateProfileRequest` (username/email), `UpdatePasswordRequest` | baru |
| `Api/KasiApprovalController` → `KasiLetterController`; `KasiDecisionRequest` (hapus) | read-only |
| `Api/KadesApprovalController`, `KadesDecisionRequest` | tanpa perubahan kontrak |
| `Requests/LetterIndexRequest` | `scope` in:mine |
| `Requests/ReplaceApprovalFlowStepsRequest` | posisi valid: rt, kepala_desa, sekdes; step final harus step terakhir & `kepala_desa`/`sekdes` |
| `Policies/LetterPolicy` | owner selalu boleh `view`; Kasi/Kaur hanya `approved`+assigned_role; `create` = akun aktif ber-citizen; tambah `download` |
| `Policies/OfficialPolicy` | `MANAGER_ROLES` = `petugas_desa` saja |
| `Middleware/EnsurePasswordIsChanged` (baru) | lihat 1.3 |
| `Console/Commands/*` (3 baru) | lihat 1.4 |

### 2.8 Inventaris test

Legenda: **R** tulis ulang · **U** ubah · **N** baru · **C** cek/run saja · **D** hapus.

| File test | Aksi | Batch | Catatan |
|---|---|---|---|
| Unit/LettersMigrationTest | U | B2 | tambah cek kolom/tabel baru; `kasi_approved` legacy tetap |
| Unit/LetterTypeCategoryFlowColumnsTest | U | B4 | nama flow baru |
| Unit/ApprovalFlowRepositoryTest, FlowStepModelTest | U | B4/B10 | nama flow & posisi |
| Unit/LetterRepositoryTest | U | B5 | hapus tes final-step, tambah assigned-role, exclude-own |
| Unit/OfficialRepositoryTest | U | B5 | method baru |
| Unit/UserRepositoryTest | U | B5 | method baru |
| Unit/AuthServiceTest, Feature/RegisteredUserControllerTest | R | B6 | register NIK+password, username otomatis, respons 201 |
| Unit/UsernameGeneratorTest | N | B6 | gelar, satu kata, nama depan kembar, bentrok, 5 digit |
| Feature/Auth/LoginTest | N | B6 | username, inactive, rate limit, resource |
| Feature/ProfileControllerTest, Feature/Middleware/PasswordChangeMiddlewareTest | N | B6 | termasuk ganti username (unik, format) |
| Feature/Auth/PasswordResetTest, EmailVerificationTest, Feature/CurrentUserControllerTest | U | B6 | factory & resource |
| Unit/OfficialPositionEnumTest | N | B3 | |
| Unit/OfficialAssignmentServiceTest, Feature/OfficialPromoteDemoteTest, Feature/Console/PetugasCommandsTest | N | B7 | |
| Unit/OfficialServiceTest, Feature/OfficialControllerTest, Unit/OfficialPolicyTest | R/U | B7 | rotate baru, guard, policy |
| Unit/UserServiceTest, Feature/UserControllerTest | R | B7 | tanpa create, reset password, toggle guard |
| Unit/LetterFlowServiceTest, Unit/LetterNumberGeneratorTest | N | B8 | |
| Unit/LetterServiceTest, Feature/LetterControllerTest, Unit/LetterPolicyTest | U | B8 | pejabat mengajukan, scope mine |
| Unit/RtApprovalServiceTest, Feature/RtApprovalControllerTest | U | B9 | |
| Unit/KadesApprovalServiceTest, Feature/KadesApprovalControllerTest | U | B9 | final + nomor + self-approval |
| Unit/KasiApprovalServiceTest → KasiLetterServiceTest, Feature/KasiApprovalControllerTest → KasiLetterControllerTest | R | B9 | |
| Unit/PdfServiceTest, Feature/LetterDownloadControllerTest | U | B10 | |
| Unit/DashboardServiceTest, Feature/DashboardControllerTest | U | B10 | |
| Feature/ApprovalFlowStepsEndpointTest, Unit/ApprovalFlowServiceTest | U | B10 | |
| Unit/ApprovalSettingServiceTest, ApprovalSettingModelTest, Feature/ApprovalSettingEndpointTest | U | B10 | |
| Feature/Middleware/RoleMiddlewareTest, Unit/Http/Middleware/EnsureUserHasRoleTest | U | B11 | "non-warga tidak boleh submit" dan rute Kasi |
| 25+ Feature test lain (Citizen*, Family*, Region*, News*, Regulation*, VillageOrg*, LetterType*, LetterCategory*, PublicPage*, NotificationController*, RwFyi*, LetterStatusTest, dll.) | C | B11 | hanya lewat factory baru |

---

## 3. Urutan dan Ketergantungan Batch

```
B0 ─► B1 ─► B2 ─► B3 ─► B4 ─► B5 ─┬─► B6 ─┐
                                  ├─► B7 ─┤
                                  └─► B8 ─┴─► B9 ─► B10 ─► B11 ─► B12 ─► B13
```
B6, B7, B8 boleh paralel setelah B5 (beda domain), tetapi B9 membutuhkan B7+B8.

| Batch | Gerbang lulus |
|---|---|
| B0 | Laporan baseline (jumlah lulus/gagal) tersimpan |
| B1 | `composer install` ok, `php artisan route:list` tanpa duplikat auth |
| B2 | `migrate:fresh` (SQLite) ok; test migrasi hijau |
| B3 | test enum/model hijau |
| B4 | `migrate:fresh --seed` ok; seluruh test yang memakai factory masih bisa boot |
| B5 | test repository hijau |
| B6–B10 | test domain masing-masing hijau; daftar test merah sementara terdokumentasi |
| B11 | **seluruh suite hijau**, Pint bersih |
| B12 | dokumen & changelog FE selesai |
| B13 | smoke test manual + pencarian sisa referensi kosong |

---

## 4. Daftar Breaking Change untuk Frontend

1. Login: field `username` (bukan email); respons `user` memuat `role`, `official`, `must_change_password`.
2. Register: hanya `nik`, `password`, `password_confirmation` (tanpa `name`/`email`/`username`). Respons `201` `{message, data:{username, name}}` — **tampilkan username kepada warga** (mis. "Username Anda: aminah.2518, simpan baik-baik").
3. Layar wajib ganti password bila `must_change_password=true` (kode galat `password_change_required`).
4. Pembuatan pejabat: `POST /users` dihapus → `POST /officials/promote`; rotasi/penurunan: `/officials/{id}/rotate|demote`.
5. Kasi/Kaur: tombol setujui/tolak dihapus; daftar = surat selesai; `PATCH /kasi/letters/{id}` hilang.
6. Dashboard Kasi (`total_surat_selesai`, `completed_letters`), Petugas (`jabatan_lewat_masa`, `jabatan_segera_berakhir`).
7. Pejabat dapat mengajukan surat; daftar milik sendiri `GET /letters?scope=mine`.
8. Respons `current_step` bisa mulai dari step 2 (pemohon RT).
9. `approval-settings` tidak lagi memuat level Kasi/Kaur.
10. Profil: `PATCH /profile` (dapat mengubah `username` dan/atau `email`), `PUT /profile/password`.

---

## 5. Daftar Risiko Teknis

| Risiko | Mitigasi |
|---|---|
| Mengedit migration lama → DB lokal/staging yang sudah termigrasi tidak sinkron | Wajib `migrate:fresh --seed` (A7, A18); catat di laporan B2 dan changelog |
| Argon2id vs hash bcrypt lama | Reset data dev (A7); bila harus mempertahankan: set sementara `HASH_VERIFY=false` |
| Activitylog tipe ID | Edit migration paket ke `string` (lihat 1.1) |
| `User::official()` berubah semantik (aktif saja) | Cari semua pemakai `->official`/`official()`; test relasi |
| 281 pemakaian `User::factory()` | Perubahan factory hanya aditif |
| Rute auth dobel dipakai konsumen lain | Cek test & FE sebelum menghapus `/api/login`; lapor jika ada |
| Rate limiter menggagalkan test beruntun | Limiter memakai cache array; reset per test; tes register tidak melebihi 5 request |
| Registrasi hanya NIK + password | Risiko diterima (keputusan bisnis): pendaftaran atas nama orang lain. Mitigasi: rate limit per IP & per NIK, akun baru hanya `warga`, petugas dapat reset password/nonaktifkan akun non-petugas, SOP verifikasi tatap muka sebelum promote |
| Nomor surat unik global lintas desa | Dicatat (single-village saat ini); tidak diselesaikan di patch ini |

---

## 6. Rollout

1. Merge per batch pada cabang `feature/auth-approval-flow`; commit per batch.
2. Dev/staging: `php artisan migrate:fresh --seed`.
3. Karena belum production tidak ada migrasi data. Bila ternyata staging memuat data yang harus dipertahankan, BERHENTI dan putuskan ulang (opsi: kembali ke migration tambahan + migration data konversi flow).
4. Produksi pertama kali: `php artisan migrate`, lalu jalankan `php artisan petugas:first --nik=...` dengan data citizen, UUID desa, dan ID RT bila citizen belum ada. Catat username dan password sementara dari output; akun wajib mengganti password saat login pertama.
5. Koordinasi FE sebelum deploy (Bagian 4).
# Catatan status dokumentasi

Dokumen ini adalah rencana patch historis. Kontrak aktif setelah implementasi
menggunakan `GET /letters` dan `GET /letters/{id}` untuk daftar/detail semua
role; endpoint GET khusus `/kasi/letters` dan role lain tidak tersedia.
Rincian implementasi aktif tercatat di `../api_spec/openapi.yaml`.
