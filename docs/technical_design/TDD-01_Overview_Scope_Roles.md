# TECHNICAL DESIGN DOCUMENT — BAGIAN 1
## SISTEM INFORMASI DESA - DESA CIBENDA
### Overview, Ruang Lingkup, dan Pengguna Sistem

> **v5.1 — Auth & Approval Flow:** catatan revisi menyesuaikan role, alur dua tahap, submit oleh pejabat, serta akses Kasi/Kaur sebagai pembaca surat selesai.

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 1 dari 5 (+ Appendix) |
| Status | v5.0 — mencerminkan state final saat ini, bukan riwayat perubahan |
| Cakupan | Latar belakang & tujuan sistem, ruang lingkup MVP, pengguna & role |
| Riwayat versi lengkap (v1–v4.2) | Lihat `TDD-06_Appendix.md` |
| Fitur Next Dev / Tahap 2 (detail lengkap) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-02_UseCase_Descriptions.md`, `TDD-03_Database_Schema.md`, `TDD-04_Security_NFR_Compliance.md`, `TDD-05_Roadmap_Risks_OpenQuestions.md`, OpenAPI Spec v5.0 (`openapi.yaml`), `SID-ARCH-SYS-001`, `SID-ARCH-BE-001`, `SID-ARCH-FE-001` |

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
| Input Surat | Warga mengajukan permohonan surat secara mandiri (self-service) melalui akun yang telah terdaftar. Data pemohon diambil otomatis dari data akun warga yang login. | Surat diteruskan ke RT untuk approval tahap 1 |
| Approval Surat (Category + Flow Dinamis) | Flow aktif dikonfigurasi lewat data. Alur bawaan: RT lalu Kepala Desa/Sekdes pada step final yang sama; Sekdes dapat memutuskan step `kepala_desa`. RW hanya menerima FYI setelah RT approve. Kasi/Kaur menerima notifikasi setelah final approval dan membaca/mengunduh surat sesuai `assigned_role`; bukan approver. Flow baru hanya menerima posisi `rt` dan `kepala_desa`, step final wajib `kepala_desa`. Penolakan di tahap mana pun terminal. | Status dan aktor aktual tercatat di approval serta log sistem |
| Status Tracking | Melihat perkembangan status surat secara real-time | - |
| Validasi Kelayakan Surat | Setiap jenis surat memiliki flag `verification_type` yang menentukan alur verifikasi kelayakan:<br>• **Auto**: lolos otomatis jika NIK pemohon terdaftar di database warga<br>• **Manual**: sistem menampilkan checklist persyaratan, warga wajib konfirmasi saat mengisi form<br>• **Document**: warga wajib upload dokumen pendukung sebelum permohonan dapat disubmit<br>**Status: Belum diimplementasi (Planned)** — backend hanya menyimpan `verification_type`; belum ada penegakan di `LetterService` | - |
| Download Surat | Surat yang sudah disetujui di step final dapat didownload sebagai PDF, digenerate on-demand saat klik tombol download (tidak tersimpan di server) | File PDF |

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
    - Kelola Data Organisasi Desa (BPD, BUMDES, LPM, Karang Taruna, PKK)
  - RW: daftar surat yang lewat FYI (read-only — RW bukan approver)
  - Kepala Desa / Sekretaris Desa: daftar surat di step aktif `kepala_desa` dengan status `pending`/`in_progress`; keduanya dapat memutuskan dengan first-action-wins
  - Kasi Pelayanan / Kaur TU & Umum: daftar surat yang sudah `approved` sesuai `assigned_role`; hanya baca dan unduh, bukan approver
- Halaman Publik (beranda, profil desa, berita, info surat, peraturan desa, hubungi kami)
- Registrasi Akun Warga (self-service, validasi NIK warga Cibenda)
- Sistem Notifikasi (in-app & email) dengan chain approval dinamis; penandaan overdue berdasarkan deadline aktif. Pengiriman reminder otomatis: **Belum diimplementasi (Planned)**

> Jabatan struktural Kadus tetap ada di `officials.position`. Kadus tidak memiliki dashboard approval, tetapi dashboard read-only menampilkan surat di dusunnya yang sudah melewati tahap RT.

### 2.3. Out of Scope (MVP)

- Fitur create tipe surat baru lengkap dengan dynamic form requirement field, WYSIWYG template editor, dan CRUD field requirement — lihat Appendix (Next Dev Paket 1). Template surat tetap developer-only via seeder di MVP.
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
| Petugas Desa (Operator) | 1. Login dengan username<br>2. CRUD data warga (citizens) manual + excel<br>3. Promote/demote/rotate jabatan melalui manajemen officials<br>4. Reset password sementara untuk non-Petugas Desa<br>5. Kelola profil desa & berita<br>6. Kelola struktur wilayah, setting deadline, peraturan, dan organisasi desa<br>7. Dapat lebih dari satu akun aktif<br>8. Full visibility seluruh surat di desanya; dashboard juga menampilkan jabatan lewat masa dan segera berakhir | ✅ MVP |
| Kepala Desa | 1. Login<br>2. Approver aktif pada tahap final; resolve berbasis posisi dalam desanya<br>3. Dashboard surat menunggu keputusan, kecuali surat yang diajukan sendiri<br>4. Tanda tangan dan stempel PDF tetap milik Kepala Desa aktif | ✅ MVP |
| Sekretaris Desa | 1. Login<br>2. Dapat memutuskan tahap final yang sama dengan Kepala Desa (first-action-wins)<br>3. Dashboard seperti Kades, tanpa surat miliknya sendiri<br>4. `approval_level` mencatat aktor sebenarnya (`sekdes`) | ✅ MVP |
| Kasi Pelayanan | 1. Login<br>2. Menerima notifikasi setelah surat final disetujui<br>3. Melihat dan mengunduh surat selesai sesuai `assigned_role`; bukan approver | ✅ MVP |
| Kaur TU dan Umum | Sama seperti Kasi: notifikasi, daftar surat selesai sesuai `assigned_role`, dan unduh; bukan approver | ✅ MVP |
| Kepala Dusun (Kadus) | 1. Login<br>2. Bukan approver; jabatan struktural tetap ada (`officials.position='kadus'`)<br>3. Melihat daftar/detail surat dusunnya yang sudah disetujui RT melalui endpoint bersama<br>4. Dashboard read-only FYI dan notifikasi setelah RT approve untuk dusun yang sama | ✅ MVP |
| RT | 1. Login<br>2. Proses surat pending di wilayahnya<br>3. Approve/reject (tahap 1)<br>4. Terima notifikasi | ✅ MVP |
| RW | 1. Login<br>2. **Notif only** — bukan approver, tidak bisa approve/reject/block. Murni penerima notifikasi FYI otomatis begitu RT approve, tidak tercatat sebagai approval level di tabel manapun<br>3. Terima notifikasi | ✅ MVP |
| Warga | 1. Register dengan NIK + password; username otomatis<br>2. Login dengan username<br>3. Ajukan permohonan surat<br>4. Lihat surat milik sendiri (`scope=mine` tersedia untuk semua role)<br>5. Download surat approved yang belum kedaluwarsa bila ia pemohon<br>6. Akses halaman publik | ✅ MVP |
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

Jumlah dan urutan tahap approval tidak hardcode — ditentukan oleh flow spesifik jenis surat, sehingga bisa berbeda-beda antar jenis surat meski berada di kategori yang sama. Penolakan di tahap manapun bersifat final (terminal): permohonan langsung ditolak dan warga mendapat notifikasi. Kepala Desa/Sekretaris Desa berperan sebagai approver aktif, sedangkan Kadus tidak lagi terlibat dalam alur approval surat. Seluruh proses berlangsung secara digital sehingga tidak perlu lagi membawa berkas fisik antar kantor.

Sistem juga dilengkapi fitur keamanan data untuk melindungi informasi pribadi warga seperti Nomor Induk Kependudukan (NIK) agar tidak dapat dibaca oleh pihak yang tidak berwenang, bahkan sekalipun terjadi kebocoran data pada tingkat teknis. Setiap perubahan yang terjadi pada data surat tercatat secara otomatis, sehingga selalu ada jejak yang dapat ditelusuri.

**Table 4 - Alur Sistem Kerja (Flow Default: RT → Kades/Sekdes final)**

| No. | Pelaku | Yang Dilakukan | Hasil |
|---|---|---|---|
| 1 | Warga atau pejabat | Login dengan username dan mengisi formulir untuk dirinya sendiri. Akun harus aktif dan terhubung dengan citizen. | Permohonan diterima; pemohon tidak boleh memutuskan suratnya sendiri |
| 2 | Sistem | Menyimpan snapshot `flow_id`, status awal `pending`, mencari tahap awal yang dapat ditindaklanjuti, dan mencatat tahap pemohon yang dilewati bila memenuhi aturan. | Tahap awal dapat bernilai 1 atau 2 |
| 3 | RT (bila menjadi tahap awal) | Memeriksa permohonan dan memberi keputusan approve/reject. | `in_progress` atau `rejected` (terminal) |
| 4a | Sistem (jika RT reject) | Catat keputusan + waktu + IP + kirim notif ke Warga. | Proses selesai (terminal), `rejected_at_step` = step RT |
| 4b | Sistem (jika RT approve) | Catat keputusan dan kirim FYI RW hanya setelah keputusan RT approve; pindah ke tahap berikutnya yang actionable. | RW FYI bukan gate; approver berikutnya diberi notifikasi |
| 5 | Kepala Desa / Sekretaris Desa | Memutuskan tahap final, siapa yang lebih dulu bertindak tercatat sebagai aktor. Pemohon Kades dapat diputuskan Sekdes, dan sebaliknya. | Surat berstatus `approved` atau `rejected` (terminal) |
| 6a | Sistem (jika Kades/Sekdes reject) | Catat keputusan + kirim notif ke Warga. | Proses selesai (terminal), `rejected_at_step` = step Kades/Sekdes |
| 6b | Sistem (jika final approve) | Menetapkan `letter_number`, `expires_at` bila masa berlaku diatur, dan `processed_at`. Mengirim notifikasi final ke pemohon serta notifikasi siap cetak ke Kasi/Kaur sesuai `assigned_role`. | Status `approved`; nomor surat dibuat satu kali |
| 7 | Kasi/Kaur | Membuka daftar surat selesai yang sesuai role, lalu mengunduh/mencetak bila diperlukan. | Tidak ada aksi approve/reject |
| 8 | Pemohon | Menerima notifikasi hasil akhir dan mengunduh PDF selama surat belum kedaluwarsa. | PDF memakai TTD/stempel Kepala Desa aktif |

> Alur ini menggunakan status generik (`pending`/`in_progress`/`approved`/`rejected`) dan pointer `current_step_order`. Tahap non-final dilewati hanya jika pejabat tersedia tetapi semua pejabat eligible merupakan pemohon; jabatan kosong tidak dilewati. Tahap final tidak pernah dilewati dan tanpa approver eligible permohonan gagal. Flow default adalah RT → Kades/Sekdes final; Kasi/Kaur bukan tahap flow.

### 3.2. Diagram Alur Sistem

⚠ Diagram tersedia di file diagram terpisah (Activity Diagram — Diagram Alur Sistem v5.0, lihat file PlantUML proyek).
