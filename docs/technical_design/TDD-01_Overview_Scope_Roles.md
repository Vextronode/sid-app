# TECHNICAL DESIGN DOCUMENT — BAGIAN 1
## SISTEM INFORMASI DESA - DESA CIBENDA
### Overview, Ruang Lingkup, dan Pengguna Sistem

> **v5.3 — Surat dinamis, tanda tangan, identitas desa (2026-10-16):** jenis surat data-driven (isian form, aksi data, slot TTD, kode klasifikasi), tanda tangan pihak terkait, snapshot surat saat final approve, Terapkan perubahan data oleh Kasi/Kaur, Web Push, jabatan tanpa akun yang dikelola desa, kategori berita, identitas desa dari DB. Kategori surat (`letter_categories`) dan `verification_type` sudah dihapus dari source.

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 1 dari 5 (+ Appendix) |
| Status | v5.3 — mencerminkan state source per 2026-10-16, bukan riwayat perubahan |
| Cakupan | Latar belakang & tujuan sistem, ruang lingkup MVP, pengguna & role |
| Riwayat versi lengkap (v1–v4.2) | Lihat `TDD-06_Appendix.md` |
| Fitur Next Dev / Tahap 2 (detail lengkap) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-02_UseCase_Descriptions.md`, `TDD-03_Database_Schema.md`, `TDD-04_Security_NFR_Compliance.md`, `TDD-05_Roadmap_Risks_OpenQuestions.md`, OpenAPI Spec v5.3 (`openapi.yaml`), `SID-ARCH-SYS-001`, `SID-ARCH-BE-001`, `SID-ARCH-FE-001` |

> **Catatan status dokumen:** TDD ini pernah mengalami periode di mana skema sudah dipatch ke v5.0 tapi sebagian catatan status/technical debt belum ikut diperbarui (contoh: ENUM `approval_settings.approval_level`, lihat `TDD-03_Database_Schema.md`). Bagian 1–5 dokumen ini sudah dikoreksi untuk selaras dengan kode/migration yang berjalan saat ini. Jika menemukan dokumen lain (OpenAPI spec, dokumen arsitektur) yang tampak berbeda, anggap kode/migration sebagai sumber kebenaran tertinggi, baru OpenAPI spec, baru dokumen ini.

---

## 1. Latar Belakang & Tujuan Sistem

Pengelolaan administrasi surat dan data kependudukan di desa masih sering dilakukan secara manual atau menggunakan sistem yang tidak terintegrasi. Hal ini mengakibatkan proses yang lambat, rawan kehilangan data, serta sulitnya pelacakan status dokumen oleh pihak desa.

Sistem Informasi Desa (SID) dibangun sebagai platform digital terpadu yang mempermudah administrasi desa, dirancang dengan prinsip modular sehingga dapat dikembangkan secara bertahap sesuai kebutuhan.

**Tujuan Sistem**

- Menyediakan layanan dasar administrasi surat secara digital
- Memungkinkan pengelolaan data desa secara terpusat
- Membangun arsitektur yang dapat dikembangkan (scalable) sesuai kebutuhan
- Menjamin integritas data melalui mekanisme blockchain-inspired hashing (Next Dev — lihat Appendix)
- Memenuhi standar keamanan data kependudukan sesuai regulasi Indonesia (UU PDP, BSSN)
- Menyediakan halaman publik informatif untuk warga desa
- Memberikan akses layanan mandiri (self-service) bagi warga untuk mengajukan permohonan surat secara digital

---

## 2. Ruang Lingkup

Ruang lingkup ini sangat terbuka pada requirement client setelah observasi pertama.

### 2.1. MVP & Fitur Utama

Fokus utama MVP adalah fitur inti yang membentuk alur kerja administrasi surat.

**Table 1 - Fitur Utama (MVP)**

| Fitur | Deskripsi | Output |
|---|---|---|
| Input Surat (form dinamis) | Warga/pejabat mengajukan surat untuk dirinya. Data pemohon diambil dari data kependudukan akun. Isian form, berkas, dan slot tanda tangan mengikuti definisi jenis surat (`form_fields`, `signature_slots`) dan divalidasi server. | Surat masuk tahap RT, atau menunggu tanda tangan pihak terkait lebih dulu |
| Tanda Tangan Pihak Terkait | Slot TTD pemohon memakai TTD akun; slot pihak lain diminta ke pemilik NIK (disetujui dengan kata sandi) atau diganti foto dokumen ber-TTD basah. Penolak dapat memblokir pemohon; penolakan berulang dibatasi. | Surat baru masuk approval setelah semua slot terisi |
| Approval Surat (Category + Flow Dinamis) | Flow aktif dikonfigurasi lewat data. Alur bawaan: RT lalu Kepala Desa/Sekdes pada step final yang sama; Sekdes dapat memutuskan step `kepala_desa`. RW hanya menerima FYI setelah RT approve. Kasi/Kaur menerima notifikasi setelah final approval dan membaca/mengunduh surat sesuai `assigned_role`; bukan approver. Flow baru hanya menerima posisi `rt` dan `kepala_desa`, step final wajib `kepala_desa`. Penolakan di tahap mana pun terminal. | Status dan aktor aktual tercatat di approval serta log sistem |
| Status Tracking | Melihat perkembangan status surat secara real-time | - |
| Terapkan Perubahan Data | Jenis surat ber-`data_action` (mis. Penguburan → nonaktifkan data almarhum; Kelahiran → tambah data anak) diterapkan Kasi/Kaur sesuai `assigned_role` (atau Petugas Desa) setelah final approve, dengan koreksi bila perlu. | Data kependudukan diperbarui + jejak audit |
| Download Surat | Surat approved diunduh sebagai PDF on-demand dari **snapshot** yang dibekukan saat final approve (template, kop desa, TTD & nama Kepala Desa saat itu). Nomor surat `{kode klasifikasi}/{urut}/Des/{bulan Romawi}/{tahun}`. Dokumen pendukung (bila ada) dapat diunduh terpisah. | File PDF |

### 2.2. Fitur Pendukung SID

- **Dashboard per role:**
  - Warga: status surat yang diajukan
  - RT: daftar surat wilayah yang menunggu keputusan
  - Petugas Desa:
    - Manajemen User, Role & Jabatan (officials + organisasi non-struktural desa)
    - Manajemen Data Warga (manual input, import Excel)
    - Kelola Peraturan Desa
    - Kelola Info Desa dan Berita Desa
    - Kelola Struktur Wilayah (Dusun/RW/RT)
    - Kelola Setting Deadline Approval per tahap
    - Kelola Data Organisasi Desa (BPD, LPM, Karang Taruna, PKK: slot tetap Ketua dan Wakil Ketua, anggota dinamis, dengan foto), daftar pekerjaan desa, dan survei sosio-ekonomi per KK
    - Kelola jenis jabatan desa tanpa akun, kategori berita, identitas & tampilan desa (logo, foto beranda, kop surat), reset tanda tangan akun
  - RW: daftar surat yang lewat FYI (read-only — RW bukan approver)
  - Kepala Desa / Sekretaris Desa: daftar surat di step aktif `kepala_desa` dengan status `pending`/`in_progress`; keduanya dapat memutuskan dengan first-action-wins
  - Kasi Pelayanan / Kaur TU & Umum: daftar surat yang sudah `approved` sesuai `assigned_role`; unduh dan Terapkan perubahan data, membaca daftar warga; bukan approver
- Halaman Publik (beranda dengan statistik terhitung, profil desa dengan perangkat desa, berita berkategori, info surat, peraturan desa, hubungi kami), di-cache per desa
- Registrasi Akun Warga (self-service, validasi NIK + tanggal lahir terhadap data kependudukan desa)
- Sistem Notifikasi in-app (database) dan **Web Push** (PWA) dengan chain approval dinamis; penandaan overdue berdasarkan deadline aktif; pengingat approval terjadwal `reminder_hours` sebelum deadline. Notifikasi email status surat: **Belum diimplementasi** (lihat audit docs)

> Jabatan struktural Kadus tetap ada di `officials.position`. Kadus tidak memiliki dashboard approval, tetapi dashboard read-only menampilkan surat di dusunnya yang sudah melewati tahap RT.

### 2.3. Out of Scope (MVP)

- Pembuatan tipe surat baru oleh Petugas Desa, WYSIWYG template editor, dan CRUD isian form oleh Petugas Desa — lihat Appendix (Next Dev Paket 1). Isian form dinamis (`form_fields`) sudah ada, tetapi didefinisikan developer via seeder.
- Portal warga self-service dengan pengajuan surat via WhatsApp Bot terintegrasi (Planned Expansion)
- Validasi integritas data Blockchain-inspired hashing — lihat Appendix (Next Dev Paket 2)
- Aset Desa & Keuangan Desa — lihat Appendix (Tahap 2)
- Full accounting / APBDes (pencatatan yang ada saat ini sederhana, bukan APBDes) — Tahap 2
- Integrasi blockchain penuh (Ethereum / Hyperledger) — Future Expansion
- Integrasi API eksternal / Dukcapil, sinkronisasi data kependudukan — Future Expansion
- Fitur AI (klasifikasi surat, generate surat, smart search) — Future Expansion
- Data Kelayakan Bantuan Sosial (`citizen_aid_eligibility`, `citizen_aid_history`, `aid_programs`) — lihat Appendix (Next Dev / Tahap 2); belum ada use case terkait bansos/DTKS yang dirumuskan

---

## 3. Pengguna Sistem & Role

Sistem mendefinisikan sembilan role dengan hak akses yang berbeda. Seluruh role diimplementasikan pada tahap MVP.

**Table 2 - Pengguna dan Role**

| Role | Akses & Kewenangan | Status |
|---|---|---|
| Petugas Desa / Staf aplikasi (kode role `staf_sid`, tampil "Staf {nama aplikasi}", mis. Staf SIDUTama) | 1. Login dengan username<br>2. CRUD data warga (citizens) manual + excel, KK, sosio-ekonomi, katalog pekerjaan<br>3. Promote/demote/rotate jabatan (berakun maupun tanpa akun; foto wajib, dapat diganti/dihapus), cari calon via NIK, kelola jenis jabatan tanpa akun<br>4. Reset password sementara, reset tanda tangan akun, serta ganti/hapus foto profil akun warga di desanya<br>5. Kelola profil desa (identitas, kop surat, logo, foto beranda, stempel), berita & kategori berita<br>6. Kelola struktur wilayah, setting deadline, peraturan, organisasi desa; ubah masa berlaku/penugasan/status jenis surat; lihat flow (read-only)<br>7. Hanya satu akun aktif per desa; diganti lewat rotasi (boleh oleh dirinya sendiri, lalu ia kembali menjadi warga). Tampil di grup staf Profil Desa publik<br>8. Full visibility seluruh surat di desanya; cadangan Terapkan perubahan data; notifikasi saat surat tertahan karena RT kosong | ✅ MVP |
| Kepala Desa | 1. Login<br>2. Approver aktif pada tahap final; resolve berbasis posisi dalam desanya<br>3. Dashboard surat menunggu keputusan, kecuali surat yang diajukan sendiri<br>4. TTD PDF berasal dari Kepala Desa aktif; stempel PDF dari profil desa | ✅ MVP |
| Sekretaris Desa | 1. Login<br>2. Dapat memutuskan tahap final yang sama dengan Kepala Desa (first-action-wins)<br>3. Dashboard seperti Kades, tanpa surat miliknya sendiri<br>4. `approval_level` mencatat aktor sebenarnya (`sekdes`) | ✅ MVP |
| Kasi Pelayanan | 1. Login<br>2. Menerima notifikasi setelah surat final disetujui (siap cetak / perlu Terapkan)<br>3. Melihat dan mengunduh surat selesai sesuai `assigned_role`; bukan approver<br>4. Menerapkan perubahan data kependudukan dari surat ber-`data_action`<br>5. Melihat daftar warga (read-only)<br>6. Mengajukan surat untuk dirinya (Surat Saya) | ✅ MVP |
| Kaur TU dan Umum | Sama seperti Kasi: notifikasi, surat selesai sesuai `assigned_role`, unduh, Terapkan, baca daftar warga; bukan approver | ✅ MVP |
| Kepala Dusun (Kadus) | 1. Login<br>2. Bukan approver; jabatan struktural tetap ada (`officials.position='kadus'`)<br>3. Melihat daftar/detail surat dusunnya yang sudah disetujui RT melalui endpoint bersama<br>4. Dashboard read-only FYI dan notifikasi setelah RT approve untuk dusun yang sama | ✅ MVP |
| RT | 1. Login<br>2. Proses surat pending di wilayahnya<br>3. Approve/reject (tahap 1)<br>4. Terima notifikasi | ✅ MVP |
| RW | 1. Login<br>2. **Notif only** — bukan approver, tidak bisa approve/reject/block. Murni penerima notifikasi FYI otomatis begitu RT approve, tidak tercatat sebagai approval level di tabel manapun<br>3. Terima notifikasi | ✅ MVP |
| Warga | 1. Register dengan NIK + tanggal lahir + password; username otomatis<br>2. Login dengan username<br>3. Buat tanda tangan pribadi (sekali); setujui/tolak permintaan tanda tangan dari warga lain, blokir pemohon<br>4. Ajukan permohonan surat (isian dinamis, berkas, penanda tangan)<br>5. Lihat surat milik sendiri (`scope=mine` tersedia untuk semua role)<br>6. Download surat approved yang belum kedaluwarsa bila ia pemohon<br>7. Aktifkan notifikasi push di perangkat<br>8. Akses halaman publik<br>9. Unggah/ganti/hapus foto profil sendiri (selama berperan warga) | ✅ MVP |
| Warga (Publik) | 1. Akses halaman publik (beranda, profil desa, pengumuman, info jenis surat)<br>2. Tanpa login | ✅ MVP (read-only publik) |

> **Catatan status Kadus:** Kadus dihapus total sebagai *approver surat*, namun jabatan struktural `officials.position='kadus'` tetap eksis di sistem. Akun Kadus tetap **bisa login** dan tetap muncul sebagai aktor pasif di UC Login, Logout, Lihat Daftar Surat (hanya melihat, tanpa hak approve apapun), dan Lihat Detail Surat. Ini bukan inkonsistensi — Kadus hanya kehilangan hak approval, bukan akun sistemnya.

> **Keputusan model approval:** Sekretaris Desa dapat memutuskan pada step `kepala_desa` yang sama dengan Kepala Desa (first-action-wins). Flow baru hanya menerima step `rt` dan `kepala_desa`; step final harus `kepala_desa`.

**Table 3 - Scope Monitoring Surat per Role**

| Role | Surat Yang Bisa Dilihat |
|---|---|
| Semua role (`scope=mine`) | Surat yang diajukan oleh akun tersebut; pemohon pejabat dapat mengakses surat sendiri |
| RT | Semua surat dari warga di RT-nya, termasuk yang masih menunggu RT dan seluruh riwayat setelah approve/reject |
| RW | Surat dari warga di RW-nya yang sudah di-approve RT, termasuk semua status setelahnya (read-only) |
| Kepala Desa / Sekretaris Desa | Surat di desanya yang sudah di-approve RT atau tercatat melewati tahap RT; aksi keputusan hanya pada step aktif `kepala_desa` |
| Kasi Pelayanan / Kaur TU | Surat berstatus `approved` di desa dan sesuai `letter_types.assigned_role`; NULL berlaku untuk keduanya |
| Petugas Desa | SEMUA surat di desanya sendiri — dari pending hingga rejected, termasuk yang rejected di step manapun |
| Kadus | Surat dari warga di dusunnya yang sudah di-approve RT, termasuk semua status setelahnya (read-only); juga menerima FYI untuk surat tersebut |

### 3.1. Gambaran Umum Alur Kerja (Non-Teknis)

Sistem Informasi Desa (SID) adalah sebuah platform digital berbasis web yang membantu pengelolaan administrasi surat-menyurat serta manajemen data desa. Dapat diakses melalui browser tanpa perlu instalasi aplikasi khusus.

Secara sederhana, sistem ini bekerja seperti loket pelayanan digital. Warga dan pejabat yang akunnya terhubung dengan data kependudukan dapat mengajukan surat untuk dirinya sendiri. Flow default terdiri dari Ketua RT lalu Kepala Desa/Sekretaris Desa sebagai tahap final. RW menerima FYI surat di wilayah RW-nya dan Kadus menerima FYI surat dari dusunnya, keduanya setelah RT menyetujui. Kasi/Kaur bukan approver; mereka menerima pemberitahuan setelah surat disetujui dan dapat melihat/mengunduh surat selesai sesuai `assigned_role`.

Urutan tahap approval ditentukan data flow (`approval_flows` → `flow_steps`); saat ini setiap desa memakai satu flow bawaan (RT → Kepala Desa/Sekdes). Penolakan di tahap mana pun bersifat final (terminal). Kadus tidak terlibat dalam keputusan. Seluruh proses berlangsung digital.

Sistem melindungi data pribadi (NIK terenkripsi, tanda tangan akun terenkripsi, berkas privat) dan mencatat setiap perubahan status surat serta perubahan data kependudukan yang berasal dari surat.

**Table 4 - Alur Sistem Kerja (Flow Default: RT → Kades/Sekdes final)**

| No. | Pelaku | Yang Dilakukan | Hasil |
|---|---|---|---|
| 1 | Warga atau pejabat | Login, memilih jenis surat, mengisi isian form dinamis, mengunggah berkas isian (bila ada), dan menentukan penanda tangan untuk slot pihak lain (NIK atau TTD basah). Akun harus aktif dan terhubung dengan citizen. | Permohonan tersimpan `pending`; `flow_id` di-snapshot |
| 2 | Sistem | Mengisi slot TTD pemohon dari TTD akun; mengirim permintaan TTD ke pemilik NIK. Bila masih ada slot kosong, surat menunggu (`current_step_order = 0`). | Surat belum terlihat approver |
| 2a | Pemilik NIK | Menyetujui (dengan kata sandi) atau menolak (opsional memblokir) permintaan TTD. Pemohon dapat mengisi ulang slot yang ditolak/kedaluwarsa. | Semua slot terisi → lanjut ke langkah 3 |
| 3 | Sistem | Menentukan tahap awal: tahap non-final milik pemohon dilewati; bila RT di wilayah pemohon kosong, surat **ditahan** di tahap RT dan Petugas Desa diberi tahu. | Approver tahap awal diberi notifikasi |
| 4 | RT | Memeriksa permohonan, lampiran, dan dokumen pendukung; approve/reject. | `in_progress` atau `rejected` (terminal) |
| 5 | Sistem (jika RT approve) | FYI ke RW wilayah dan Kadus dusun pemohon; notifikasi ke Kades/Sekdes dan pemohon. | RW/Kadus bukan gate |
| 6 | Kepala Desa / Sekretaris Desa | Memutuskan tahap final (first-action-wins); aktor sebenarnya tercatat. | `approved` atau `rejected` (terminal) |
| 7 | Sistem (jika final approve) | Menetapkan nomor surat per kode klasifikasi, `expires_at`, `processed_at`, membekukan snapshot render (TTD & stempel Kepala Desa saat itu). Notifikasi ke pemohon dan Kasi/Kaur sesuai `assigned_role` (siap cetak, atau perlu Terapkan). | Nomor surat dibuat satu kali |
| 8 | Kasi/Kaur (atau Petugas Desa) | Mengunduh/mencetak surat; untuk jenis surat ber-aksi data, meninjau usulan dan menekan **Terapkan**. | Data kependudukan diperbarui; pemohon diberi tahu |
| 9 | Pemohon | Mengunduh PDF selama surat belum kedaluwarsa. | PDF dari snapshot |

> Status generik (`pending`/`in_progress`/`approved`/`rejected`) + pointer `current_step_order` (0 = menunggu tanda tangan). Tahap final tidak pernah dilewati; tanpa approver eligible selain pemohon, pengajuan ditolak. Kasi/Kaur bukan tahap flow.

### 3.2. Diagram Alur Sistem

⚠ Diagram tersedia di `docs/diagram/code/alur_sistem_and_arsitektur_teknis/01_Activity_AlurSistem_v6.puml`.
