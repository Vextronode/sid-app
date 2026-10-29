# TECHNICAL DESIGN DOCUMENT — BAGIAN 2
## SISTEM INFORMASI DESA - DESA CIBENDA
### Use Case Descriptions

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 2 dari 5 (+ Appendix) |
| Status | v5.3 — Surat dinamis, tanda tangan, identitas desa (diselaraskan ke source 2026-10-16) |
| Cakupan | Deskripsi seluruh Use Case aktif MVP (UC-01 s/d UC-29, kecuali yang dipindah ke Appendix) |
| UC Next Dev / Tahap 2 (UC-07, UC-11, UC-12, UC-13) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-01_Overview_Scope_Roles.md`, `TDD-03_Database_Schema.md`, OpenAPI Spec v5.3 |

> **v5.3:** UC-03 (form dinamis & penanda tangan), UC-04a/04c (surat ditahan, snapshot, notifikasi Terapkan), UC-05/06/08, UC-09 (paginasi), UC-14 (jabatan tanpa akun, foto, reset TTD), UC-16/18/19 (identitas desa, kategori berita), UC-17 (tanggal lahir), UC-21 (field yang dapat diubah) diperbarui. UC baru: **UC-25** Kelola Tanda Tangan & Permintaan Tanda Tangan, **UC-26** Terapkan Perubahan Data Kependudukan dari Surat.
> **Pembaruan 2026-10-18:** UC-16 (bar pengumuman di semua halaman publik, sambutan Kepala Desa, kontak telepon/email yang bisa disalin, Peraturan Desa sebagai section Profil Desa, halaman informasi aktif di produksi, BUMDesa/APBDes "Segera hadir") dan UC-18 (titik kantor berupa koordinat, sambutan Kepala Desa) diperbarui. UC baru: **UC-27** Kelola Pengumuman Beranda, **UC-28** Kelola Halaman Informasi.

> **Pembaruan 2026-10-25:** UC baru **UC-29** Unggah dan Verifikasi Hasil dari Instansi (formulir Layanan Kependudukan).
> Kontrak endpoint ada di OpenAPI Spec v5.3 — dokumen ini fokus pada alur bisnis. Hal yang pernah tertulis tetapi belum ada di source dicatat di `docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md`.

---

## Ringkasan Use Case

Sistem ini mendefinisikan **26 Use Case aktif di MVP**. Total UC yang pernah didefinisikan — termasuk yang dipindah keluar MVP tetapi nomornya dipertahankan — adalah **30 UC**.

| Kategori | Jumlah | Daftar |
|---|---|---|
| ✅ Aktif di MVP | 26 UC | UC-01, 02, 03, 04a (+ sub-flow notif RW/Kadus), 04c, 04d, 05, 06, 08, 09, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28 |
| ❌ Non-MVP (nomor dipertahankan, lihat Appendix) | 4 UC | UC-07, UC-11, UC-12, UC-13 |
| **Total** | **30 UC** | — |

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
- 3a. 5 percobaan gagal per kombinasi `username|IP` → login dikunci 1 jam (RateLimiter)
- 4a. Kredensial salah → pesan error; percobaan gagal dicatat ke log aplikasi (`Log::warning('Failed login attempt')` beserta username, IP, user agent)
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
4. Frontend membersihkan cache data dan mengarahkan user ke beranda/halaman login

> Pencatatan event logout ke audit log **belum diimplementasi** (lihat audit docs).

---

## UC-03: Input Permohonan Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-03 |
| Nama | Input Permohonan Surat |
| Aktor | Pengguna aktif dengan `citizen_id` (warga, atau pejabat untuk dirinya) |
| Pre-condition | Login, akun aktif dan terhubung ke citizen; jenis surat aktif ber-template milik desanya. Bila jenis surat punya slot TTD pemohon, akun sudah membuat tanda tangan (UC-25) |
| Post-condition | Surat `pending` tersimpan dengan `flow_id` di-snapshot; `current_step_order` = 0 (menunggu tanda tangan) atau step actionable pertama |

Main Flow:
1. Pemohon membuka "Ajukan Surat" dan memilih jenis surat (hanya `template != NULL AND is_active = true`, desa yang sama).
2. Frontend membangun form dari `letter_types.form_fields` (text, textarea, date, number, nik, select, file, occupation, repeater, family_members) dan `signature_slots`.
3. Data pemohon (nama, NIK, alamat) diambil otomatis dari citizen akun; `purpose` dan `notes` tidak lagi diisi (keperluan menjadi isian bila diperlukan jenis surat).
4. Pemohon mengisi isian, mengunggah berkas isian bertipe file (PDF/JPG/PNG, atau JPG/PNG bila `accept: image`; maks 2 MB), dan untuk tiap slot pihak lain mengisi NIK penanda tangan **atau** nama + foto dokumen ber-TTD basah.
5. Server memvalidasi isian terhadap definisi jenis surat (isian tak dikenal ditolak; tipe dan wajib diperiksa).
6. Dalam `DB::transaction()` sistem:
   - menyimpan surat (`status = pending`, `submitted_at`, `flow_id` snapshot, NIK terenkripsi + hash) dan log "Permohonan surat dibuat";
   - menyimpan berkas isian ke disk privat (`letter_attachments`, kind `field`);
   - mengisi slot TTD: slot pemohon langsung `signed` dari TTD akun; slot pihak lain → permintaan TTD digital ke pemilik NIK (`pending`, kedaluwarsa 3 hari, notifikasi `signature_requested`); saksi warga desa ber-akun (isian NIK ber-`witness`) → permintaan persetujuan saksi dengan alur yang sama (tanpa TTD) atau TTD basah (`signed`).
7. Bila masih ada slot belum `signed` → `current_step_order = 0` + log "Menunggu tanda tangan pihak terkait"; surat belum terlihat approver. Setelah semua slot terisi (UC-25), langkah 8 dijalankan otomatis.
8. Sistem memilih tahap awal: tahap non-final yang semua pejabat eligible-nya adalah pemohon dilewati (log), dan pemohon Kades/Sekdes selalu melewati tahap RT; surat yang langsung di tahap desa berstatus `in_progress`. Bila RT wilayah pemohon **kosong**, surat ditahan di step RT (log "Surat ditahan…") dan Staf SIDUTama menerima notifikasi `approver_vacant`; bila tahap final tidak punya approver selain pemohon (Kades saat Sekdes kosong, atau sebaliknya), surat ditahan di tahap final dengan notifikasi yang sama.
9. Sistem membuat placeholder `letter_approvals` untuk step aktif (deadline dari `approval_settings`) dan mengirim notifikasi `pending` ke approver.
10. Respons 201 berisi detail surat.

Alternative Flow:
- 5a. Validasi gagal → 422 per field; tidak ada data/berkas tersimpan.
- 6a. TTD pemohon belum dibuat untuk slot `applicant` → 422.
- 6b. NIK penanda tangan = NIK pemohon, pemohon diblokir pemilik NIK, atau sudah 3× ditolak NIK itu dalam 24 jam → 422 dengan pesan seragam ("tidak dapat dikirim saat ini").
- 6c. Kegagalan di tengah transaksi → berkas yang sudah tertulis dihapus.
- 8a. Jika tahap RT dilewati, RW dan Kadus tidak menerima FYI.

> Jenis surat bawaan seeder (A01–A11) belum memakai `signature_slots`; alur tanda tangan aktif begitu developer menambahkan slot pada jenis surat.

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
1. RT membuka daftar seluruh surat dari wilayahnya (berpaginasi); keputusan hanya tersedia untuk surat yang step aktifnya masih RT
2. RT membuka detail permohonan
3. RT memeriksa data pemohon, isian form, lampiran, status tanda tangan, dan dokumen pendukung (bila ada)
4. RT memilih tindakan: Setujui atau Tolak
5. RT mengisi catatan keputusan (wajib jika menolak)
6. Sistem memvalidasi bahwa RT berwenang atas wilayah surat ini (via OfficialService, cek `rt_id`)
7. Sistem memproses dalam `DB::transaction()`:
   - Jika SETUJUI: perbarui placeholder approval step RT dengan aktor/aksi; pindahkan `current_step_order` ke step berikutnya, set `status = in_progress`, dan buat placeholder approval berikutnya beserta deadline
   - Jika TOLAK: perbarui placeholder approval RT; set `status = rejected`, `rejected_at_step` = step RT, isi `processed_at` (terminal)
   - INSERT ke `letter_status_logs` (old: pending, new: in_progress/rejected, actor_id, IP)
8. Jika approve pada tahap RT: sistem mengirim FYI ke RW (`rt_approved_rw_fyi`) dan Kadus (`rt_approved_kadus_fyi`) sesuai wilayah pemohon, notifikasi ke approver berikutnya dan ke pemohon (`rt_approved`); tidak ada FYI jika tahap RT dilewati
9. Jika reject: notifikasi `rt_rejected` ke pemohon (TERMINAL)
10. Sistem menampilkan konfirmasi keputusan ke RT

Authorization:
- Hanya RT yang `rt_id`-nya sesuai dengan wilayah warga pemohon yang boleh approve; RT tidak dapat memutuskan surat miliknya sendiri
- Surat yang ditahan karena RT kosong menunggu sampai Staf SIDUTama menetapkan RT (UC-14); RT baru langsung menerima notifikasi surat yang menunggunya
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
6. Jika SETUJUI pada step final: status `approved`, `letter_number` = `{classification_code}/{NNN}/Des/{bulan Romawi}/{tahun}` (counter per desa + kode klasifikasi + tahun), `expires_at` dari `validity_days`, `processed_at`; lalu **snapshot render** dibekukan (`letters.snapshot`, `signed_by_official_id` = Kepala Desa aktif, juga bila Sekdes yang menyetujui). Jenis surat dengan `issues_letter_number = false` tidak diberi nomor, dan `signed_by_village_head = false` membekukan snapshot tanpa penanda tangan (formulir Layanan Kependudukan).
7. Jika TOLAK: status jadi `rejected`, `rejected_at_step` dicatat (TERMINAL), notifikasi `kepala_desa_rejected`.
8. Notifikasi `letter_approved_final` ke pemohon; Kasi/Kaur sesuai `assigned_role` menerima `letter_needs_fulfillment` (jenis surat ber-`data_action`, lanjut UC-26) atau `letter_ready_for_print`.

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
| Aktor | Kasi Pemerintahan atau Kaur TU & Umum sesuai `letter_types.assigned_role` |
| Pre-condition | Kasi/Kaur sudah login; surat berstatus `approved` dan role sesuai assignment (NULL berlaku bagi keduanya) |
| Post-condition | Surat dapat dibaca/diunduh tanpa mengubah approval atau statusnya |

Main Flow:
1. Setelah final approve, sistem memilih penerima Kasi/Kaur dari `letter_types.assigned_role`; nilai NULL berarti kedua role.
2. Kasi/Kaur membuka daftar surat selesai sesuai assignment.
3. Kasi/Kaur membaca detail dan mengunduh PDF bila diperlukan.
4. Bila surat menandai `needs_fulfillment`, Kasi/Kaur menjalankan UC-26 (Terapkan).

Authorization:
- Hanya surat approved di desanya sesuai assignment dapat diakses Kasi/Kaur
- Tidak tersedia aksi approve/reject bagi Kasi/Kaur

---

## UC-05: Lihat Daftar Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-05 |
| Nama | Lihat Daftar Surat |
| Aktor | Warga, RT, RW, Kadus, Kasi Pemerintahan, Kaur TU & Umum, Staf SIDUTama, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login |
| Post-condition | Daftar surat berpaginasi sesuai scope role dan filter |

Main Flow:
1. User membuka menu Daftar Surat (atau "Surat Saya" dengan `scope=mine`).
2. Backend menerapkan scope role:
    - Warga / `scope=mine`: surat yang diajukan sendiri
    - RT: semua surat warga di RT-nya
    - RW / Kadus: surat di wilayah RW / dusunnya yang sudah di-approve RT (read-only)
    - Kepala Desa / Sekretaris Desa: surat di desanya yang sudah di-approve RT atau melewati tahap RT
    - Kasi/Kaur: surat `approved` sesuai `letter_types.assigned_role` (NULL = keduanya)
    - Staf SIDUTama: semua surat di desanya
3. Filter: status, jenis surat, rentang tanggal (`from`/`to` atau `submitted_from`/`submitted_to` dengan zona waktu klien), pencarian (nama pemohon, nomor surat, nama warga), nama pemohon; paginasi `page`/`per_page` (default 20, maks 100).
4. Sistem menampilkan nomor surat, pemohon, jenis, status, tahap aktif, tanggal, badge overdue (`is_overdue` dihitung saat dimuat), penanda "menunggu tanda tangan" dan "perlu diterapkan".
5. Kartu ringkasan dashboard memakai `GET /letters/summary` (total, per status, overdue, per jenis, per periode hari/minggu/bulan) atas scope yang sama.

---

## UC-06: Lihat Detail & Status Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-06 |
| Nama | Lihat Detail & Status Surat |
| Aktor | Warga, RT, RW, Kadus (read-only), Kasi Pemerintahan, Kaur TU & Umum, Staf SIDUTama, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login, surat sudah ada di sistem |
| Post-condition | Sistem menampilkan detail surat dan seluruh riwayat perubahan status |

Main Flow:
1. User memilih surat dari daftar
2. Sistem mengambil data surat beserta relasi (`letter_type`, `statusLogs`, `approvals`, `attachments`, `signatures`, `flow.steps`); otorisasi LetterPolicy::view
3. Sistem menampilkan:
   - Detail data pemohon (nama, NIK ter-mask, keperluan)
   - Status terkini dengan badge warna (`pending` / `in_progress` / `approved` / `rejected`) — detail "sedang di step mana" dilihat dari `current_step_order` + JOIN ke `flow_steps`
   - Indikator tahap RT / Kades-Sekdes / selesai (RW hanya FYI; Kasi/Kaur bukan tahap flow)
   - Informasi approval RT (jika sudah diproses RT)
   - Informasi notifikasi FYI RW (jika sudah dikirim)
   - Timeline riwayat: setiap perubahan status + timestamp + aktor + catatan + IP
   - Badge 'overdue' jika deadline terlewati
   - Informasi approval Kades/Sekdes (jika sudah diproses)
   - Isian form (`payload`), lampiran (dibuka lewat endpoint terproteksi), status tiap slot tanda tangan
   - Tombol dokumen pendukung bila `has_supporting_document`
4. Jika status = `approved`, popup detail menampilkan pratinjau surat (canvas di dalam popup, tanpa tombol unduh/cetak browser) dan menu **Unduh surat** dengan dua format: TTD & stempel digital, atau untuk tanda tangan basah (area tanda tangan kosong), disertai keterangan "Berlaku sampai {tanggal}" bila `expires_at` terisi. Bila `is_expired`, pratinjau diganti keterangan kedaluwarsa, menu unduh tetap tampil tetapi nonaktif, dan badge "Kedaluwarsa" muncul; surat hanya tersimpan sebagai riwayat. Sebelum terbit, area dokumen menjelaskan status (sedang diproses/ditolak). Backend menolak unduh **dan preview** oleh pemohon (role apa pun) jika `expires_at` telah lewat; role lain mengikuti LetterPolicy::download/view, dan TTD/stempel di pratinjau hanya dipasang untuk surat final bagi pihak yang berhak mengunduh.
5. Bila `awaiting_signatures`, pemohon dapat mengisi ulang slot yang ditolak/kedaluwarsa (UC-25).

---

## UC-08: Download Surat (PDF On-Demand)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-08 |
| Nama | Download Surat (PDF On-Demand) |
| Aktor | Pemohon surat (role apa pun), Staf SIDUTama, approver berwenang, Kasi/Kaur sesuai assignment |
| Pre-condition | User sudah login, surat sudah berstatus `approved` |
| Post-condition | File PDF ter-download (digenerate on-demand, tidak disimpan di server) |

Main Flow:
1. User membuka detail surat berstatus `approved`
2. User menekan tombol "Download Surat PDF"
3. Backend melakukan pengecekan:
   - Jika user adalah pemohon (`submitted_by = user.id`): cek `expires_at` tanpa membedakan role
   - Kasi/Kaur hanya dapat mengakses surat approved yang sesuai `assigned_role`
4. Sistem mengambil konteks render dari **`letters.snapshot`** (dibekukan saat final approve: template, definisi isian, kop & identitas desa, path stempel, nama & path TTD Kepala Desa penanda tangan, tanggal terbit). Surat approved lama tanpa snapshot dibekukan saat unduhan pertama.
5. Sistem mengganti placeholder: nomor surat, data pemohon, kop desa, isian form (diformat: tanggal, rupiah + terbilang, pilihan), slot TTD (`ttd_{slot}`, `nama_ttd_{slot}`); nilai teks di-escape.
6. Template `wet` (default) hanya stempel desa; `digital` juga menempelkan TTD Kepala Desa.
7. `barryvdh/laravel-dompdf` generate PDF; binary dikirim langsung (tidak disimpan).

Alternative Flow:
- 3a. Status bukan `approved` → tombol Download tidak muncul
- 3b. Pemohon dengan `expires_at` sudah lewat → 403, apa pun role pemohon (berlaku juga untuk `GET /letters/{id}/preview`); di UI tombol tampil nonaktif. Staf SIDUTama, Kades/Sekdes, dan Kasi/Kaur yang berwenang tetap dapat mengunduh untuk arsip.
- 3c. `validity_days` jenis surat diubah Petugas (UC-21) → hanya berlaku untuk surat yang final approve setelahnya; `expires_at` surat yang sudah terbit tidak berubah.

**Alasan struktural:** PDF tidak disimpan, tetapi isi surat approved dibekukan lewat snapshot sehingga penggantian Kepala Desa/TTD, perubahan template, atau perubahan data warga tidak mengubah surat yang sudah terbit.

**Sub-flow - Dokumen Pendukung:** bila jenis surat memiliki `supporting_template`, siapa pun yang berhak melihat surat dapat mempratinjau/mengunduh dokumen pendukung (mis. surat pernyataan) yang digenerate dari isian dan tanda tangan, tanpa TTD Kepala Desa.

---

## UC-09: Kelola Data Warga (CRUD Citizens)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-09 |
| Nama | Kelola Data Warga (CRUD Citizens) |
| Aktor | Staf SIDUTama (kelola); Kasi Pemerintahan & Kaur TU & Umum hanya melihat daftar |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Data warga berhasil dibuat / diupdate di tabel `citizens` |

**Main Flow - Tambah Warga:**
1. Staf SIDUTama membuka menu "Data Warga"
2. Petugas memilih "Tambah Warga Baru"
3. Petugas mengisi form:
   - NIK (16 digit numerik), nama lengkap, tempat & tanggal lahir
   - Jenis kelamin, alamat, `rt_id`, `hamlet_id`
   - Status perkawinan, `occupation_id` (pilihan dari daftar pekerjaan desa), agama, pendidikan terakhir, `domicile_status`, `current_domicile`
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
1. Petugas (atau Kasi/Kaur, read-only) membuka menu "Data Warga"
2. Daftar berpaginasi di database (default 20, maks 100 per halaman); dapat dicari berdasarkan nama (case-insensitive) dan difilter bertingkat per Dusun, RW, dan RT (`hamlet_id`, `rw_id`, `rt_id`; RW dan Dusun dibaca lewat RT warga)
3. Sistem menampilkan daftar dengan: nama, NIK ter-mask, wilayah, pekerjaan, KK, status; `total` = jumlah seluruh hasil

> Pencarian berdasarkan NIK pada daftar warga belum diimplementasi (lihat audit docs).

**Catatan perubahan data lewat surat:** perubahan tertentu yang diajukan warga (mis. meninggal dunia, kelahiran anak) masuk lewat jenis surat ber-`data_action` dan diterapkan Kasi/Kaur/Petugas di UC-26; aturan nilainya sama dengan form data warga ini.

**Riwayat perubahan (S-05):** setiap tambah/ubah/hapus warga dan KK, impor Excel, serta survei sosio-ekonomi KK tercatat di activity log (aktor, field yang berubah, nilai lama → baru; NIK, No KK, dan alamat KK disamarkan). Petugas melihatnya di menu **Log Aktivitas** (`/admin/log-aktivitas`), tab *Data Warga & KK*, termasuk data yang sudah dihapus; ikon riwayat di tiap baris warga/KK membuka log yang sudah difilter ke data tersebut. Tab *Surat* pada halaman yang sama menampilkan seluruh perubahan status surat desa (`letter_status_logs`).

**Main Flow - Import Excel:**
1. Petugas memilih "Import Data Warga dari Excel"
2. Petugas upload file Excel (.xlsx / .csv) sesuai template yang disediakan
3. Sistem memvalidasi format file dan header kolom
4. Sistem memproses via `maatwebsite/excel`: validasi per baris (format NIK, duplikat) — **bukan all-or-nothing**, baris gagal di-skip tanpa membatalkan baris valid lainnya; kolom pekerjaan lama belum diproses dan pemetaan nama ke `occupation_id` ditunda
5. Sistem menyimpan data yang valid, skip baris yang error
6. Sistem menampilkan ringkasan: jumlah berhasil, jumlah error beserta detail per baris

Alternative Flow:
- NIK sudah terdaftar → error "NIK sudah ada dalam database warga"
- Format NIK salah → error "NIK harus 16 digit angka"

**Catatan Alur Update KTP/KK:** Staf SIDUTama sifatnya asesor/pencatat administratif, bukan penerbit resmi (penerbitan tetap di Kecamatan/Dukcapil). UC-09 adalah tempat Staf SIDUTama mencatat ulang data yang sudah resmi berubah di Kecamatan — murni pencatatan administratif desa, **bukan** proses penerbitan, **tidak perlu approval flow apapun**, cukup CRUD biasa.

**Main Flow - Kelola Data Keluarga (KK):**
- Staf SIDUTama buka menu "Data Keluarga (KK)"
- Tambah KK baru: input `no_kk`, `family_address`, pilih `rt_id`/`hamlet_id`
- Tambah anggota ke KK: pilih/buat citizen, set `family_role`, FK ke `family_id`
- Sistem otomatis validasi: hanya 1 `family_role='kepala_keluarga'` per `family_id` aktif

**Sub-flow - Kelola Data Sosio-Ekonomi Keluarga:**
- Staf SIDUTama membuka satu data KK dan melihat status survei.
- Petugas mengisi atau memperbarui `household_income_range` dan atribut sosio-ekonomi keluarga lainnya melalui survei per KK.
- Sistem mengisi `surveyed_by` dan `surveyed_at` dari Petugas yang login dan waktu request.
- Survei ulang menimpa data sebelumnya; KK tanpa record berarti belum disurvei.
- Data penghasilan adalah tingkat rumah tangga; periode penghasilan belum ditetapkan. KK tanpa anggota/warga terhubung juga tidak memiliki record terpisah di tingkat individu.

**Sub-flow - Kelola Daftar Pekerjaan Desa:**
- Staf SIDUTama menambah, mengubah nama/urutan, atau menonaktifkan pekerjaan untuk desanya.
- Form warga memilih pekerjaan aktif dari katalog desa melalui `occupation_id`; pekerjaan desa lain dan pekerjaan nonaktif tidak dapat dipilih.
- Pekerjaan yang masih digunakan warga tidak dapat dihapus (HTTP 409); Petugas disarankan menonaktifkannya.

---

## UC-14: Kelola User & Role

| Field | Keterangan |
|---|---|
| Use Case ID | UC-14 |
| Nama | Kelola User & Role |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Akun/jabatan diperbarui atau password sementara diterbitkan sesuai operasi |

Main Flow:
1. CLI `staf-sid:first --nik=...` mencari citizen; jika belum ada, Petugas awal memasukkan data wajib citizen beserta desa dan RT. Command membuat atau menggunakan citizen, membuat atau mempromosikan akun, lalu membuat jabatan Staf SIDUTama dalam satu transaksi. Username otomatis dan password sementara acak ditampilkan sekali; akun wajib menggantinya saat login pertama. Demote dan reset password selanjutnya dilakukan Petugas melalui dashboard.
2. Staf SIDUTama menjalankan promote, demote, rotate, update non-sensitif, toggle status, atau reset password melalui endpoint yang sesuai.
3. Promote menghubungkan akun warga aktif dengan citizen ke jabatan/wilayah valid; demote dan rotate mengubah akun serta official secara transaksional.
4. Reset password hanya untuk akun non-Staf SIDUTama selain diri sendiri; password acak 12 karakter ditandai `must_change_password=true` dan hanya ditampilkan sekali.
5. Perubahan jabatan dicatat pada audit activitylog.

**Sub-flow - Upload / Ganti TTD Kepala Desa:**
- Setelah rotasi jabatan, Staf SIDUTama mengunggah file TTD ke record Kepala Desa aktif yang baru melalui `POST /officials/{official}/signature` (multipart field `signature`).
- File PNG/JPEG/WebP maksimum 5 MB disimpan pada private storage; preview binary melalui `GET` pada endpoint yang sama hanya tersedia bagi Staf SIDUTama desa terkait dan Kepala Desa aktif yang belum mengakhiri masa jabatan.
- Upload ulang mengganti file TTD pada record aktif yang sama. Alur upload terpisah dari operasi rotasi.

**Sub-flow - Penetapan pejabat (promote) & rotasi:**
- Petugas mencari calon lewat NIK (`POST /officials/candidates/lookup`); sistem menilai kelayakan (warga aktif, belum menjabat; jabatan berakun mensyaratkan akun warga aktif).
- Jabatan **berakun** (Kepala Desa, Sekdes, RT, RW, Kadus, Kasi Pemerintahan, Kaur TU & Umum, Staf SIDUTama) ditetapkan ke akun warga dan mengubah `users.role`. Jabatan **tanpa akun** (jenis dari `official_position_types`) ditetapkan ke data warga tanpa mengubah role.
- Foto pejabat **wajib** (PNG/JPG/WebP maks 5 MB, disk publik, tampil di Profil Desa); dapat diganti tanpa rotasi lewat `POST /officials/{official}/photo` dan dihapus lewat `DELETE /officials/{official}/photo` (Profil Desa lalu menampilkan placeholder).
- Jabatan satu-pemegang per wilayah ditolak 409 bila sudah terisi. Semua jabatan berakun satu-pemegang, termasuk Staf SIDUTama (`staf_sid`) yang hanya satu per desa.
- Rotasi: pengganti mengikuti jenis jabatan lama (akun atau data warga), posisi & wilayah disalin. Berlaku juga untuk `staf_sid`, termasuk staf yang merotasi dirinya sendiri: ia langsung menjadi warga dan FE memindahkannya ke dashboard warga tanpa menunggu logout.
- Halaman Pejabat Desa memisahkan pejabat ke empat tabel: Perangkat Desa (Kades, Sekdes, Kasi, Kaur, staf), Kepala Dusun, Ketua RW, dan Ketua RT.

**Sub-flow - Foto Profil Akun Warga:**
- Akun berperan `warga` mengunggah, mengganti, atau menghapus foto profilnya sendiri di halaman Profil (`POST`/`DELETE /profile/photo`).
- Staf SIDUTama dapat mengganti atau menghapus foto akun warga di desanya dari Manajemen User (`POST`/`DELETE /users/{user}/photo`).
- Selama akun menjabat, foto yang dipakai adalah foto pejabat (`officials.photo_img`) yang hanya diatur Staf SIDUTama: jalur mandiri ditolak 403, jalur Petugas untuk akun itu ditolak 422. Setelah kembali menjadi warga, foto akun (`users.photo_img`) dipakai dan dapat diubah lagi.
- Foto tampil di samping nama akun pada header semua dashboard; bila kosong, tampil avatar default.

**Sub-flow - Peran berubah saat sesi masih terbuka:**
- Sesi tidak diputus saat peran berubah, tetapi role dibaca dari DB setiap request: endpoint peran lama ditolak 403 `code: role_forbidden`.
- FE memeriksa ulang akun saat menerima kode itu; bila perannya memang berubah, pengguna dialihkan ke dashboard peran baru.

**Sub-flow - Kelola Jenis Jabatan Tanpa Akun:**
- Petugas menambah jenis jabatan (kode dibuat otomatis dari label dan tidak dapat diubah), mengubah label/urutan/satu-pemegang/aktif, atau menghapus.
- Menonaktifkan ditolak selama masih dijabat; menjadi satu-pemegang ditolak bila dijabat lebih dari 1 orang; hapus ditolak bila pernah dipakai (nonaktifkan saja).

**Sub-flow - Reset Tanda Tangan Akun:**
- Staf SIDUTama mereset TTD pribadi akun di desanya dengan alasan (5-500 karakter). Baris lama ditandai revoked (berkas dipertahankan), dicatat di activity log; pemilik akun dapat membuat TTD baru.

Alternative Flow:
- NIK calon tidak ditemukan di desa → 404; calon tidak memenuhi syarat → `eligible: false` beserta alasan
- Guard: Staf SIDUTama (`staf_sid`, hanya satu per desa) tidak bisa menonaktifkan atau menurunkan dirinya sendiri, dan `staf_sid` aktif tidak boleh kosong. Penggantinya lewat rotasi (boleh dilakukan staf itu sendiri); setelah rotasi ia langsung menjadi warga

> Meski Kadus tetap dicantumkan dalam daftar jabatan yang dikelola di UC-14, Kadus tidak lagi punya relevansi terhadap `flow_steps.approver_position`.

---

## UC-15: Lihat Dashboard & Statistik

| Field | Keterangan |
|---|---|
| Use Case ID | UC-15 |
| Nama | Lihat Dashboard & Statistik |
| Aktor | Warga, RT, RW, Kadus, Kasi Pemerintahan, Kaur TU & Umum, Staf SIDUTama, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login |
| Post-condition | Sistem menampilkan dashboard sesuai role |

Main Flow:
1. User login → sistem otomatis menampilkan dashboard
2. Sistem mengambil dan menampilkan data sesuai role:

**Dashboard Warga:** Daftar surat yang pernah diajukan beserta status terkini, indikator visual tahap (RT / Kades-Sekdes / selesai; RW hanya FYI dan Kasi/Kaur bukan tahap approval), notifikasi belum dibaca.

**Dashboard RT:** Jumlah surat wilayah (total pending, sudah diproses), daftar surat yang menunggu keputusan RT, notifikasi belum dibaca.

**Dashboard RW:** Bukan "daftar surat menunggu approval" — melainkan "daftar surat yang lewat FYI", read-only, tanpa tombol approve/reject. RW hanya melihat riwayat notifikasi yang pernah diterima.

**Dashboard Kadus:** Daftar read-only surat di dusunnya yang telah disetujui RT (`fyi_letters`) dan jumlah notifikasi belum dibaca; Kadus bukan approver.

**Dashboard Staf SIDUTama:** Jumlah warga terdaftar, full visibility semua surat (termasuk rejected), jabatan lewat masa dan jabatan berakhir dalam 30 hari (`id`, posisi, nama pejabat, `term_ends_at`), notifikasi belum dibaca.

**Dashboard Kasi/Kaur:** `{role, total_surat_selesai, completed_letters, unread_notifications_count}`; maksimum 20 surat approved terbaru sesuai `assigned_role`, tanpa aksi keputusan.

**Dashboard Kepala Desa / Sekretaris Desa:** Menampilkan surat yang menunggu tahap final, dengan surat milik user dikecualikan.

**Kartu ringkasan:** semua role memakai `GET /letters/summary` (total, per status, overdue, per jenis, per periode) atas scope daftar suratnya. Statistik gender (`/dashboard/gender-stats`) dan grafik surat mingguan (`/dashboard/letter-stats`) tersedia per scope wilayah.

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
   - Beranda — identitas desa (logo, foto beranda), 5 berita terbaru, statistik publik (jenis surat aktif, jumlah warga aktif, jumlah dusun aktif), sambutan Kepala Desa (hanya bila diisi), dan kontak: telepon & email kantor (diklik untuk disalin), jam layanan, alamat dengan link "Buka di peta" ke Google Maps (dari titik koordinat kantor)
   - Pengumuman — bar di bawah header yang menempel di **semua** halaman publik selama pengumuman masih tayang (UC-27); "Baca selengkapnya" membuka isi dan link
   - Profil Desa — sejarah (foto di samping teks), visi misi, luas wilayah, statistik, **Peraturan Desa** (section `#peraturan-desa`; `/peraturan-desa` diarahkan ke sana), perangkat desa (Kepala Desa, Sekdes, grup Kasi/Kaur/Staf termasuk slot kosong dan Staf SIDUTama di urutan terakhir, Kepala Dusun per dusun) dengan foto
   - BPD (`/bpd`) dan Lembaga Desa (`/lembaga-desa`, tab LPM/Karang Taruna/PKK tersimpan di `?lembaga=`; BUMDesa tampil "Segera hadir" dan tidak bisa dipilih) — bagan Ketua, Wakil Ketua, dan Anggota dengan foto; diakses dari dropdown "Tentang Desa" (Transparansi APBDes tampil "Segera hadir")
   - Berita — berita yang sudah dipublikasikan beserta kategorinya (10 per halaman)
   - Info Jenis Surat — daftar jenis surat yang tersedia beserta persyaratannya
   - Halaman informasi — Kebijakan Privasi, Aksesibilitas, PPID (link di footer). Teks baku dari aplikasi; bagian khas desa dari UC-28 dan identitas desa. Isian yang belum diisi tampil sebagai penanda kuning `[...]`; telepon/email bisa disalin
   - Hubungi Kami — nomor WA dari `officials` dengan `position IN ('kasi_pemerintahan', 'kaur_tu_umum')` yang `is_active=true`
