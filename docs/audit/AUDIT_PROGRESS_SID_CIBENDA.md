# 🔍 Laporan Audit Progress — SIDUTama Cibenda
## Terhadap TDD v4.2 (basis progress berjalan), TDD v5.0 (referensi baru), dan Dokumen Arsitektur (SID-ARCH-SYS-001/BE-001/FE-001)

**Status proyek:** Development di-stop sementara. Progress yang sudah dikerjakan menganut TDD v4.2. TDD v5.0 adalah revisi yang muncul setelah demo, dan **belum ada satu baris kode pun yang mengadopsinya**. Nama aplikasi resmi kini **SIDUTama Cibenda** (kode proyek tetap SID) sesuai `SID-ARCH-SYS-001`.

**Cakupan kode yang diaudit:** Backend Laravel API murni (Controllers, Services, Models, Migrations, Routes, Enums, Seeders, Notifications). Tidak ada kode frontend React yang disertakan dalam audit ini.

**Dokumen acuan tambahan pada revisi ini:** `SID-ARCH-SYS-001` v1.1, `SID-ARCH-BE-001` v1.2, `SID-ARCH-FE-001` v1.1 — dokumen arsitektur ini **tidak mengubah skema TDD v5.0**, melainkan menegaskan/mengunci sejumlah keputusan struktural yang sebelumnya masih terbuka, sekaligus mencatat wacana fitur baru yang **eksplisit belum berdesain**.

---

## 1. Progress Saat Ini — Sampai Mana

Backend sudah mengimplementasikan kerangka dasar sistem dengan cakupan sebagai berikut:

- Struktur wilayah dasar (`villages → hamlets → rws → rts`) — model, migration, dan seeder sudah ada dan berjalan (1 desa, 5 dusun, masing-masing 2 RW, masing-masing RW 2 RT)
- Autentikasi lengkap via Sanctum cookie-based (login, register, forgot/reset password, email verification)
- Model inti: `User`, `Citizen`, `Official`, `Letter`, `LetterApproval`, `LetterStatusLog`, `LetterType`
- Alur approval surat **4 tahap penuh berjalan secara fungsional**: RT → RW → Kadus → Kasi/Kaur (masing-masing punya Controller + Service terpisah)
- Sistem notifikasi in-app (`LetterStatusNotification`, tabel `notifications`) terpasang di setiap titik keputusan approval
- PDF generation on-demand (`barryvdh/laravel-dompdf`) dengan **10 template surat sudah di-seed** (A01–A10), lengkap dengan kop desa, blok TTD, dan placeholder data pemohon
- Dashboard statistik dasar: gender stats dan grafik surat mingguan per hari (Senin–Minggu)

**Kesimpulan posisi:** Progress ini setara dengan **pertengahan TDD v4.0/v4.1** — sudah mengadopsi sembilan-role ENUM dan struktur `officials` berbasis FK wilayah (`rt_id`/`rw_id`/`hamlet_id`, bukan `territory_label`), tapi banyak fitur administratif dari v4.2 (UC-18 s/d UC-24) belum tersentuh sama sekali.

**Kesesuaian terhadap pola arsitektur (`SID-ARCH-BE-001` S2):** Layer `Controller → Form Request → Service → Repository → Eloquent Model → DB` yang ditetapkan sebagai final di dokumen arsitektur **belum sepenuhnya terwujud di kode**. Lihat §1a di bawah.

### 1a. Gap Arsitektural (bukan gap fitur, tapi gap pola/struktur kode)

Dokumen `SID-ARCH-BE-001` menetapkan Repository sebagai layer wajib dengan alasan eksplisit: query yang sama dipakai lintas Service (contoh yang disebutkan langsung di dokumen: `findByFlowStepAndStatus` dipakai dashboard, notifikasi, dan reminder scheduler). Dibandingkan dengan kode yang ada:

| Layer wajib menurut arsitektur | Status di kode |
|---|---|
| Controller (HTTP concern murni) | ✅ Sesuai — Controller di kode sudah tipis, tidak berisi query |
| Form Request (validasi input murni) | ✅ Ada (`StoreLetterRequest`, `RtDecisionRequest`, dll), meski cakupannya belum lengkap untuk semua endpoint |
| Service (business rule, orkestrasi, `DB::transaction()`) | ✅ Ada dan dipakai konsisten |
| **Repository** (query Eloquent terpusat) | ❌ **Tidak ada sama sekali.** Seluruh Service (`RtApprovalService`, `RwApprovalService`, `KasiApprovalService`, `LetterService`, `OfficialService`) memanggil Eloquent Model langsung (`Letter::query()`, `Official::where(...)`, dst) |
| Policy (otorisasi per resource) | ❌ Tidak ada file `app/Policies/` sama sekali — otorisasi saat ini inline di dalam Service (contoh: cek `$letter->citizen->rt_id != $official->rt_id` langsung di `RtApprovalService::decision()`) |

