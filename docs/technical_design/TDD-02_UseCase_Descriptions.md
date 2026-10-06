# TECHNICAL DESIGN DOCUMENT — BAGIAN 2
## SISTEM INFORMASI DESA - DESA CIBENDA
### Use Case Descriptions

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 2 dari 5 (+ Appendix) |
| Status | v5.1 — Auth & Approval Flow |
| Cakupan | Deskripsi seluruh Use Case aktif MVP (UC-01 s/d UC-24, kecuali yang dipindah ke Appendix) |
| UC Next Dev / Tahap 2 (UC-07, UC-11, UC-12, UC-13) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-01_Overview_Scope_Roles.md`, `TDD-03_Database_Schema.md`, OpenAPI Spec v5.0 |

> **v5.1 — Auth & Approval Flow:** UC-01, UC-03, UC-04c/d, UC-08, UC-14/15/17/22 diperbarui mengikuti plan dan perilaku backend saat ini.
> Referensi kontrak endpoint (request/response, error handling) untuk setiap UC ada di OpenAPI Spec v5.1 — dokumen ini fokus pada alur bisnis.

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
| Aktor | Seluruh pengguna terdaftar |
| Pre-condition | User belum terautentikasi, memiliki akun aktif di sistem |
| Post-condition | User berhasil masuk; session aktif via HttpOnly cookie (Sanctum) |

Main Flow:
1. User membuka halaman login
2. User memasukkan username dan password
3. Sistem memvalidasi format input
4. Sistem memverifikasi kredensial ke database
5. Sistem membuat session token (Sanctum cookie)
6. Sistem membuat sesi cookie Sanctum dan mengembalikan profil user termasuk role, official aktif, dan `must_change_password`
7. Jika `must_change_password=true`, endpoint yang dilindungi mengembalikan 403 berkode `password_change_required` sampai password diganti

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
| Aktor | Pengguna aktif dengan `citizen_id`, termasuk pejabat yang mengajukan untuk dirinya |
| Pre-condition | User sudah login, akun aktif dan terhubung ke citizen; jenis surat tersedia (`template != NULL` + `is_active = true`) |
| Post-condition | Permohonan tersimpan dengan status `pending`, `flow_id` di-snapshot, dan `current_step_order` menunjuk tahap actionable pertama |

Main Flow:
1. Pemohon membuka menu "Ajukan Permohonan Surat"
2. Pemohon memilih jenis surat (hanya tampil yang `template != NULL AND is_active = true`)
3. Sistem menampilkan persyaratan berdasarkan `verification_type` jenis surat:
   - `auto` → sistem otomatis validasi jika NIK warga terdaftar, lanjut submit
   - `manual` → sistem tampilkan checklist persyaratan, warga wajib konfirmasi kelengkapan
   - `document` → sistem tampilkan form upload dokumen pendukung; wajib diisi sebelum submit
4. Sistem mengambil data pemohon dari `auth()->user()->citizen` secara otomatis
5. Pemohon melengkapi form (keperluan, catatan tambahan)
6. Jika `verification_type = document` → pemohon upload dokumen pendukung
7. Warga submit permohonan
8. Sistem memvalidasi semua input (field wajib, format)

> **Catatan (diverifikasi terhadap source 2026-10-06):** `letter_types.verification_type` hanya disimpan sebagai atribut (`LetterType::$fillable`); `StoreLetterRequest`/`LetterService` tidak memberlakukan perilaku `auto`/`manual`/`document` di server, dan `attachments` hanya divalidasi (pdf/jpg/jpeg/png, maks 2048 KB) tanpa disimpan. Langkah 3 dan 6 di atas adalah perilaku yang diharapkan dari sisi klien dan **belum ditegakkan backend** (Planned).
9. Sistem memilih tahap awal: tahap non-final dilewati hanya bila approver aktif tersedia dan seluruh approver eligible adalah pemohon; tahap kosong tidak dilewati. Tahap final tidak pernah dilewati dan harus memiliki approver eligible selain pemohon.
10. Sistem mengambil `letter_types.flow_id` dan meng-*snapshot*-nya ke `letters.flow_id` (dikunci, bukan live-reference — lihat `TDD-03_Database_Schema.md` Section 3)
11. Sistem menyimpan data dalam `DB::transaction()`:
    - `citizen_id` = `auth()->user()->citizen_id`
    - `submitted_by` = `auth()->user()->id` (role apa pun yang memenuhi syarat)
    - NIK dienkripsi AES-256 → `applicant_nik`
    - SHA-256 dari NIK plaintext → `applicant_nik_hash`
    - `status = pending`, `submitted_at = now()`
    - `flow_id` = snapshot, `current_step_order` = tahap actionable pertama
    - Membuat placeholder `letter_approvals` untuk step aktif dengan `approved_by = NULL`, `action = NULL`, dan deadline sesuai setting level
    - INSERT ke `letter_status_logs` (status: pending, actor_id, IP)
12. Sistem men-dispatch notifikasi ke approver tahap awal
13. Sistem menampilkan konfirmasi sukses kepada pemohon

Alternative Flow:
- 6a. Ukuran file dokumen melebihi batas → error "File terlalu besar"
- 8a. Validasi gagal → tampilkan pesan error per field; tidak menyimpan data
- 9a. Tidak ada approver eligible pada tahap final → submit ditolak; pemohon tidak boleh menyetujui suratnya sendiri
- 9b. Jika tahap RT dilewati, RW dan Kadus tidak menerima FYI

---

## UC-04a: RT Approval / Rejection Surat (Tahap 1, Berbasis Wilayah)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04a |
| Nama | RT Approval / Rejection Surat |
| Aktor | RT |
| Pre-condition | RT sudah login; ada surat di wilayahnya yang menunggu tahap RT (`pending` atau `in_progress`) |
| Post-condition | Status surat berubah (`in_progress` / `rejected`), log tercatat, notifikasi terkirim |

Main Flow:
1. RT membuka daftar seluruh surat dari wilayahnya; keputusan hanya tersedia untuk surat yang step aktifnya masih RT
2. RT membuka detail permohonan
3. RT memeriksa data pemohon dan keperluan surat
4. RT memilih tindakan: Setujui atau Tolak
5. RT mengisi catatan keputusan (wajib jika menolak)
6. Sistem memvalidasi bahwa RT berwenang atas wilayah surat ini (via OfficialService, cek `rt_id`)
7. Sistem memproses dalam `DB::transaction()`:
   - Jika SETUJUI: perbarui placeholder approval step RT dengan aktor/aksi; pindahkan `current_step_order` ke step berikutnya, set `status = in_progress`, dan buat placeholder approval berikutnya beserta deadline
   - Jika TOLAK: perbarui placeholder approval RT; set `status = rejected`, `rejected_at_step` = step RT, isi `processed_at` (terminal)
   - INSERT ke `letter_status_logs` (old: pending, new: in_progress/rejected, actor_id, IP)
8. Jika approve pada tahap RT: sistem mengirim FYI ke RW dan Kadus sesuai wilayah surat, serta notifikasi ke tahap berikutnya; tidak ada FYI jika tahap RT dilewati
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
- Jika pejabat RW aktif tidak ditemukan, notifikasi FYI dilewati; tidak ada fallback broadcast dan proses approval tetap berjalan.
- Kadus aktif pada `citizen.hamlet_id` menerima FYI non-blocking untuk surat dari dusunnya; Kadus tidak menjadi approver dan tidak dibuatkan row `letter_approvals`. Jika Kadus aktif tidak ditemukan, notifikasi dilewati.

---

## UC-04c: Kepala Desa / Sekretaris Desa Approval / Rejection Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04c |
| Nama | Keputusan Final Kepala Desa / Sekretaris Desa |
| Aktor | Kepala Desa ATAU Sekretaris Desa (saling menggantikan, first-action-wins) |
| Pre-condition | User sudah login sebagai `kepala_desa` atau `sekretaris_desa`; ada surat berstatus `pending`/`in_progress` dengan `current_step_order` menunjuk ke step `approver_position = 'kepala_desa'` |
| Post-condition | Tahap final mengubah `letters.status` menjadi `approved` atau `rejected`; approval mencatat aktor sebenarnya |

Main Flow:
1. Kades/Sekdes membuka daftar surat yang menunggu keputusan tahap final
2. User membuka detail dan memeriksa riwayat keputusan sebelumnya
3. User memilih Setujui/Tolak, isi catatan jika menolak
4. Sistem mengunci row surat di dalam transaksi dan memeriksa ulang status serta step aktif `kepala_desa`; keputusan kedua ditolak dengan 409.
5. Sistem memperbarui placeholder `letter_approvals` untuk step aktif dengan aktor, level, aksi, dan catatan keputusan.
6. Jika SETUJUI pada step final: tetapkan `letter_number`, hitung `expires_at` dari `validity_days`, lalu status `approved`.
7. Jika TOLAK: status jadi `rejected`, `rejected_at_step` dicatat (TERMINAL).
8. Notifikasi hasil akhir kepada pemohon serta notifikasi siap cetak kepada Kasi/Kaur terkait

Catatan:
1. Keputusan Kades/Sekdes memakai row lock (`lockForUpdate`) di dalam transaksi; keputusan pertama yang berhasil diproses menang dan request berikutnya ditolak dengan 409.
2. Step flow baru hanya memakai posisi `rt` dan `kepala_desa`; Sekdes bertindak sebagai pengganti Kades pada step `kepala_desa` yang sama (first-action-wins).

---

## UC-04d: Notifikasi dan Unduh Surat oleh Kasi/Kaur

Kasi/Kaur bukan approver. Setelah tahap final disetujui, role Kasi/Kaur terkait menerima notifikasi dan dapat membaca/mengunduh surat selesai melalui endpoint daftar/detail surat bersama. Tidak ada endpoint keputusan untuk Kasi/Kaur.

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04d |
| Nama | Notifikasi dan Unduh Surat oleh Kasi/Kaur |
| Aktor | Kasi Pelayanan atau Kaur TU & Umum sesuai `letter_types.assigned_role` |
| Pre-condition | Kasi/Kaur sudah login; surat berstatus `approved` dan role sesuai assignment (NULL berlaku bagi keduanya) |
| Post-condition | Surat dapat dibaca/diunduh tanpa mengubah approval atau statusnya |

Main Flow:
1. Setelah final approve, sistem memilih penerima Kasi/Kaur dari `letter_types.assigned_role`; nilai NULL berarti kedua role.
2. Kasi/Kaur membuka daftar surat selesai sesuai assignment.
3. Kasi/Kaur membaca detail dan mengunduh PDF bila diperlukan.

Authorization:
- Hanya surat approved sesuai assignment dapat diakses Kasi/Kaur
- Tidak tersedia aksi approve/reject bagi Kasi/Kaur

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
    - Kepala Desa / Sekretaris Desa: surat yang menunggu tahap final; surat milik user dikecualikan dari dashboard
    - Kasi/Kaur: surat `approved` sesuai `letter_types.assigned_role`; NULL memberi akses ke kedua role
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
   - Indikator tahap RT / Kades-Sekdes / selesai (RW hanya FYI; Kasi/Kaur bukan tahap flow)
   - Informasi approval RT (jika sudah diproses RT)
   - Informasi notifikasi FYI RW (jika sudah dikirim)
   - Timeline riwayat: setiap perubahan status + timestamp + aktor + catatan + IP
   - Badge 'overdue' jika deadline terlewati
   - Informasi approval Kades/Sekdes (jika sudah diproses)
4. Tombol Download PDF muncul jika status = `approved`. Pemohon (role apa pun) ditolak jika `expires_at` telah lewat; role lain tetap mengikuti Policy.

---

## UC-08: Download Surat (PDF On-Demand)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-08 |
| Nama | Download Surat (PDF On-Demand) |
| Aktor | Pemohon surat (role apa pun), Petugas Desa, approver berwenang, Kasi/Kaur sesuai assignment |
| Pre-condition | User sudah login, surat sudah berstatus `approved` |
| Post-condition | File PDF ter-download (digenerate on-demand, tidak disimpan di server) |

Main Flow:
1. User membuka detail surat berstatus `approved`
2. User menekan tombol "Download Surat PDF"
3. Backend melakukan pengecekan:
   - Jika user adalah pemohon (`submitted_by = user.id`): cek `expires_at` tanpa membedakan role
   - Kasi/Kaur hanya dapat mengakses surat approved yang sesuai `assigned_role`
4. Sistem mengambil template dari `letter_types.template` (HTML Blade)
5. Sistem inject data: nomor surat, data pemohon, keperluan, tanggal
6. Sistem mengambil TTD dan stempel dari Kepala Desa aktif, termasuk jika Sekdes yang menyetujui surat.
7. `barryvdh/laravel-dompdf` generate PDF dari template yang sudah diisi data
8. Sistem mengembalikan binary PDF langsung (tidak disimpan file di server)

Alternative Flow:
- 3a. Status bukan `approved` → tombol Download tidak muncul
- 3b. Pemohon dengan `expires_at` sudah lewat → 403, apa pun role pemohon

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
5. Sistem menyimpan: `nik` (dienkripsi AES-256), `nik_hash` (SHA-256 plaintext, untuk indexing), `address` (disimpan sebagai teks; model tidak memberi cast enkripsi)
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
| Post-condition | Akun/jabatan diperbarui atau password sementara diterbitkan sesuai operasi |

Main Flow:
1. CLI `petugas:first --nik=...` mencari citizen; jika belum ada, Petugas awal memasukkan data wajib citizen beserta desa dan RT. Command membuat atau menggunakan citizen, membuat atau mempromosikan akun, lalu membuat jabatan Petugas Desa dalam satu transaksi. Username otomatis dan password sementara acak ditampilkan sekali; akun wajib menggantinya saat login pertama. Demote dan reset password selanjutnya dilakukan Petugas melalui dashboard.
2. Petugas Desa menjalankan promote, demote, rotate, update non-sensitif, toggle status, atau reset password melalui endpoint yang sesuai.
3. Promote menghubungkan akun warga aktif dengan citizen ke jabatan/wilayah valid; demote dan rotate mengubah akun serta official secara transaksional.
4. Reset password hanya untuk akun non-Petugas Desa selain diri sendiri; password acak 12 karakter ditandai `must_change_password=true` dan hanya ditampilkan sekali.
5. Perubahan jabatan dicatat pada audit activitylog.

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
| Aktor | Warga, RT, RW, Kadus, Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login |
| Post-condition | Sistem menampilkan dashboard sesuai role |

Main Flow:
1. User login → sistem otomatis menampilkan dashboard
2. Sistem mengambil dan menampilkan data sesuai role:

**Dashboard Warga:** Daftar surat yang pernah diajukan beserta status terkini, indikator visual tahap (RT / Kades-Sekdes / selesai; RW hanya FYI dan Kasi/Kaur bukan tahap approval), notifikasi belum dibaca.

**Dashboard RT:** Jumlah surat wilayah (total pending, sudah diproses), daftar surat yang menunggu keputusan RT, notifikasi belum dibaca.

**Dashboard RW:** Bukan "daftar surat menunggu approval" — melainkan "daftar surat yang lewat FYI", read-only, tanpa tombol approve/reject. RW hanya melihat riwayat notifikasi yang pernah diterima.

**Dashboard Kadus:** Daftar read-only surat di dusunnya yang telah disetujui RT (`fyi_letters`) dan jumlah notifikasi belum dibaca; Kadus bukan approver.

**Dashboard Petugas Desa:** Jumlah warga terdaftar, full visibility semua surat (termasuk rejected), jabatan lewat masa dan jabatan berakhir dalam 30 hari (`id`, posisi, nama pejabat, `term_ends_at`), notifikasi belum dibaca.

**Dashboard Kasi/Kaur:** `{role, total_surat_selesai, completed_letters, unread_notifications_count}`; maksimum 20 surat approved terbaru sesuai `assigned_role`, tanpa aksi keputusan.

**Dashboard Kepala Desa / Sekretaris Desa:** Menampilkan surat yang menunggu tahap final, dengan surat milik user dikecualikan.

> Daftar dan detail surat Kadus memakai endpoint bersama. Scope wilayah dibatasi ke dusun pejabat aktif dan hanya mencakup surat yang sudah disetujui RT; `scope=mine` juga tersedia.

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
| Pre-condition | Calon pengguna belum memiliki akun; NIK aktif terdaftar di tabel `citizens` |
| Post-condition | Akun aktif tercipta dan sesi dimulai; respons 201 menampilkan username otomatis |

Main Flow:
1. Warga membuka halaman registrasi
2. Warga mengisi NIK (16 digit), password, dan konfirmasi password
3. Sistem memvalidasi NIK, password, dan rate limit registrasi
4. Sistem generate SHA-256 dari NIK → cari di `citizens.nik_hash`
5. Jika NIK tidak ditemukan → error "NIK tidak terdaftar sebagai warga Desa Cibenda"
6. Jika NIK ditemukan tapi sudah punya akun → error "NIK sudah terdaftar, silakan login"
7. Jika NIK ditemukan dan belum punya akun: INSERT user dengan nama dari citizen, role `warga`, username otomatis unik `namadepan.NNNN`, dan aktif
8. Sistem membuat sesi dan mengembalikan 201 berisi `username` dan `name`
9. User dapat mengganti username melalui `PATCH /api/profile`; email bersifat opsional. Password dapat diganti melalui `PUT /api/profile/password`.

Alternatif Flow:
- Format NIK salah → error "NIK harus 16 digit angka"
- Benturan username otomatis → suffix acak dibuat ulang
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
| Nama | Kelola Setting Deadline Approver |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Setting deadline approval per tahap berhasil diperbarui |

Main Flow:
- Petugas membuka menu "Pengaturan Sistem" → "Deadline Approval"
- Sistem menampilkan setting untuk level approver (`rt`, `kepala_desa`); Sekdes dapat memutuskan pada tahap `kepala_desa`, sedangkan Kasi/Kaur bukan approver dan tidak memiliki setting tahap
- Petugas mengubah `deadline_hours` dan/atau `reminder_hours` per tahap
- Sistem memvalidasi: `deadline_hours > 0`, `reminder_hours < deadline_hours`
- Sistem menyimpan ke `approval_settings` (UNIQUE per `village_id` + `approval_level`)

Catatan: Jika deadline terlewat, surat **tidak** auto-reject — hanya `is_overdue = true` (dihitung saat daftar surat dimuat). Notifikasi reminder otomatis **Belum diimplementasi (Planned)**: tidak ada scheduler/job yang memakai `reminder_hours`/`reminded_at`.

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