4. Semua konten halaman publik hanya dapat dibaca (read-only)

Notes:
- Konten diambil dari `villages`, `news` (`is_published = true`), `letter_types` (aktif ber-template), `village_regulations`, `officials` aktif, anggota aktif `village_org_members`, `announcements` yang belum lewat `expires_at`, dan `village_info_pages`
- Tidak ada konten khusus mode development: tampilan dev dan produksi sama
- Tombol akun di header bertuliskan "Masuk", atau "Dashboard Saya" bila pengunjung sudah login
- Respons di-cache per desa 10 menit dan digugurkan otomatis saat data sumber berubah
- Instalasi multi-desa wajib `village_code`; instalasi satu desa tidak
- Tidak ada data sensitif warga (NIK, kontak pejabat selain WA Kasi/Kaur) yang ditampilkan

---

## UC-17: Register Akun Warga

| Field | Keterangan |
|---|---|
| Use Case ID | UC-17 |
| Nama | Register Akun Warga |
| Aktor | Calon pengguna (Warga Cibenda) |
| Pre-condition | Calon pengguna belum memiliki akun; NIK aktif terdaftar di tabel `citizens` |
| Post-condition | Akun aktif tercipta; respons 201 menampilkan username otomatis. Register tidak membuat sesi — warga login dengan username (UC-01) |

