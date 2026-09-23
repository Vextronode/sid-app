# TECHNICAL DESIGN DOCUMENT — BAGIAN 2
## SISTEM INFORMASI DESA - DESA CIBENDA
### Use Case Descriptions

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 2 dari 5 (+ Appendix) |
| Status | v5.0 — mencerminkan state final saat ini |
| Cakupan | Deskripsi seluruh Use Case aktif MVP (UC-01 s/d UC-24, kecuali yang dipindah ke Appendix) |
| UC Next Dev / Tahap 2 (UC-07, UC-11, UC-12, UC-13) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-01_Overview_Scope_Roles.md`, `TDD-03_Database_Schema.md`, OpenAPI Spec v5.0 |

> Referensi kontrak endpoint (request/response, error handling) untuk setiap UC ada di OpenAPI Spec v5.0 — dokumen ini fokus pada alur bisnis dan aturan, bukan kontrak HTTP detail.

---

## Ringkasan Use Case

Sistem ini mendefinisikan **22 Use Case aktif di MVP**. Total keseluruhan UC yang pernah didefinisikan sepanjang proyek — termasuk yang dipindah keluar MVP tapi nomornya dipertahankan untuk konsistensi referensi — adalah **26 UC**.

| Kategori | Jumlah | Daftar |
|---|---|---|
| ✅ Aktif di MVP | 22 UC | UC-01, 02, 03, 04a (+ sub-flow notif RW), 04c, 04d, 05, 06, 08, 09, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 |
| ❌ Non-MVP (nomor dipertahankan, lihat Appendix) | 4 UC | UC-07, UC-11, UC-12, UC-13 |
| **Total** | **26 UC** | — |

> UC-10 sudah terintegrasi ke UC-03. UC-04b (RW Approval) dan UC-04c versi lama (Kadus Approval) sudah dihapus total — perannya digantikan sub-flow notifikasi pasif (dalam UC-04a) dan UC-04c versi baru (Kades/Sekdes Approval).

---

## UC-01: Login

| Field | Keterangan |
|---|---|
| Use Case ID | UC-01 |
| Nama | Login |
| Aktor | Warga, RT, RW, Kadus (akun tetap ada, tanpa hak approval), Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User belum terautentikasi, memiliki akun aktif di sistem |
| Post-condition | User berhasil masuk; session aktif via HttpOnly cookie (Sanctum) |

Main Flow:
1. User membuka halaman login
2. User memasukkan email dan password
3. Sistem memvalidasi format input
4. Sistem memverifikasi kredensial ke database
5. Sistem membuat session token (Sanctum cookie)
6. Sistem mengarahkan user ke dashboard sesuai role masing-masing

Alternative Flow:
- 3a. Terlalu banyak percobaan gagal → sistem terapkan rate limiting (throttle)
- 4a. Kredensial salah → sistem tampilkan pesan error, catat failed login attempt ke log
- 4b. Akun nonaktif → sistem tampilkan "Akun tidak aktif, hubungi administrator"

---

## UC-02: Logout

| Field | Keterangan |
|---|---|
| Use Case ID | UC-02 |
| Nama | Logout |
| Aktor | Sama seperti UC-01 |
| Pre-condition | User sudah login dan session aktif |
| Post-condition | Session dihapus, user diarahkan ke halaman login |

Main Flow:
1. User menekan tombol Logout
2. Sistem menghapus token Sanctum dari sisi server
3. Sistem menghapus HttpOnly cookie dari browser
4. Sistem mencatat event logout (timestamp, IP, user agent)
5. Sistem mengarahkan user ke halaman login

---

## UC-03: Input Permohonan Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-03 |
| Nama | Input Permohonan Surat |
| Aktor | Warga |
| Pre-condition | Warga sudah login dengan akun terdaftar, jenis surat tersedia (`template != NULL` + `is_active = true`) |
| Post-condition | Permohonan tersimpan dengan status `pending`, `flow_id` di-snapshot, `current_step_order = 1`, notifikasi terkirim ke RT wilayah warga |

Main Flow:
1. Warga membuka menu "Ajukan Permohonan Surat"
2. Warga memilih jenis surat (hanya tampil yang `template != NULL AND is_active = true`)
3. Sistem menampilkan persyaratan berdasarkan `verification_type` jenis surat:
   - `auto` → sistem otomatis validasi jika NIK warga terdaftar, lanjut submit
   - `manual` → sistem tampilkan checklist persyaratan, warga wajib konfirmasi kelengkapan
   - `document` → sistem tampilkan form upload dokumen pendukung; wajib diisi sebelum submit
4. Sistem mengambil data warga dari `auth()->user()->citizen` secara otomatis (nama, NIK, alamat sudah terisi dari akun yang login)
5. Warga melengkapi form (keperluan, catatan tambahan)
6. Jika `verification_type = document` → warga upload dokumen pendukung
7. Warga submit permohonan
8. Sistem memvalidasi semua input (field wajib, format)
9. Sistem resolve RT wilayah warga via OfficialService (berdasarkan `citizens.rt_id`)
10. Sistem mengambil `letter_types.flow_id` dan meng-*snapshot*-nya ke `letters.flow_id` (dikunci, bukan live-reference — lihat `TDD-03_Database_Schema.md` Section 3)
11. Sistem menyimpan data dalam `DB::transaction()`:
    - `citizen_id` = `auth()->user()->citizen_id`
    - `submitted_by` = `auth()->user()->id` (role: warga)
    - NIK dienkripsi AES-256 → `applicant_nik`
    - SHA-256 dari NIK plaintext → `applicant_nik_hash`
    - `status = pending`, `submitted_at = now()`
    - `flow_id` = snapshot, `current_step_order = 1`
    - INSERT ke `letter_status_logs` (status: pending, actor_id, IP)
12. Sistem men-dispatch `SendNotificationJob` ke RT yang berwenang
13. Sistem menampilkan konfirmasi sukses ke Warga

Alternative Flow:
- 6a. Ukuran file dokumen melebihi batas → error "File terlalu besar"
- 8a. Validasi gagal → tampilkan pesan error per field; tidak menyimpan data
- 9a. RT wilayah tidak ditemukan / jabatan kosong → surat tetap tersimpan `pending`, notifikasi dikirim ke semua `petugas_desa` aktif (broadcast fallback)

---

## UC-04a: RT Approval / Rejection Surat (Tahap 1, Berbasis Wilayah)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04a |
| Nama | RT Approval / Rejection Surat |
| Aktor | RT |
| Pre-condition | RT sudah login; ada surat dengan status `pending` di wilayahnya, `current_step_order = 1` |
| Post-condition | Status surat berubah (`in_progress` / `rejected`), log tercatat, notifikasi terkirim |

Main Flow:
1. RT membuka daftar surat wilayahnya berstatus `pending`
2. RT membuka detail permohonan
3. RT memeriksa data pemohon dan keperluan surat
4. RT memilih tindakan: Setujui atau Tolak
5. RT mengisi catatan keputusan (wajib jika menolak)
6. Sistem memvalidasi bahwa RT berwenang atas wilayah surat ini (via OfficialService, cek `rt_id`)
7. Sistem memproses dalam `DB::transaction()`:
   - Jika SETUJUI: `current_step_order += 1`, `status = in_progress`, isi `processed_at`
   - Jika TOLAK: `status = rejected`, `rejected_at_step` = step RT, isi `processed_at`
   - INSERT ke `letter_approvals` (`approval_level: 'rt'`, action, notes, `approved_by`, `flow_step_id`, `deadline_at`)
   - INSERT ke `letter_status_logs` (old: pending, new: in_progress/rejected, actor_id, IP)
8. Jika approve: sistem resolve RW wilayah (FYI, non-blocking) + resolve Kades/Sekdes (approver berikutnya) → dispatch notifikasi ke keduanya **secara paralel**
9. Jika reject: sistem dispatch notifikasi ke Warga (TERMINAL)
10. Sistem menampilkan konfirmasi keputusan ke RT

Authorization:
- Hanya RT yang `rt_id`-nya sesuai dengan wilayah warga pemohon yang boleh approve
- 5a. RT memilih Tolak tanpa catatan → sistem meminta catatan wajib diisi

### Sub-flow: Notifikasi RW (Side-Effect, Non-Blocking)

RW tidak memiliki use case approval sendiri. Sub-flow berikut adalah bagian dari efek samping UC-04a, bukan aksi user:

1. RT approve surat (di UC-04a)
2. Sistem resolve RW wilayah warga (via `rts.rw_id`) secara paralel/independen
3. Sistem dispatch notifikasi FYI ke RW — murni pemberitahuan, tidak ada tombol approve/reject/block apapun di sisi RW
4. Secara bersamaan (**tidak menunggu** aksi RW), sistem langsung lanjut resolve approver berikutnya (Kepala Desa/Sekretaris Desa) dan dispatch notifikasi ke mereka
5. RW dapat melihat riwayat notifikasi yang pernah diterima di dashboard-nya (read-only, lihat UC-15)

Catatan Penting:
- RW **tidak pernah** tercatat sebagai `approval_level` di tabel `letter_approvals`
- RW **tidak memblokir** alur surat — surat langsung lanjut ke step berikutnya begitu RT approve
- Fallback notifikasi RW kosong/tidak ditemukan: broadcast ke semua `petugas_desa` aktif (pola sama dengan fallback RT)

---

## UC-04c: Kepala Desa / Sekretaris Desa Approval / Rejection Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04c |
| Nama | Kepala Desa / Sekretaris Desa Approval / Rejection Surat |
| Aktor | Kepala Desa ATAU Sekretaris Desa (saling menggantikan, first-action-wins) |
| Pre-condition | User sudah login sebagai `kepala_desa` atau `sekretaris_desa`; ada surat dengan `current_step_order` menunjuk ke step `approver_position IN ('kepala_desa','sekdes')` |
| Post-condition | `letters.status` berubah jadi `in_progress` (jika masih ada step berikut) atau `approved`/`rejected` (jika step ini `is_final`); `current_step_order` bertambah jika approve |

Main Flow:
1. User membuka daftar surat dengan step aktif = posisi dirinya (query generik: JOIN `flow_steps` ON `flow_id` & `current_step_order`, WHERE `approver_position` = posisi user)
2. User membuka detail, memeriksa riwayat approval sebelumnya (RT + FYI RW)
3. User memilih Setujui/Tolak, isi catatan jika menolak
4. Sistem cek: apakah surat masih di step yang sesuai (gate logic, re-validasi race condition disederhanakan di application layer)
5. Jika SETUJUI: INSERT ke `letter_approvals` (`approval_level` sesuai role aktor, `flow_step_id` terisi), `current_step_order += 1`, status jadi `in_progress` atau `approved` jika step berikutnya `is_final`
6. Jika TOLAK: status jadi `rejected`, `rejected_at_step` dicatat (TERMINAL)
7. Notifikasi ke step berikutnya (jika approve) atau ke Warga (jika reject/final approve)

Catatan:
1. Tidak ada DB-level lock untuk mencegah Kades & Sekdes approve bersamaan — disederhanakan sebagai app-layer check (first-action-wins)
2. ⚠ Status Sekdes ikut approve di step sama dengan Kades adalah rekomendasi/asumsi default, **belum keputusan final eksplisit** — lihat `TDD-05_Roadmap_Risks_OpenQuestions.md`

---

## UC-04d: Kasi / Kaur Approval / Rejection Surat (Final Step)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04d |
| Nama | Kasi / Kaur Approval / Rejection Surat (Final Step) |
| Aktor | Kasi Pelayanan atau Kaur TU & Umum (sesuai `flow_steps.approver_position` pada step `is_final=true`) |
| Pre-condition | Kasi/Kaur sudah login; ada surat dengan `current_step_order` menunjuk ke step `approver_position` sesuai role-nya dan `is_final=true` |
| Post-condition | Status surat berubah (`approved` / `rejected`). Jika approved: `letter_number` digenerate, `expires_at` dihitung, PDF siap didownload, notifikasi ke Warga + Kepala Desa & Sekretaris Desa (monitoring) |

Main Flow:
1. Kasi/Kaur membuka daftar surat dengan `current_step_order` menunjuk ke posisinya (query generik: JOIN `flow_steps` ON `flow_id` & `current_step_order`)
2. Kasi/Kaur membuka detail permohonan beserta seluruh riwayat keputusan sebelumnya (RT, FYI RW, Kades/Sekdes)
3. Kasi/Kaur memilih tindakan: Setujui atau Tolak
4. Kasi/Kaur mengisi catatan keputusan (wajib jika menolak)
5. Sistem memvalidasi: step saat ini adalah step `is_final=true` dan `approver_position` sesuai role user
6. Sistem memproses dalam `DB::transaction()`:
   - Jika SETUJUI: `status = 'approved'`, generate `letter_number`, hitung `expires_at` (jika `validity_days` tidak NULL)
   - Jika TOLAK: `status = 'rejected'`, `rejected_at_step` dicatat (TERMINAL)
   - INSERT ke `letter_approvals` (`approval_level` sesuai role aktor, `flow_step_id` terisi, action, notes, `approved_by`)
   - INSERT ke `letter_status_logs` (old: in_progress, new: approved/rejected, actor_id, IP)
7. Jika approved: dispatch notifikasi ke Warga + Kepala Desa & Sekretaris Desa (monitoring, keduanya)
8. Jika rejected: dispatch notifikasi ke Warga (TERMINAL)

Authorization:
- Hanya user dengan role sesuai `flow_steps.approver_position` pada step aktif yang bisa approve
- Surat dengan `current_step_order` yang tidak sesuai tidak bisa diakses (403)
- 4a. Kasi/Kaur memilih Tolak tanpa catatan → sistem meminta catatan wajib diisi

---

## UC-05: Lihat Daftar Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-05 |
| Nama | Lihat Daftar Surat |
| Aktor | Warga, RT, RW, Kadus (read-only, tanpa hak approval), Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login |
| Post-condition | Sistem menampilkan daftar surat sesuai hak akses dan filter yang dipilih |

Main Flow:
1. User membuka menu Daftar Surat
2. Sistem mengambil data surat
3. Filter tampilan berdasarkan role:
    - RT: surat wilayahnya, status `pending` (step aktif = rt)
    - RW: surat yang lewat FYI (read-only, tidak ada filter status aktif — RW bukan approver)
    - Kepala Desa / Sekretaris Desa: surat dengan `current_step_order` menunjuk ke posisi `kepala_desa`/`sekdes`, status `in_progress`
    - Kasi/Kaur: surat dengan `current_step_order` menunjuk ke posisinya (step final), status `in_progress`
    - Petugas Desa: SEMUA surat tanpa filter status (full visibility pipeline)
    - Kadus: tidak memiliki filter approval khusus; jika ditampilkan sama sekali, hanya sebagai referensi struktur wilayah non-approval
4. User dapat memfilter berdasarkan: status (sesuai role), jenis surat, periode, nama pemohon
5. Sistem menampilkan daftar dengan informasi: nomor surat, pemohon, jenis, status, tanggal
6. Sistem menampilkan badge 'overdue' jika `is_overdue = true`

---

## UC-06: Lihat Detail & Status Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-06 |
| Nama | Lihat Detail & Status Surat |
| Aktor | Warga, RT, RW, Kadus (read-only), Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login, surat sudah ada di sistem |
| Post-condition | Sistem menampilkan detail surat dan seluruh riwayat perubahan status |

Main Flow:
1. User memilih surat dari daftar
2. Sistem mengambil data surat beserta relasi (`letter_type`, `statusLogs`, `approvals`)
3. Sistem menampilkan:
   - Detail data pemohon (nama, NIK ter-mask, keperluan)
   - Status terkini dengan badge warna (`pending` / `in_progress` / `approved` / `rejected`) — detail "sedang di step mana" dilihat dari `current_step_order` + JOIN ke `flow_steps`
   - Indikator di tahap mana surat berada (RT / RW-FYI / Kades-Sekdes / Kasi-Kaur)
   - Informasi approval RT (jika sudah diproses RT)
   - Informasi notifikasi FYI RW (jika sudah dikirim)
   - Timeline riwayat: setiap perubahan status + timestamp + aktor + catatan + IP
   - Badge 'overdue' jika deadline terlewati
   - Informasi approval Kades/Sekdes (jika sudah diproses)
   - Informasi approval Kasi/Kaur (jika sudah diproses)
4. Tombol Download PDF muncul jika status = `approved` (step final). Untuk warga: disabled jika `expires_at` sudah lewat. Untuk petugas/kasi/kades/sekdes: selalu aktif

---

## UC-08: Download Surat (PDF On-Demand)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-08 |
| Nama | Download Surat (PDF On-Demand) |
| Aktor | Warga (dengan cek `expires_at`), Petugas Desa, Kasi Pelayanan, Kaur TU & Umum, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login, surat sudah berstatus `approved` |
| Post-condition | File PDF ter-download (digenerate on-demand, tidak disimpan di server) |

Main Flow:
1. User membuka detail surat berstatus `approved`
2. User menekan tombol "Download Surat PDF"
3. Backend melakukan pengecekan:
   - Jika role = warga: cek `expires_at` → jika sudah lewat → 403 "Masa berlaku surat telah habis"
   - Role lain (`petugas_desa`, `kasi_pelayanan`, `kaur_tu_umum`, `kepala_desa`, `sekretaris_desa`) → tidak cek `expires_at`
4. Sistem mengambil template dari `letter_types.template` (HTML Blade)
5. Sistem inject data: nomor surat, data pemohon, keperluan, tanggal
6. Sistem mengambil TTD dan stempel dari `officials` (Kepala Desa aktif: `is_active=true AND ended_at IS NULL`)
7. `barryvdh/laravel-dompdf` generate PDF dari template yang sudah diisi data
8. Sistem mengembalikan binary PDF langsung (tidak disimpan file di server)

Alternative Flow:
- 3a. Status bukan `approved` → tombol Download tidak muncul
- 3b. Warga + `expires_at` sudah lewat → 403, tombol disabled di UI

**Alasan struktural (bukan sekadar hemat storage):** PDF yang persisten berisiko menjadi *stale* jika data surat berubah setelah digenerate (misal koreksi nama pemohon), dan menambah kompleksitas manajemen storage/cleanup yang tidak sepadan untuk traffic desa kecil.

---

## UC-09: Kelola Data Warga (CRUD Citizens)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-09 |
| Nama | Kelola Data Warga (CRUD Citizens) |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Data warga berhasil dibuat / diupdate di tabel `citizens` |

**Main Flow - Tambah Warga:**
1. Petugas Desa membuka menu "Data Warga"
2. Petugas memilih "Tambah Warga Baru"
3. Petugas mengisi form:
   - NIK (16 digit numerik), nama lengkap, tempat & tanggal lahir
   - Jenis kelamin, alamat, `rt_id`, `hamlet_id`
   - Status perkawinan, pekerjaan, agama, pendidikan terakhir, `domicile_status`, `current_domicile`
   - `blood_type`, `residency_type` (lokal/pendatang), `origin_region` (jika pendatang)
   - `father_id`/`father_name_text` (pilih dari data warga terdaftar atau isi teks bebas jika tidak terdaftar), `mother_id`/`mother_name_text` (sama)
   - `family_id` (pilih dari dropdown KK yang sudah ada, atau buat KK baru via sub-flow Kelola Data Keluarga), `family_role`
4. Sistem memvalidasi: format NIK 16 digit numerik wajib, keunikan NIK (generate SHA-256 dari NIK → cek `nik_hash`)
5. Sistem menyimpan: `nik` (dienkripsi AES-256), `nik_hash` (SHA-256 plaintext, untuk indexing), `address` (dienkripsi AES-256)
6. Sistem menampilkan konfirmasi "Data warga berhasil disimpan"

**Main Flow - Edit Warga:**
1. Petugas membuka data warga dari daftar → pilih "Edit"
2. Petugas mengubah field yang diperlukan (kecuali NIK — tidak bisa diubah)
3. Sistem menyimpan perubahan

**Main Flow - Lihat & Cari Warga:**
1. Petugas membuka menu "Data Warga"
2. Petugas dapat mencari berdasarkan: nama (LIKE) atau NIK (di-convert ke hash)
3. Sistem menampilkan daftar dengan: nama, NIK ter-mask, alamat, status

**Main Flow - Import Excel:**
1. Petugas memilih "Import Data Warga dari Excel"
2. Petugas upload file Excel (.xlsx / .csv) sesuai template yang disediakan
3. Sistem memvalidasi format file dan header kolom
4. Sistem memproses via `maatwebsite/excel`: validasi per baris (format NIK, duplikat) — **bukan all-or-nothing**, baris gagal di-skip tanpa membatalkan baris valid lainnya
5. Sistem menyimpan data yang valid, skip baris yang error
6. Sistem menampilkan ringkasan: jumlah berhasil, jumlah error beserta detail per baris

Alternative Flow:
- NIK sudah terdaftar → error "NIK sudah ada dalam database warga"
- Format NIK salah → error "NIK harus 16 digit angka"

**Catatan Alur Update KTP/KK:** Petugas Desa sifatnya asesor/pencatat administratif, bukan penerbit resmi (penerbitan tetap di Kecamatan/Dukcapil). UC-09 adalah tempat Petugas Desa mencatat ulang data yang sudah resmi berubah di Kecamatan — murni pencatatan administratif desa, **bukan** proses penerbitan, **tidak perlu approval flow apapun**, cukup CRUD biasa.

**Main Flow - Kelola Data Keluarga (KK):**
- Petugas Desa buka menu "Data Keluarga (KK)"
- Tambah KK baru: input `no_kk`, `family_address`, pilih `rt_id`/`hamlet_id`
- Tambah anggota ke KK: pilih/buat citizen, set `family_role`, FK ke `family_id`
- Sistem otomatis validasi: hanya 1 `family_role='kepala_keluarga'` per `family_id` aktif

---

## UC-14: Kelola User & Role

| Field | Keterangan |
|---|---|
| Use Case ID | UC-14 |
| Nama | Kelola User & Role |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Akun user berhasil dibuat / diubah / dinonaktifkan |

Main Flow:
1. Petugas Desa membuka menu "Manajemen User"
2. Petugas memilih: Tambah / Edit / Nonaktifkan akun
3. Petugas mengisi/mengubah data:
    - Untuk akun RT/RW/Kadus/Kades/Kasi/Kaur: nama, email, role, `rt_id`/`rw_id`/`hamlet_id` (sesuai jabatan), `citizen_id`, `started_at`, status aktif
    - Untuk akun Petugas Desa: nama, email, role, status aktif
    - Untuk jabatan Sekretaris Desa: saat Petugas Desa assign/update jabatan Sekdes, sistem otomatis set `users.role = 'sekretaris_desa'` pada akun yang bersangkutan
4. Sistem memvalidasi: email unik, role valid (9 nilai ENUM), `citizen_id` valid
5. Untuk pembuatan akun jabatan baru: sistem INSERT ke tabel `officials` (`citizen_id`, `user_id`, `position`, `rt_id`/`rw_id`/`hamlet_id`, `started_at`)
6. Untuk rotasi jabatan: sistem UPDATE `officials` SET `ended_at = today`, `is_active = false`
7. Jika posisi yang dirotasi adalah `sekdes`: sistem UPDATE `users` SET `role = 'sekretaris_desa'` pada akun baru
8. Sistem menyimpan perubahan ke tabel `users`
9. Sistem mencatat aktivitas di log audit (`spatie/activitylog`)

Alternative Flow:
- Email sudah terdaftar → error "Email sudah digunakan"
- `citizen_id` tidak ditemukan → error "Data kependudukan tidak ditemukan"
- Guard: Petugas Desa tidak bisa nonaktifkan diri sendiri, dan tidak bisa nonaktifkan satu-satunya `petugas_desa` aktif yang tersisa

> Meski Kadus tetap dicantumkan dalam daftar jabatan yang dikelola di UC-14, Kadus tidak lagi punya relevansi terhadap `flow_steps.approver_position`.

---

## UC-15: Lihat Dashboard & Statistik

| Field | Keterangan |
|---|---|
| Use Case ID | UC-15 |
| Nama | Lihat Dashboard & Statistik |
| Aktor | Warga, RT, RW, Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login |
| Post-condition | Sistem menampilkan dashboard sesuai role |

Main Flow:
1. User login → sistem otomatis menampilkan dashboard
2. Sistem mengambil dan menampilkan data sesuai role:

**Dashboard Warga:** Daftar surat yang pernah diajukan beserta status terkini, indikator visual tahap (RT / RW-FYI / Kades-Sekdes / Kasi-Kaur / selesai), notifikasi belum dibaca.

**Dashboard RT:** Jumlah surat wilayah (total pending, sudah diproses), daftar surat yang menunggu keputusan RT, notifikasi belum dibaca.

**Dashboard RW:** Bukan "daftar surat menunggu approval" — melainkan "daftar surat yang lewat FYI", read-only, tanpa tombol approve/reject. RW hanya melihat riwayat notifikasi yang pernah diterima.

**Dashboard Petugas Desa:** Jumlah warga terdaftar, full visibility semua surat (semua status, termasuk rejected), notifikasi belum dibaca. Widget aset & keuangan tidak ada di MVP.

**Dashboard Kasi/Kaur:** Jumlah surat dengan `current_step_order` yang diassign ke role-nya (step final), daftar surat menunggu keputusan final, notifikasi belum dibaca, badge overdue.

**Dashboard Kepala Desa / Sekretaris Desa:** Approver aktif — dashboard menampilkan daftar surat yang menunggu approval mereka (query generik berbasis `current_step_order`), bukan murni read-only. Daftar surat dengan `current_step_order` menunjuk ke posisi `kepala_desa`/`sekdes`, status `in_progress`. Filter status surat. Notifikasi belum dibaca. Dashboard Kepala Desa dan Sekretaris Desa identik.

> Kadus tidak dicantumkan sebagai aktor dashboard aktif di UC-15 — hanya tetap muncul sebagai aktor UC-01/02/05/06 (login & lihat-saja).

---

## UC-16: Lihat Halaman Publik (Tanpa Login)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-16 |
| Nama | Lihat Halaman Publik |
| Aktor | Pengunjung (tanpa login) |
| Pre-condition | Pengunjung mengakses URL sistem melalui browser |
| Post-condition | Pengunjung dapat melihat informasi publik desa |

Main Flow:
1. Pengunjung membuka URL sistem
2. Sistem menampilkan halaman beranda sebagai landing page (tanpa memerlukan login)
3. Pengunjung dapat mengakses:
   - Beranda — sambutan kepala desa, info singkat desa, statistik publik
   - Profil Desa — sejarah, visi misi, struktur pemerintahan desa
   - Pengumuman & Berita — daftar berita/pengumuman yang sudah dipublikasikan
   - Info Jenis Surat — daftar jenis surat yang tersedia beserta persyaratannya
   - Peraturan Desa — daftar peraturan desa yang sudah dibuat
   - Hubungi Kami — nomor WA dari `officials` dengan `position IN ('kasi_pelayanan', 'kaur_tu_umum')` yang `is_active=true`
4. Semua konten halaman publik hanya dapat dibaca (read-only)

Notes:
- Konten diambil dari tabel `news` (`is_published = true`) dan `letter_types` (`is_active = true`)
- Tidak ada data sensitif warga yang ditampilkan di halaman publik

---

## UC-17: Register Akun Warga

| Field | Keterangan |
|---|---|
| Use Case ID | UC-17 |
| Nama | Register Akun Warga |
| Aktor | Calon pengguna (Warga Cibenda) |
| Pre-condition | Warga belum memiliki akun, NIK sudah terdaftar di tabel `citizens` |
| Post-condition | Akun warga berhasil dibuat, langsung aktif, warga dapat login |

Main Flow:
1. Warga membuka halaman registrasi
2. Warga mengisi form: NIK (16 digit), nama lengkap, email, password
3. Sistem memvalidasi format NIK (16 digit numerik) dan format email
4. Sistem generate SHA-256 dari NIK → cari di `citizens.nik_hash`
5. Jika NIK tidak ditemukan → error "NIK tidak terdaftar sebagai warga Desa Cibenda"
6. Jika NIK ditemukan tapi sudah punya akun → error "NIK sudah terdaftar, silakan login"
7. Jika NIK ditemukan dan belum punya akun: INSERT ke `users` (`citizen_id`, `role = 'warga'`, `is_active = true`)
8. Sistem mengarahkan warga ke halaman login
9. Warga login dan mengakses dashboard

Alternatif Flow:
- Format NIK salah → error "NIK harus 16 digit angka"
- Email sudah digunakan akun lain → error "Email sudah terdaftar"
- Password terlalu lemah → error dengan panduan password

> **Catatan penting:** Tidak ada kategori "warga Non-NIK". Setiap warga tercatat (baik lokal maupun pendatang) selalu punya NIK terverifikasi di `citizens` — pembeda lokal/pendatang murni kolom `residency_type`, bukan tabel/jalur terpisah. Warga yang belum tercatat di `citizens` (baik lokal maupun pendatang) harus dicatat lebih dulu oleh Petugas Desa (UC-09) sebelum bisa register.

---

## UC-18: Kelola Profil Desa

| Field | Keterangan |
|---|---|
| Use Case ID | UC-18 |
| Nama | Kelola Profil Desa |
| Aktor | Petugas Desa (saja) — Kepala Desa dan Sekretaris Desa **tidak termasuk** |
| Pre-condition | User sudah login |
| Post-condition | Data profil desa berhasil diperbarui dan tampil di halaman publik |

Main Flow:
1. User membuka menu "Profil Desa"
2. Sistem menampilkan data profil desa saat ini: nama desa, kode desa, nama Kepala Desa, sejarah singkat, visi misi, alamat kantor, nomor telepon, struktur pemerintahan
3. User memilih "Edit Profil Desa"
4. User mengubah field yang diperlukan
5. Sistem memvalidasi input (field wajib tidak boleh kosong)
6. Sistem menyimpan perubahan ke tabel `villages`
7. Sistem menampilkan konfirmasi
8. Perubahan langsung tampil di halaman publik (UC-16)

Alternatif Flow:
- Field wajib kosong (nama desa, nama Kepala Desa) → error validasi per field

Notes:
- Domain CMS (Profil Desa, Berita, Peraturan Desa) dimiliki **eksklusif** oleh `petugas_desa`. Kepala Desa dan Sekretaris Desa **tidak** memiliki akses ke domain ini meski keduanya adalah approver aktif di domain surat — dua domain ini terpisah tegas.
- Tidak ada approval bertingkat; perubahan langsung tersimpan

---

## UC-19: Kelola Berita / Informasi

| Field | Keterangan |
|---|---|
| Use Case ID | UC-19 |
| Nama | Kelola Berita / Informasi |
| Aktor | Petugas Desa (saja) — Kepala Desa dan Sekretaris Desa **tidak termasuk** |
| Pre-condition | User sudah login |
| Post-condition | Berita/pengumuman berhasil dibuat/diperbarui/dihapus; konten tampil di halaman publik jika dipublikasikan |

**Main Flow - Tambah Berita:**
1. User membuka menu "Berita & Informasi" → "Tambah Berita Baru"
2. User mengisi form: judul (wajib), konten (wajib, rich text), thumbnail (opsional), status Draft/Publikasikan
3. Sistem generate slug otomatis dari judul
4. Sistem memvalidasi: judul & konten wajib diisi, slug unik
5. Sistem menyimpan ke tabel `news` (`author_id` = user login, `is_published`, `published_at` jika langsung dipublikasikan)
6. Jika `is_published = true` → berita langsung tampil di halaman publik (UC-16)

**Main Flow - Edit / Hapus Berita:** Toggle status Draft ↔ Publikasikan; hapus = soft delete, berita tidak lagi tampil di publik.

**Main Flow - Lihat Daftar Berita:** Semua berita (Draft & Publikasi) milik desa, dapat difilter berdasarkan status dan periode.

Alternatif Flow:
- Judul kosong → error "Judul berita wajib diisi"
- Slug sudah digunakan → sistem generate slug alternatif otomatis (suffix angka)

---

## UC-20: Kelola Struktur Wilayah (Dusun / RW / RT)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-20 |
| Nama | Kelola Struktur Wilayah |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Data struktur wilayah berhasil ditambah/diubah/dinonaktifkan |

Main Flow:
- Petugas membuka menu "Kelola Wilayah" — hierarki: Desa → Dusun → RW → RT
- Petugas dapat tambah/edit/nonaktifkan unit wilayah (`hamlets`, `rws`, `rts`)
- Sistem memvalidasi keunikan `code` (dusun) dan `full_label` per level
- Sistem menyimpan ke `hamlets`/`rws`/`rts`
- Menonaktifkan wilayah: `is_active = false` (guard: cek ada warga aktif di wilayah ini)

Catatan: 5 Dusun Desa Cibenda (Patrol, Sinargalih, Cibenda, Budiasih, Sucen) di-seed saat instalasi.

---

## UC-21: Edit Konfigurasi Tipe Surat (Versi Sederhana — MVP)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-21 |
| Nama | Edit Konfigurasi Tipe Surat (Versi Sederhana) |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Konfigurasi tipe surat berhasil diperbarui |
| Catatan Penting | Template HTML dan form field adalah developer-only via seeder. Tambah/hapus/ubah template → Next Dev Paket 1 (lihat Appendix). |

Main Flow:
- Petugas membuka menu "Tipe Surat" — sistem menampilkan daftar dengan badge Draft/Aktif/Nonaktif
- Petugas memilih tipe surat → klik Edit
- Petugas hanya bisa mengubah: `validity_days`, `assigned_role`, `category_id`, `flow_id`, toggle `is_active`
- Sistem menyimpan perubahan ke `letter_types`

> `category_id`/`flow_id` sudah bisa diedit Petugas Desa (agar bisa memindahkan tipe surat ke flow approval lain tanpa developer), namun pembuatan tipe surat baru dan `template` tetap developer-only via seeder di MVP.

---

## UC-22: Kelola Setting Deadline Approval

| Field | Keterangan |
|---|---|
| Use Case ID | UC-22 |
| Nama | Kelola Setting Deadline Approval |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Setting deadline approval per tahap berhasil diperbarui |

Main Flow:
- Petugas membuka menu "Pengaturan Sistem" → "Deadline Approval"
- Sistem menampilkan setting per tahap approval yang berlaku (`rt`, `kepala_desa`, `sekdes`, `kasi_pelayanan`, `kaur_tu_umum`)
- Petugas mengubah `deadline_hours` dan/atau `reminder_hours` per tahap
- Sistem memvalidasi: `deadline_hours > 0`, `reminder_hours < deadline_hours`
- Sistem menyimpan ke `approval_settings` (UNIQUE per `village_id` + `approval_level`)

Catatan: Jika deadline terlewat, surat **tidak** auto-reject — hanya `is_overdue = true` + notifikasi reminder.

---

## UC-23: Kelola Data Organisasi Desa (BPD, BUMDES, LPM, Karang Taruna, PKK)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-23 |
| Nama | Kelola Data Organisasi Desa |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Catatan Pending | Fitur rotasi jabatan aktif/nonaktif ditentukan setelah konfirmasi dari desa (statis atau dinamis). Tabel sudah ada, implementasi fitur menyusul. |

Main Flow:
- Petugas membuka menu "Organisasi Desa" — UI menampilkan grouping BPD/BUMDES/LPM/Karang Taruna/PKK
- Petugas klik group → tampil daftar jabatan beserta pemegang jabatan aktif
- Petugas dapat edit nama, foto, nomor WA pemegang jabatan
- Jika fitur rotasi aktif: ganti pemegang jabatan (INSERT baru + UPDATE lama `ended_at`)

---

## UC-24: Kelola Peraturan Desa

| Field | Keterangan |
|---|---|
| Use Case ID | UC-24 |
| Nama | Kelola Peraturan Desa |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Peraturan desa berhasil dibuat/diperbarui/dihapus |

Main Flow:
- Petugas membuka menu "Peraturan Desa" — sistem menampilkan daftar semua peraturan desa
- Petugas dapat: Tambah (isi `regulation_number`, `title`, `content`, `enacted_date`) / Edit / Hapus
- Peraturan langsung tampil di halaman publik (tidak ada `is_published`)
- Sistem menyimpan ke `village_regulations` dengan `created_by` = user yang login

Catatan: Tidak ada file lampiran di MVP, murni teks.