**Implikasi:** Ini bukan bug fungsional (sistem tetap jalan), tapi **penyimpangan pola arsitektur yang sudah ditetapkan final**. Kalau tidak dibereskan sebelum migrasi v5.0, query yang sama (misal "cari surat di step X untuk posisi Y") berisiko ditulis ulang berkali-kali di berbagai Service baru yang akan dibuat untuk Kades/Sekdes/Staff — persis skenario yang menjadi alasan Repository diwajibkan.

**Middleware RBAC kustom** (`SID-ARCH-BE-001` S4.3) yang disebut sebagai keharusan untuk gate ganda (role check + context check) **juga belum ada** — otorisasi context (misal "apakah RT ini berwenang atas surat ini") saat ini inline per Service, bukan lewat Policy terpusat yang bisa diaudit di satu tempat sesuai yang diamanatkan dokumen.

---

## 2. Fitur Sudah Dikerjakan vs Belum (terhadap 22 UC MVP di TDD v4.2)

### ✅ Sudah Dikerjakan

| UC | Nama | Status Kode | Catatan |
|---|---|---|---|
| UC-01/02 | Login / Logout | ✅ Berjalan | Ada duplikasi pendaftaran route `/login` di `routes/api.php` dan `routes/auth.php` |
| UC-03 | Input Permohonan Surat | ✅ Berjalan | `LetterService::createLetter()`, data diambil dari `auth()->user()->citizen` |
| UC-04a | RT Approval | ✅ Berjalan | `RtApprovalService` |
| UC-04b | RW Approval | ✅ Berjalan | `RwApprovalService` |
| UC-04c | Kadus Approval | ✅ Berjalan | `KadusApprovalService` |
| UC-04d | Kasi/Kaur Approval | 🟡 Berjalan dengan bug | `KasiApprovalService` — query filter `assigned_role` salah target (lihat §3.4) |
| UC-05/06 | Lihat Daftar & Detail Surat | ✅ Berjalan | `LetterService::getScopedLetters()`, switch per role |
| UC-08 | Download Surat (PDF on-demand) | ✅ Berjalan | `PdfService`, cek `expires_at` khusus role warga |
| UC-09 | Kelola Data Warga (CRUD) | 🟡 Sebagian | Hanya `index`/`destroy` di `CitizenController`; **tidak ada store/update**; **Import Excel belum ada** |
| UC-14 | Kelola User & Role | 🟡 Sebagian | Hanya `index`/`updateStatus` di `UserController`; tidak ada create/rotasi `officials` |
| UC-15 | Dashboard & Statistik | 🟡 Minimal | Baru gender stats + letter stats mingguan; belum ada dashboard lengkap per role |
| — | Sistem Notifikasi | ✅ Berjalan | Terpasang konsisten di seluruh service approval |

### ❌ Belum Dikerjakan Sama Sekali

| UC | Nama | Bukti dari kode |
|---|---|---|
| UC-17 | Register Akun Warga (validasi NIK) | `RegisteredUserController` ada, tapi **tanpa validasi NIK ke `citizens`** — lihat temuan kritis §3.5 |
| UC-18 | Kelola Profil Desa | Tidak ada Controller |
| UC-19 | Kelola Berita/Informasi | Model `News` direferensikan (`User::news()`, `Village::news()`) tapi **tidak ada migration/Controller untuk `news`** |
| UC-20 | Kelola Struktur Wilayah | Model `Hamlet`/`Rw`/`Rt` ada, tidak ada Controller CRUD |
| UC-21 | Edit Konfigurasi Tipe Surat | `LetterTypeController` hanya punya `index` |
| UC-22 | Kelola Setting Deadline Approval | Tabel `approval_settings` **tidak ada migration-nya**; deadline **hardcode** di `LetterService` (`addDays(3)`, `addDays(2)`) |
| UC-23 | Kelola Organisasi Desa | `village_org_positions`/`village_org_members` tidak ada sama sekali |
| UC-24 | Kelola Peraturan Desa | `village_regulations` direferensikan (`Village::VillageRegulations()`) tapi tidak ada migration/Controller |
| UC-07 | Blockchain Hashing | Belum ada — **sesuai rencana** (memang berstatus Next Dev di semua versi TDD, tidak ada masalah) |
| — | Import Excel Warga | Belum ada |