Main Flow:
1. Warga membuka halaman registrasi
2. Warga mengisi NIK (16 digit), tanggal lahir, password, dan konfirmasi password
3. Sistem memvalidasi input dan rate limit registrasi (5/menit per IP, 10/jam per hash NIK)
4. Sistem generate SHA-256 dari NIK → cari di `citizens.nik_hash`
5. Jika NIK tidak ditemukan → error "NIK tidak terdaftar sebagai warga Desa Cibenda"
6. Jika NIK ditemukan tapi sudah punya akun → error "NIK sudah terdaftar, silakan login"
6a. Jika tanggal lahir tidak sama dengan `citizens.date_of_birth` → error "Tanggal lahir tidak sesuai dengan data kependudukan" (verifikasi kedua selain NIK)
7. Jika NIK ditemukan, tanggal lahir cocok, dan belum punya akun: INSERT user dengan nama dari citizen, role `warga`, username otomatis unik `namadepan.NNNN`, dan aktif
8. Sistem memicu event `Registered` dan mengembalikan 201 berisi `username` dan `name` (tanpa membuat sesi)
9. User dapat mengganti username melalui `PATCH /api/profile`; email bersifat opsional. Password dapat diganti melalui `PUT /api/profile/password`.

Alternatif Flow:
- Format NIK salah → error "NIK harus 16 digit angka"
- Benturan username otomatis → suffix acak dibuat ulang
- Password terlalu lemah → error dengan panduan password

> **Catatan penting:** Tidak ada kategori "warga Non-NIK". Setiap warga tercatat (baik lokal maupun pendatang) selalu punya NIK terverifikasi di `citizens` — pembeda lokal/pendatang murni kolom `residency_type`, bukan tabel/jalur terpisah. Warga yang belum tercatat di `citizens` (baik lokal maupun pendatang) harus dicatat lebih dulu oleh Staf SIDUTama (UC-09) sebelum bisa register.

---

## UC-18: Kelola Profil Desa

| Field | Keterangan |
|---|---|
| Use Case ID | UC-18 |
| Nama | Kelola Profil Desa |
| Aktor | Staf SIDUTama (saja) — Kepala Desa dan Sekretaris Desa **tidak termasuk** |
| Pre-condition | User sudah login |
| Post-condition | Data profil desa berhasil diperbarui dan tampil di halaman publik |

Main Flow:
1. User membuka menu "Profil Desa"
2. Sistem menampilkan data profil desa saat ini: nama, kode, nama Kepala Desa, alamat, telepon, email, kecamatan/kabupaten/provinsi/kode pos (kop surat), luas wilayah (ha), sejarah, visi, misi, jam layanan, titik kantor (koordinat), sambutan Kepala Desa (opsional), kredit foto, logo, foto beranda, dan indikator stempel.
3. User mengubah data profil lalu menyimpan (gambar diunggah lewat operasi terpisah). Data kop surat dipakai PDF; identitas dipakai header/footer aplikasi dan halaman publik.
3b. Titik kantor diisi dengan menempel koordinat (`lat, lng`) atau link Google Maps, termasuk short link `maps.app.goo.gl`. Link diurai server (`POST /villages/profile/resolve-map-link`): redirect diikuti hanya ke host Google Maps, lalu titik pin diambil dan diisikan ke form sebelum disimpan sebagai `latitude`/`longitude`. Link "Buka di peta" di beranda dibuat dari koordinat ini.
3a. Logo (maks 2 MB) dan foto beranda (maks 5 MB) diunggah terpisah, disimpan di disk publik setelah dioptimasi (diperkecil, WebP); unggahan lama dihapus, aset bawaan seeder tidak disentuh.
4. Untuk menambah atau mengganti stempel, User mengunggah file PNG/JPEG/WebP maksimum 5 MB melalui operasi upload terpisah.
5. File disimpan di private storage; API menyimpan path dan menyediakan preview binary melalui endpoint yang memerlukan autentikasi serta scope Staf SIDUTama pada desanya.
6. Sistem menampilkan konfirmasi; profil publik hanya menerima indikator `has_stamp_img`, bukan path private atau URL file.