---

## 3. Temuan Kritis: Penyimpangan dari TDD v4.2 (Independen dari Isu v5.0)

Poin-poin berikut adalah utang teknis / bug yang **sudah ada sebelum isu migrasi v5 muncul**. Perlu ditegaskan karena sebagian pekerjaan "akibat v5" sebenarnya menumpuk di atas masalah yang sudah ada duluan.

### 3.1 — Jalur notifikasi RW sudah "membocorkan" semangat v5, tapi caranya rusak
Di `RwApprovalService::approve()`, setelah RW approve, `OfficialService::resolveNextOfficials()` untuk posisi `'rw'` justru me-resolve **langsung ke Kasi/Kaur/Petugas Desa**, melompati Kadus:
```php
'rw' => Official::whereIn('position', ['kasi_pelayanan','kaur_tu_umum','petugas_desa'])...
```
Sementara itu `KadusApprovalController`/`Service` tetap punya endpoint approve/reject sendiri dengan gate `citizen->hamlet_id`. Ini dua jalur yang **tidak sinkron** — surat secara notifikasi "melompat" ke Kasi, tapi endpoint Kadus tetap ada seolah masih dipakai.

### 3.2 — ENUM status surat di migration mencampur 3 generasi
`create_letters_table` memuat status dari draft sangat lama (`draft`, `waiting_rt`, `waiting_verification`, `cancelled`) **dan** status v4.2 (`pending`, `rt_approved`, `kadus_approved`, dst) sekaligus. Skema DB belum pernah benar-benar murni mengikuti satu versi TDD manapun.

### 3.3 — `LetterStatus` enum PHP punya status yang tidak tercatat di TDD manapun
`WaitingRevisionWarga` dan `RejectedRevision` — fitur "revisi surat oleh warga, maks 2x" — **tidak ada di TDD v4.2 maupun v5.0**. Ini eksperimen tambahan di luar dokumentasi yang diberikan.

### 3.4 — `KasiApprovalService` salah target filter
`getPendingLetters()` memfilter `letterType.assigned_role == 'rw'`, dan migration `letter_types.assigned_role` didefinisikan sebagai `ENUM(['rw'])` — **bukan** `ENUM('kasi_pelayanan','kaur_tu_umum')` sesuai TDD v4.2. Kolom ini tampaknya dipakai keliru.

### 3.5 — Register warga tidak validasi NIK (bug fungsional, bukan sekadar UC belum lengkap)
`RegisteredUserController::store()` langsung membuat `User` dengan `role: 'warga'`, `citizen_id: null`, **tanpa mengecek NIK ke tabel `citizens`** — padahal ini adalah inti UC-17 di seluruh versi TDD (v3.2 s/d v5.0).

### 3.6 — `no_kk` disimpan plaintext
```php
$table->text('no_kk', 16)->nullable();
```
Tidak ada `no_kk_hash`, tidak dienkripsi — melanggar prinsip dual-column encrypted+hash yang sudah baku sejak TDD v3.2 untuk data sensitif seperti NIK.

### 3.7 — Tidak ada layer Repository maupun Policy (lihat §1a)
Ditambahkan di sini sebagai daftar temuan independen dari isu v5.0: seluruh Service mengakses Eloquent Model langsung, dan otorisasi context ditulis inline di Service alih-alih di Policy terpisah. Ini kontradiksi langsung dengan `SID-ARCH-BE-001` S2 yang menetapkan pola ini sebagai final sejak v3.2.

---

## 3a. Klarifikasi RBAC: 5-Tier (Dokumen Arsitektur) vs 9-Role ENUM (Kode)

`SID-ARCH-SYS-001` S4 memperkenalkan pengelompokan **5 Tier** (Superadmin, Admin Desa/Eksekutif, Staff Desa, RT/RW, Warga) untuk kebutuhan navigasi/dokumentasi. Ini **bukan temuan baru untuk kode** — dokumen arsitektur sendiri menegaskan Tier bukan struktur database, hanya label di atas `users.role` ENUM 9 nilai yang sudah diaudit di §2. Poin penting untuk diperhatikan saat migrasi:

- **Tier 2 (Admin Desa/Eksekutif) bukan kelompok otorisasi tunggal** — `petugas_desa` (full visibility + akses konfigurasi/CMS) punya scope **berbeda tegas** dari `kepala_desa`/`sekretaris_desa` (approver aktif di pipeline surat, tanpa akses CMS/konfigurasi). Kode saat ini (`UserController`, dan tidak adanya pemisahan endpoint konfigurasi) belum mencerminkan pemisahan ini karena UC-18/19/20/21/22/23/24 memang belum dibangun sama sekali (lihat §2).
- **Slot "Superadmin" (Tier 1) resmi belum diimplementasikan** — tidak perlu dikerjakan, tidak ada role/middleware/halaman untuk ini sampai ada kebutuhan eksplisit. Dikonfirmasi jangan sampai keliru dianggap sebagai gap yang harus ditutup.
- CMS (UC-18/19/24) harus dibangun **eksklusif untuk `petugas_desa`** — Kades/Sekdes secara eksplisit tidak boleh diberi akses meski satu Tier navigasi, sesuai `SID-ARCH-SYS-001` S2.3.

---

## 3b. Wacana Fitur Baru — Belum Berdesain, Bukan Bagian Scope Migrasi Saat Ini

`SID-ARCH-SYS-001` S2.1/S2.2 menyebut tiga mekanisme sebagai bagian cakupan domain, namun `SID-ARCH-BE-001` S10 **secara eksplisit mengklarifikasi ketiganya belum punya skema tabel, UC, atau keputusan teknis apa pun**, dan secara tegas menginstruksikan: *"Jangan mulai implementasi apa pun untuk ketiganya sebelum ada keputusan eksplisit dari pemilik proyek."*

| Istilah | Status | Pertanyaan terbuka yang dicatat dokumen arsitektur |
|---|---|---|
| **Verifikasi Surat berbasis QR** | Wacana, ada di diagram komponen SYS S3 ("Endpoint Verifikasi QR" publik) tapi tanpa skema | Token disimpan di mana? Digenerate kapan (mengingat PDF bersifat on-demand)? Data apa yang tampil di halaman verifikasi publik (risiko privasi NIK)? Berlaku untuk kategori surat mana? |
| **Void/Cancel Surat** | Wacana, disebut sebagai mekanisme operasional pendukung | Representasi di `letters.status` (saat ini cuma 4 nilai) atau kolom terpisah? Siapa berwenang void? Berlaku untuk surat status apa saja? |
| **Staging Perubahan Data Self-Service** | **Dibatalkan sebagai desain** — versi terbaru `SID-ARCH-BE-001` (S5.3, v1.2) menegaskan UC-09 tetap murni Petugas Desa, tidak ada mekanisme warga edit data sendiri | Bertentangan langsung dengan UC-09 TDD manapun; tidak untuk dikerjakan |

**Kesimpulan untuk audit ini:** ketiga item di atas **tidak ditambahkan ke gap "belum dikerjakan" di §2**, karena statusnya bukan "fitur MVP yang tertunda" melainkan "wacana tanpa keputusan" — mengerjakannya sekarang justru berisiko membangun skema yang belum disepakati. Dicatat di sini murni sebagai kesadaran situasional untuk tim, bukan item pekerjaan.

---

## 4. Dampak Update TDD v4.2 → v5.0 terhadap Kode Existing

### 🔴 Kategori A — Harus Dirombak Total (Alur Approval & RBAC)

| Yang ada di kode sekarang | Tuntutan TDD v5.0 | Dampak |
|---|---|---|
| `KadusApprovalController` + `KadusApprovalService` | Kadus **dihapus total** dari alur approval surat | Hapus seluruh controller & service Kadus |
| `RwApprovalController::approve()` (RW = gate approve/reject) | RW jadi **notif-only**, tidak ada endpoint decision | Hapus endpoint approve RW, ganti jadi pure notifier |
| `LetterApproval.approval_level` ENUM `['rt','rw','kadus','kasi']` | ENUM baru `['rt','kepala_desa','sekdes','kasi_pelayanan','kaur_tu_umum']` | Migration + model cast + seluruh query terdampak |
| `letters.status` ENUM granular (campur 3 generasi) | ENUM generik `pending/in_progress/approved/rejected` + `flow_id` + `current_step_order` + `rejected_at_step` | **Perombakan skema terbesar** — semua service yang hardcode string status harus ditulis ulang |
| Tidak ada approver Kades/Sekdes di kode manapun | Kades/Sekdes jadi **approver aktif**, gate baru gantikan Kadus | Buat controller/service approval baru |
| Tidak ada `letter_categories`, `approval_flows`, `flow_steps` | 3 tabel wajib untuk sistem flow dinamis | Migration + model baru dari nol |
| `OfficialService::resolveNextOfficials()` — hardcode per posisi | Resolve generik berbasis `flow_steps` | Rewrite total |
| `KasiApprovalService.getDashboardLetters()` — `whereIn` status hardcode | Query generik via JOIN `flow_steps` + `current_step_order` | Rewrite |
| Tidak ada Repository/Policy layer (lihat §1a) | `SID-ARCH-BE-001` S2 & S4.3 mewajibkan keduanya, dengan contoh eksplisit `findByFlowStepAndStatus` sebagai query yang harus dipusatkan di Repository | **Momentum tepat untuk dibangun bersamaan** — karena hampir seluruh Service approval sudah pasti ditulis ulang di fase ini, sekaligus perkenalkan `LetterRepository`/`OfficialRepository` dan `LetterPolicy` alih-alih menambah utang teknis baru di Service yang baru ditulis |