Alternatif Flow:
- Field wajib kosong (nama desa, nama Kepala Desa) → error validasi per field
- Koordinat hanya salah satu (lat tanpa lng) atau di luar rentang → 422
- Link bukan Google Maps atau titiknya tidak ditemukan → 422 "Titik lokasi tidak ditemukan dari link ini"
- Stempel belum tersedia → indikator bernilai `false`; endpoint preview memberi 404.
- File bukan PNG/JPEG/WebP atau melebihi 5 MB → 422.

Notes:
- Domain CMS (Profil Desa, Berita, Peraturan Desa) dimiliki **eksklusif** oleh `staf_sid`. Kepala Desa dan Sekretaris Desa **tidak** memiliki akses ke domain ini meski keduanya adalah approver aktif di domain surat — dua domain ini terpisah tegas.
- Tidak ada approval bertingkat; perubahan langsung tersimpan
- Upload stempel terpisah dari rotasi jabatan; alur upload TTD Kepala Desa dijelaskan pada UC-14.

---

## UC-19: Kelola Berita / Informasi

| Field | Keterangan |
|---|---|
| Use Case ID | UC-19 |
| Nama | Kelola Berita / Informasi |
| Aktor | Staf SIDUTama (saja) — Kepala Desa dan Sekretaris Desa **tidak termasuk** |
| Pre-condition | User sudah login |
| Post-condition | Berita/pengumuman berhasil dibuat/diperbarui/dihapus; konten tampil di halaman publik jika dipublikasikan |

**Main Flow - Tambah Berita:**
1. User membuka menu "Berita & Informasi" → "Tambah Berita Baru"
2. User mengisi form: judul (wajib), konten (wajib), 1-2 kategori berita (wajib), thumbnail (opsional, maks 2 MB), status Draft/Publikasikan
3. Sistem generate slug otomatis dari judul
4. Sistem memvalidasi: judul & konten wajib diisi, slug unik
5. Sistem menyimpan ke tabel `news` (`author_id` = user login, `is_published`, `published_at` jika langsung dipublikasikan)
6. Jika `is_published = true` → berita langsung tampil di halaman publik (UC-16)

**Main Flow - Edit / Hapus Berita:** Toggle status Draft ↔ Publikasikan; hapus = soft delete, berita tidak lagi tampil di publik.

**Main Flow - Lihat Daftar Berita:** Semua berita (Draft & Publikasi) milik desa, dapat difilter berdasarkan status (`draft`/`published`). Filter periode belum diimplementasi.

**Sub-flow - Kelola Kategori Berita:** tambah/ubah nama (slug otomatis, unik per desa), hapus hanya bila belum pernah dipakai berita (termasuk berita yang sudah dihapus); kategori menampilkan jumlah pemakaian. Seeder menyediakan 8 kategori default.

Alternatif Flow:
- Judul kosong → error "Judul berita wajib diisi"
- Slug sudah digunakan → sistem generate slug alternatif otomatis (suffix angka)

---

## UC-20: Kelola Struktur Wilayah (Dusun / RW / RT)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-20 |
| Nama | Kelola Struktur Wilayah |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
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
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Konfigurasi tipe surat berhasil diperbarui |
| Catatan Penting | Template HTML dan form field adalah developer-only via seeder. Tambah/hapus/ubah template → Next Dev Paket 1 (lihat Appendix). |

Main Flow:
- Petugas membuka pengaturan jenis surat lewat menu **Alur & Jenis Surat** (`/admin/alur-persetujuan`); daftar berasal dari `GET /letter-types?include_inactive=1` (khusus Staf SIDUTama) yang berisi semua jenis surat desa dengan badge Draft / Aktif / Nonaktif
- Petugas mengubah: `validity_days` (minimal 1 atau kosong), `category` (Persuratan Desa / Layanan Kependudukan; menentukan kelompok di pilihan pengajuan dan petugas: Kaur TU & Umum / Kasi Pemerintahan), toggle `is_active` (Aktifkan / Nonaktifkan). Jenis Draft (belum ber-template) tidak bisa diaktifkan (422)
- Sistem menyimpan perubahan ke `letter_types` dan menggugurkan cache halaman publik
- Petugas dapat melihat flow approval (read-only) di halaman Approval Flows

> Flow, template, isian form, slot tanda tangan, aksi data, dokumen pendukung, dan kode klasifikasi diset developer lewat seeder; tidak ada endpoint untuk mengubahnya. Daftar untuk warga (`GET /letter-types` tanpa parameter) tetap hanya jenis aktif ber-template.

---

## UC-22: Kelola Setting Deadline Approval

| Field | Keterangan |
|---|---|
| Use Case ID | UC-22 |
| Nama | Kelola Setting Deadline Approver |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Setting deadline approval per tahap berhasil diperbarui |

Main Flow:
- Petugas membuka menu "Pengaturan Sistem" → "Deadline Approval"
- Sistem menampilkan setting untuk level approver (`rt`, `kepala_desa`); Sekdes dapat memutuskan pada tahap `kepala_desa`, sedangkan Kasi/Kaur bukan approver dan tidak memiliki setting tahap
- Petugas mengubah `deadline_hours` dan/atau `reminder_hours` per tahap
- Sistem memvalidasi: `deadline_hours > 0`, `reminder_hours < deadline_hours`
- Sistem menyimpan ke `approval_settings` (UNIQUE per `village_id` + `approval_level`)

Catatan: Jika deadline terlewat, surat **tidak** auto-reject — hanya `is_overdue = true` (dihitung saat daftar surat dimuat). Pengingat dikirim sekali per tahap per surat ke approver berwenang (in-app + Web Push) saat `now() >= deadline_at - reminder_hours` (0 = tepat saat deadline); `reminded_at` diisi. Dijalankan `approvals:send-reminders` tiap 5 menit lewat scheduler; nilai `reminder_hours` dibaca saat run sehingga perubahan Petugas langsung berlaku untuk surat yang sedang menunggu. Setting `is_active = false` tidak mengirim pengingat; tidak ada notifikasi overdue terpisah.

---

## UC-23: Kelola Data Organisasi Desa (BPD, LPM, Karang Taruna, PKK)