**Kesimpulan Kategori A:** hampir seluruh lapisan approval (controller, service, model cast, migration) perlu ditulis ulang — ini rombakan arsitektur, bukan penambahan fitur. Dokumen arsitektur menambah satu dimensi: penulisan ulang ini **sebaiknya sekaligus menutup gap Repository/Policy** (§1a), bukan mengulang pola akses-Model-langsung di kode baru.

### 🟡 Kategori B — Harus Ditambah (Skema Data Warga Baru)

| Tuntutan v5.0 | Status di kode |
|---|---|
| Tabel `families` (KK terpisah, dual-column `no_kk`/`no_kk_hash`) | ❌ Tidak ada |
| Kolom baru di `citizens`: `family_id`, `family_role`, `father_id`/`mother_id`, `blood_type`, `residency_type`, `origin_region`, `data_source`, `last_verified_at`, `sync_status` | ❌ Tidak ada satupun |
| Tabel `citizen_socioeconomics` | ❌ Tidak ada |
| Hapus `citizens.no_kk` (pindah ke `families`) | Kolom masih ada, plaintext |

**Kesimpulan Kategori B:** murni tambahan skema — struktur dasar `citizens` (`rt_id`, `hamlet_id`, `religion`, `domicile_status`, dll) **tidak perlu diubah**, hanya di-patch/ditambah kolom.

### 🟢 Kategori C — Tidak Perlu Diubah (Aman dari Perombakan v5.0)

| Area | Alasan Aman |
|---|---|
| Struktur wilayah `villages/hamlets/rws/rts` (model, migration, seeder) | Tidak berubah sama sekali di v5.0 |
| Mekanisme Auth dasar (Sanctum, login/logout/register flow selain validasi NIK) | Tidak berubah — hanya isi validasi register yang perlu ditambah |
| `LetterType` sebagai entitas (kode, nama, template, verification_type, requirements_info) | Tetap ada, hanya ditambah `category_id`+`flow_id`; `assigned_role` dipertahankan sebagai cache opsional |
| `PdfService` (dompdf, on-demand, template placeholder) | Tidak tersentuh sistem approval; hanya gate status yang menyesuaikan |
| 10 template surat A01–A10 di `LetterTypeSeeder` | Konten tetap valid, hanya perlu diisi `category_id`/`flow_id` saat seed |
| `Official` model dasar (`rt_id`/`rw_id`/`hamlet_id`/`signature_img`/`stamp_img`/`photo_img`/`phone_wa`) | Struktur kolom sudah sesuai v4.2 dan tetap dipakai di v5.0 |
| Notification system (`LetterStatusNotification`, tabel `notifications`) | Mekanisme tetap sama; isi pesan/trigger mengikuti alur baru — `SID-ARCH-BE-001` S7 hanya minta Event/Listener jadi generik (`FlowStepAdvanced`), bukan struktur tabel `notifications` itu sendiri |
| `UserController`, dashboard stats gender/letter mingguan | Tidak tersentuh sistem approval/data warga |
| Config CORS/Sanctum | Tidak relevan dengan TDD sama sekali |
| Pola auth Sanctum SPA cookie-based (bukan Bearer token) | `SID-ARCH-BE-001` S1 mengonfirmasi ini final, sama seperti yang sudah diimplementasikan di kode |
| PDF on-demand tanpa kolom path (tidak ada file tersimpan) | `SID-ARCH-BE-001` S6 menegaskan ulang sebagai keputusan final dengan alasan struktural (risiko *stale* data) — bukan sekadar hemat storage. Kode existing (`PdfService`) sudah sesuai pola ini |
| QR Verification, Void/Cancel, Staging Perubahan Data Self-Service | **Bukan bagian scope migrasi v5.0 sama sekali** — status resmi "wacana belum berdesain" (lihat §3b), jangan dikerjakan sampai ada keputusan eksplisit |