| Field | Keterangan |
|---|---|
| Use Case ID | UC-23 |
| Nama | Kelola Data Organisasi Desa |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Susunan Ketua, Wakil Ketua, dan Anggota organisasi tersimpan beserta riwayatnya; halaman publik ikut diperbarui |
| Catatan | Struktur tetap: setiap organisasi punya tiga slot (`slot`): `ketua` dan `wakil_ketua` (satu pemegang, dirotasi) serta `anggota` (jumlah bebas). Slot dibuat otomatis saat daftar dibuka dan tidak dapat dibuat, diubah, atau dihapus lewat API. `bumdes` masih ada di enum `org_type` tetapi tidak dikelola di UI. Rotasi dapat dimatikan per slot dengan `is_active=false` (403 "menunggu konfirmasi desa"). |

Main Flow:
1. Petugas membuka menu "Organisasi BPD" (`/admin/organisasi/bpd`) atau "LPM/Karang Taruna/PKK" (`/admin/organisasi/lembaga`, satu tab per lembaga). Sistem menampilkan kartu Ketua dan Wakil Ketua beserta riwayatnya, serta tabel Anggota (`GET /village-org-positions?org_type=`).
2. **Isi/Ganti Ketua atau Wakil Ketua** (`POST /village-org-positions/{position}/members`): pengisi berupa orang baru (nama, WA, foto opsional) atau anggota/wakil aktif organisasi yang sama (`from_member_id`, promosi: jabatan lamanya diakhiri dan nama/WA/foto disalin). Bila slot sudah terisi, pemegang lama diakhiri (`previous_holder=end`, masuk riwayat) atau dipindah menjadi Anggota (`previous_holder=to_member`). Semua langkah dalam satu transaksi, sehingga Ketua dan Wakil dapat ditukar dalam satu aksi.
3. **Kosongkan / turunkan** pemegang Ketua/Wakil (`POST /village-org-positions/{position}/members/{id}/end`, opsional `to_member=true` agar dicatat sebagai Anggota).
4. **Anggota**: tambah, ubah (nama, WA, catatan), dan hapus anggota; anggota dapat dijadikan Ketua/Wakil dari tabel.
5. **Foto**: unggah/ganti (`POST .../members/{id}/photo`, PNG/JPG/WebP maks 5 MB, disk publik) dan hapus (`DELETE .../members/{id}/photo`). Berkas foto hanya dihapus bila tidak dipakai baris lain (riwayat hasil promosi berbagi berkas yang sama).

Alternative Flow:
- Pemegang aktif Ketua/Wakil dihapus langsung → 422; harus dikosongkan atau diganti dulu. Baris riwayat boleh dihapus.
- `from_member_id` dari organisasi/desa lain, dari slot yang sama, atau sudah tidak aktif → 422.
- `/end` pada slot Anggota atau pemegang yang sudah berakhir → 422.
- Slot milik desa lain → 404.

Notes:
- Struktur tampil di halaman publik `/bpd` dan `/lembaga-desa` (UC-16) lewat `GET /public/village-orgs/{orgType}`: hanya nama dan foto; WA dan catatan tidak dipublikasikan.

---

## UC-24: Kelola Peraturan Desa

| Field | Keterangan |
|---|---|
| Use Case ID | UC-24 |
| Nama | Kelola Peraturan Desa |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Peraturan desa berhasil dibuat/diperbarui/dihapus |

Main Flow:
- Petugas membuka menu "Peraturan Desa" — sistem menampilkan daftar semua peraturan desa
- Petugas dapat: Tambah (isi `regulation_number`, `title`, `content`, `enacted_date`) / Edit / Hapus
- Peraturan langsung tampil di halaman publik (tidak ada `is_published`)
- Sistem menyimpan ke `village_regulations` dengan `created_by` = user yang login

Catatan: Tidak ada file lampiran di MVP, murni teks.

---

## UC-25: Kelola Tanda Tangan & Permintaan Tanda Tangan

| Field | Keterangan |
|---|---|
| Use Case ID | UC-25 |
| Nama | Kelola Tanda Tangan Pribadi & Permintaan Tanda Tangan |
| Aktor | Semua pengguna login (pemilik akun, pemohon surat, pemilik NIK yang dimintai tanda tangan) |
| Pre-condition | User sudah login |
| Post-condition | TTD pribadi tersimpan; slot tanda tangan surat terisi / ditolak; surat lanjut ke approval bila semua slot terisi |

**Main Flow - Buat Tanda Tangan Pribadi:**
1. User membuka profil → Tanda Tangan.
2. User mengunggah gambar TTD (PNG/JPG, maks 512 KB). Sistem menyimpan berkas terenkripsi di disk privat.
3. TTD tidak dapat diubah sendiri (409 bila sudah ada); reset hanya oleh Staf SIDUTama (UC-14).

**Main Flow - Menanggapi Permintaan Tanda Tangan:**
1. Pemilik NIK menerima notifikasi `signature_requested` dan membuka daftar permintaan (`GET /signature-requests`): jenis surat, nama pemohon, label slot, batas waktu.
2. **Setujui:** pemilik memasukkan kata sandi; TTD pribadinya dibubuhkan ke slot (status `signed`); pemohon menerima `signature_accepted`.
3. **Tolak:** opsional catatan dan opsi blokir pemohon; slot `rejected`; pemohon menerima `signature_rejected` tanpa identitas penolak.
4. Bila semua slot surat sudah `signed`, surat otomatis masuk tahap approval pertama (UC-03 langkah 8).

**Main Flow - Pemohon Mengisi Ulang Slot:**
1. Selama surat `pending` dengan `current_step_order = 0`, pemohon dapat meminta ke NIK lain atau mengunggah foto dokumen ber-TTD basah (nama penanda tangan wajib).
2. Permintaan yang masih menunggu pada slot itu dibatalkan (`cancelled`).

**Main Flow - Kelola Blokir:** pemilik melihat daftar akun yang diblokir dan dapat mencabut blokir.

Alternative Flow:
- Kata sandi salah → 422; belum punya TTD pribadi → 422
- Permintaan sudah kedaluwarsa/dibatalkan → 409
- Permintaan bukan untuk NIK akun ini → 404
- Pemohon diblokir atau sudah 3 kali ditolak NIK yang sama dalam 24 jam → permintaan baru ditolak dengan pesan seragam

---

## UC-26: Terapkan Perubahan Data Kependudukan dari Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-26 |
| Nama | Terapkan Perubahan Data Kependudukan |
| Aktor | Kasi Pemerintahan / Kaur TU & Umum sesuai `assigned_role` (NULL = keduanya), termasuk untuk surat miliknya sendiri (status log "… oleh pemohon sendiri"); Staf SIDUTama tidak menjalankan Terapkan (bila jabatan yang ditugaskan kosong, Staf menerima notifikasi `handler_vacant` untuk mengisinya) |
| Pre-condition | Surat `approved` di desa aktor; jenis surat memiliki `data_action` = `update_citizen`, `create_citizen`, `deactivate_members`, atau `manual`; belum pernah diterapkan; bila jenisnya `requires_result_upload`, hasil dari instansi sudah diterima (UC-29) |
| Post-condition | Data `citizens` diubah/ditambah; `letters.fulfilled_at/by` dan `fulfillment` terisi; jejak audit tercatat |

Main Flow:
1. Aktor menerima notifikasi `letter_needs_fulfillment` dan membuka surat yang ditandai "perlu diterapkan".
2. Sistem menampilkan usulan: per kolom `data_fields` nilai sekarang (untuk update) dan nilai usulan dari isian warga; kolom bernilai tetap ditandai tidak dapat dikoreksi. Bila subjek bukan pemohon (`data_subject_field`, mis. NIK almarhum), sistem menampilkan apakah warga ber-NIK itu ditemukan.
3. Aktor mengoreksi nilai bila perlu (termasuk NIK subjek) lalu menekan **Terapkan**.
4. Sistem mengunci surat, memvalidasi nilai dengan aturan yang sama seperti form data warga, lalu:
   - `update_citizen`: mengubah kolom yang diizinkan pada warga subjek; bila `is_active` menjadi false (mis. meninggal), akun login warga itu ikut dinonaktifkan dan sesinya dicabut;
   - `create_citizen`: menambah warga baru (mewarisi RT, dusun, KK, alamat pemohon bila tidak diisi);
   - `deactivate_members`: menonaktifkan anggota KK yang dipilih pemohon (isian `family_members`) beserta akun login mereka; yang sudah nonaktif dilewati;
   - `manual`: tidak mengubah data. Aktor mengikuti petunjuk `data_instructions`, memperbarui data sendiri di Data Penduduk/KK (mis. susunan KK baru dari Disdukcapil), lalu menekan **Tandai selesai** dengan catatan opsional.
5. Sistem mencatat hasil di `letters.fulfillment`, status log "Perubahan data kependudukan diterapkan", activity log `citizen` (`letter_fulfilled`), dan mengirim notifikasi `letter_fulfilled` ke pemohon.

Alternative Flow:
- Kolom di luar definisi jenis surat → 422
- NIK subjek tidak ditemukan di desa → 422 (`subject_nik`)
- Surat belum approved atau sudah diterapkan → 409
- Hasil dari instansi belum diterima (jenis `requires_result_upload`) → 409

Contoh jenis surat bawaan: **A07 Surat Keterangan Penguburan** (`update_citizen`, menonaktifkan data almarhum) dan **A08 Surat Keterangan Kelahiran** (`create_citizen`, menambah data anak).

---

## UC-27: Kelola Pengumuman Beranda

| Field | Keterangan |
|---|---|
| Use Case ID | UC-27 |
| Nama | Kelola Pengumuman Beranda |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Pengumuman tayang di bar halaman publik sampai waktunya habis, atau dihapus |

Main Flow:
1. Petugas membuka menu "Pengumuman" (`/admin/pengumuman`). Sistem menampilkan pengumuman yang sedang tayang beserta waktu berakhir dan sisa waktunya, atau keadaan kosong.
2. Petugas mengisi judul (wajib, maks. 150), isi (opsional, maks. 1000), link (opsional; `https://...` atau path internal seperti `/berita/12`), dan **lama tayang wajib**: 1 jam, 12 jam, 1 hari, 1 minggu, atau "Lainnya" (angka 1–999 + jam/hari/minggu, total maks. 1 tahun).
3. Sistem menyimpan pengumuman dengan `expires_at = sekarang + durasi` (`PUT /announcement`). **Satu pengumuman per desa**: menyimpan menggantikan yang lama.
4. Pengumuman tampil di bar halaman publik (UC-16) sampai `expires_at`.
5. Petugas dapat mengubah pengumuman yang masih tayang; bila durasi tidak dipilih ulang, waktu berakhir dipertahankan. Petugas dapat menghapusnya (`DELETE /announcement`).

Alternatif Flow:
- Durasi tidak dipilih saat membuat → 422
- Link bukan `https://` atau path internal → 422
- Durasi lebih dari satu tahun → 422

Notes:
- Pengumuman yang lewat waktu tidak dibaca lagi (query hanya mengambil yang aktif) dan barisnya dihapus perintah terjadwal `announcements:prune` tiap menit (`schedule:work`). Tidak memakai queue.
- Bar di browser juga hilang tepat saat waktunya habis tanpa perlu memuat ulang halaman.
- Penghapusan permanen; tidak ada arsip pengumuman.

---

## UC-28: Kelola Halaman Informasi

| Field | Keterangan |
|---|---|
| Use Case ID | UC-28 |
| Nama | Kelola Halaman Informasi |
| Aktor | Staf SIDUTama |
| Pre-condition | Staf SIDUTama sudah login |
| Post-condition | Isian khas desa pada halaman PPID, Kebijakan Privasi, atau Aksesibilitas tersimpan dan tampil di halaman publik |

Main Flow:
1. Petugas membuka menu "Halaman Informasi" (`/admin/halaman-informasi`). Sistem menampilkan tab PPID, Kebijakan Privasi, dan Aksesibilitas beserta isian dan skemanya (`GET /info-pages`).
2. Petugas mengisi field tunggal (teks, email, tanggal) dan field daftar yang bisa ditambah, dihapus, dan diurutkan. Contoh: PPID Desa dan atasannya, dasar penetapan, daftar informasi berkala/serta-merta/setiap saat/dikecualikan, pengelola server dan jangka waktu penyimpanan data, keterbatasan aksesibilitas, jangka waktu tanggapan.
3. Petugas menyimpan per halaman (`PUT /info-pages/{page}`). Butir daftar kosong dan kunci yang tidak dikenal dibuang.
4. Halaman publik (`GET /public/info-pages/{page}`) memakai isian ini; isian yang masih kosong tampil sebagai penanda kuning `[...]`.

Alternatif Flow:
- Format email/tanggal salah, teks lebih dari 300 karakter, atau daftar lebih dari 30 butir → 422
- Halaman di luar ketiga halaman tersebut → 404

Notes:
- Skema field didefinisikan di `App\Support\InfoPageFields`; teks baku halaman ada di frontend.
- Nama, kecamatan, kabupaten, provinsi, telepon, jam layanan, dan email kantor diambil dari Profil Desa (UC-18), bukan diisi ulang di sini. Email khusus yang kosong memakai email kantor desa.

---

## UC-29: Unggah dan Verifikasi Hasil dari Instansi

| Field | Keterangan |
|---|---|
| Use Case ID | UC-29 |
| Nama | Unggah dan Verifikasi Hasil dari Instansi |
| Aktor | Pemohon (unggah); Kasi Pemerintahan / Kaur TU & Umum sesuai `assigned_role`, termasuk hasil suratnya sendiri (verifikasi) |
| Pre-condition | Surat `approved`; jenis surat `requires_result_upload = true` (formulir Layanan Kependudukan yang dibawa ke instansi luar, mis. Disdukcapil) |
| Post-condition | Unggahan tercatat di `letter_results` dengan berkas `letter_attachments` (`kind = result`); bila diterima, Terapkan (UC-26) dapat dijalankan |

Main Flow:
1. Setelah final approve, pemohon menerima notifikasi untuk mengunduh formulir, membawanya ke instansi, lalu mengunggah hasilnya. Jalur tahapan di Surat Saya bertambah "Unggah hasil" dan "Verifikasi".
2. Pemohon membuka detail surat yang sama dan mengunggah 1–5 berkas (PDF/JPG/PNG, maks 2 MB) sesuai `result_upload_hint` (`POST /letters/{letter}/results`). Tidak ada permohonan ulang.
3. Sistem mencatat unggahan berstatus `submitted`, status log "Hasil dari instansi diunggah pemohon", dan memberi notifikasi `letter_result_submitted` ke Kasi/Kaur yang ditugaskan.
4. Kasi/Kaur membuka surat, memeriksa berkas, lalu **Terima** atau **Tolak** dengan alasan (`PATCH /letters/{letter}/results/{result}`).
5. Diterima: pemohon mendapat notifikasi `letter_result_accepted`; bila jenis surat memiliki `data_action`, surat ditandai perlu diterapkan (UC-26). Ditolak: pemohon mendapat notifikasi `letter_result_rejected` beserta alasannya dan dapat mengunggah ulang (kembali ke langkah 2).

Alternative Flow:
- Bukan pemohon, atau masih ada unggahan yang menunggu verifikasi/sudah diterima → 403
- Tanpa berkas, lebih dari 5 berkas, atau format/ukuran salah → 422
- Menolak tanpa alasan → 422
- Memutus unggahan yang bukan terakhir atau sudah diverifikasi → 409
- Kasi/Kaur yang tidak ditugaskan pada jenis surat → 403