---

## 5. Ringkasan Eksekutif

| Pertanyaan | Jawaban Singkat |
|---|---|
| **Progress sampai mana?** | Backend dasar untuk alur surat 4-tahap + auth + PDF on-demand sudah jalan secara fungsional, tapi 7 dari 22 UC MVP v4.2 (UC-18/19/20/21/22/23/24) belum tersentuh sama sekali. Yang sudah ada mengandung beberapa penyimpangan/bug independen dari isu v5, **plus** menyimpang dari pola arsitektur final (tidak ada layer Repository/Policy — lihat §1a). |
| **Fitur sudah vs belum?** | Sudah: UC-01/02/03/04a-d/05/06/08 + notifikasi. Belum/parsial: UC-09, UC-14, UC-15 (parsial), UC-17 (bug fungsional — tanpa validasi NIK), UC-18/19/20/21/22/23/24 (nol). |
| **Fitur berubah akibat v5.0?** | Seluruh sistem approval (Kadus dihapus, RW jadi notif-only, Kades/Sekdes jadi approver, status generik + flow dinamis) dan seluruh struktur data warga terkait KK/sosio-ekonomi/residency. |
| **Perlu diubah vs tidak?** | Perlu dirombak besar: seluruh controller/service approval, migration `letters`/`letter_approvals`, `OfficialService::resolveNextOfficials` — **sekaligus dibangun dengan Repository/Policy yang selama ini absen**. Perlu ditambah: `families`, `citizen_socioeconomics`, 3 tabel flow, kolom baru `citizens`. Aman: struktur wilayah, mekanisme auth, `LetterType` sebagai entitas, `PdfService`+template, `Official` model dasar, notification system, `UserController`, dashboard stats. |
| **Ada scope di luar migrasi v5.0?** | Ya — QR Verification, Void/Cancel, dan Staging Perubahan Data Self-Service disebut di dokumen arsitektur tapi berstatus resmi "wacana tanpa desain". **Tidak masuk pekerjaan migrasi v5.0 saat ini.** |

---

## 6. Status Keputusan yang Masih Terbuka (Perlu Dikonfirmasi ke Pemilik Proyek)

Bagian ini merangkum poin yang **masih berstatus asumsi/rekomendasi** di dokumen manapun yang tersedia (TDD v5.0 maupun dokumen arsitektur) — bukan gap kode, tapi gap keputusan yang harus ditutup sebelum kode ditulis untuk area tersebut:

| # | Poin | Sumber | Status |
|---|---|---|---|
| 1 | Sekretaris Desa benar-benar ikut approve di step sama dengan Kepala Desa (saling menggantikan) | Rangkuman Percakapan v5.0; ditegaskan ulang di `SID-ARCH-BE-001` S3.3 | ⚠️ Masih rekomendasi/asumsi, bukan keputusan final eksplisit — user menjawab "no preference" saat ditanya di sesi v5.0 |
| 2 | Mekanisme teknis "first-action-wins" Kades/Sekdes | `SID-ARCH-BE-001` S3.3 | Desain teknisnya (DB::transaction + re-check, tanpa row lock) **sudah dijelaskan**, tapi implementasinya bergantung pada poin #1 di atas terkonfirmasi dulu |
| 3 | QR Verification — skema token, waktu generate, data yang ditampilkan | `SID-ARCH-BE-001` S10 | Belum ada keputusan sama sekali |
| 4 | Void/Cancel Surat — representasi status, siapa berwenang | `SID-ARCH-BE-001` S10 | Belum ada keputusan sama sekali |
| 5 | Kolom `letter_types.assigned_role` | `SID-ARCH-BE-001` S4.2 | ✅ **Sudah final** — dipertahankan sebagai derived cache, Policy tetap validasi via `flow_steps` |

---

*Dokumen ini adalah hasil audit terhadap kode backend yang dikirimkan pada sesi ini, dibandingkan dengan TDD v4.2 (basis progress), TDD v5.0 (referensi target migrasi), dan dokumen arsitektur `SID-ARCH-SYS-001` v1.1 / `SID-ARCH-BE-001` v1.2 / `SID-ARCH-FE-001` v1.1.*
