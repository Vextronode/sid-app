# TECHNICAL DESIGN DOCUMENT — BAGIAN 1
## SISTEM INFORMASI DESA - DESA CIBENDA
### Overview, Ruang Lingkup, dan Pengguna Sistem

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
| Approval Surat (Category + Flow Dinamis) | Proses persetujuan berjalan berbasis flow dinamis (bukan hardcode jumlah tahap). Untuk kategori Approval Normal dengan flow default 3-tahap-approve: (1) RT memeriksa dan memberikan keputusan pertama (approve/reject), (2) RW menerima notifikasi FYI otomatis (bukan approver, tidak bisa approve/reject/block, murni pemberitahuan pasif), (3) Kepala Desa atau Sekretaris Desa memeriksa dan memberikan keputusan lanjutan (saling menggantikan, siapa lebih dulu action itu yang tercatat — lihat catatan status di Section 3 dokumen ini), (4) Kasi Pelayanan / Kaur TU Umum memeriksa dan memberikan keputusan Final. Surat yang ditolak di tahap manapun langsung berstatus ditolak (terminal). Flow lain untuk kategori/jenis surat berbeda bisa memiliki jumlah dan urutan tahap yang berbeda (misal 2 tahap saja, skip Kades/Sekdes). | Status berubah sesuai keputusan per-tahap. Tercatat di log sistem |
| Status Tracking | Melihat perkembangan status surat secara real-time | - |
| Validasi Kelayakan Surat | Setiap jenis surat memiliki flag `verification_type` yang menentukan alur verifikasi kelayakan:<br>• **Auto**: lolos otomatis jika NIK pemohon terdaftar di database warga<br>• **Manual**: sistem menampilkan checklist persyaratan, warga wajib konfirmasi saat mengisi form<br>• **Document**: warga wajib upload dokumen pendukung sebelum permohonan dapat disubmit | - |
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
  - Kepala Desa / Sekretaris Desa: daftar surat yang menunggu approval mereka (approver aktif), query generik berbasis `current_step_order`
  - Kasi Pelayanan / Kaur TU & Umum: daftar surat dengan `current_step_order` yang menunjuk ke posisi ini, menunggu keputusan final
- Halaman Publik (beranda, profil desa, berita, info surat, peraturan desa, hubungi kami)
- Registrasi Akun Warga (self-service, validasi NIK warga Cibenda)
- Sistem Notifikasi (in-app & email) dengan chain approval dinamis + reminder deadline

> Jabatan struktural Kadus tetap ada di `officials.position` untuk keperluan non-approval (misal struktur wilayah di halaman publik), namun tidak memiliki dashboard approval.

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
| Petugas Desa (Operator) | 1. Login<br>2. CRUD data warga (citizens) manual + excel<br>3. Kelola user & jabatan<br>4. Kelola profil desa & berita<br>5. Kelola struktur wilayah<br>6. Setting deadline approval<br>7. Kelola peraturan desa<br>8. Kelola organisasi desa<br>9. Bisa lebih dari 1 akun aktif bersamaan<br>10. Full visibility ke seluruh surat dari semua status (baik desa maupun masih di tahap awal, termasuk yang rejected di step manapun) | ✅ MVP |
| Kepala Desa | 1. Login<br>2. **Approver aktif** — gate menggantikan posisi Kadus lama, resolve berbasis posisi (`kepala_desa`), bukan wilayah<br>3. Dashboard menampilkan daftar surat yang menunggu approval-nya (action item), bukan read-only<br>4. Validasi integritas data (Next Dev, lihat Appendix) | ✅ MVP |
| Sekretaris Desa | 1. Login<br>2. **Approver aktif**, step sama dengan Kepala Desa — keduanya saling menggantikan, siapa lebih dulu action itu yang tercatat (first-action-wins, disederhanakan di application layer, bukan DB constraint) — ⚠ **lihat catatan status di bawah**<br>3. Dashboard sama persis dengan Kepala Desa<br>4. Role dipisah agar tidak ambigu saat manajemen jabatan | ✅ MVP |
| Kasi Pelayanan | 1. Login<br>2. Memproses surat yang `current_step_order`-nya menunjuk ke posisi ini (sesuai `flow_steps.approver_position`), step final<br>3. Approve/reject (tahap final)<br>4. Generate nomor surat<br>5. Terima notifikasi | ✅ MVP |
| Kaur TU dan Umum | Sama seperti Kasi Pelayanan, posisi berbeda | ✅ MVP |
| Kepala Dusun (Kadus) | 1. Login<br>2. **Dihapus total dari alur approval surat** — posisi digantikan Kepala Desa/Sekretaris Desa. Jabatan struktural tetap ada (`officials.position='kadus'`) untuk keperluan non-approval, misal halaman publik struktur desa, dan sebagai aktor pasif pada UC login/lihat status<br>3. Terima notifikasi (non-approval) | ✅ MVP |
| RT | 1. Login<br>2. Proses surat pending di wilayahnya<br>3. Approve/reject (tahap 1)<br>4. Terima notifikasi | ✅ MVP |
| RW | 1. Login<br>2. **Notif only** — bukan approver, tidak bisa approve/reject/block. Murni penerima notifikasi FYI otomatis begitu RT approve, tidak tercatat sebagai approval level di tabel manapun<br>3. Terima notifikasi | ✅ MVP |
| Warga | 1. Register & login akun<br>2. Ajukan permohonan surat mandiri (self-service)<br>3. Lihat status & riwayat surat miliknya<br>4. Download surat yang masih belum habis masa berlakunya<br>5. Akses halaman publik | ✅ MVP |
| Warga (Publik) | 1. Akses halaman publik (beranda, profil desa, pengumuman, info jenis surat)<br>2. Tanpa login | ✅ MVP (read-only publik) |

> **Catatan status Kadus:** Kadus dihapus total sebagai *approver surat*, namun jabatan struktural `officials.position='kadus'` tetap eksis di sistem. Akun Kadus tetap **bisa login** dan tetap muncul sebagai aktor pasif di UC Login, Logout, Lihat Daftar Surat (hanya melihat, tanpa hak approve apapun), dan Lihat Detail Surat. Ini bukan inkonsistensi — Kadus hanya kehilangan hak approval, bukan akun sistemnya.

> ⚠ **Catatan status keputusan — first-action-wins Kades/Sekdes:** Bahwa Sekretaris Desa benar-benar ikut approve di step yang sama dengan Kepala Desa (saling menggantikan) masih berstatus **rekomendasi/asumsi default**, bukan keputusan final eksplisit dari pihak desa. Lihat `TDD-05_Roadmap_Risks_OpenQuestions.md` untuk status pertanyaan ini.

**Table 3 - Scope Monitoring Surat per Role**

| Role | Surat Yang Bisa Dilihat |
|---|---|
| Warga | Hanya surat milik sendiri |
| RT | Surat wilayahnya, status pending (step aktif = rt) |
| RW | Surat yang lewat FYI (notifikasi read-only, bukan status filter aktif — RW bukan approver) |
| Kepala Desa / Sekretaris Desa | Surat dengan `current_step_order` menunjuk ke posisi `kepala_desa`/`sekdes`, status `in_progress` |
| Kasi Pelayanan / Kaur TU | Surat dengan `current_step_order` menunjuk ke posisinya, status `in_progress` (step final) |
| Petugas Desa | SEMUA surat — dari pending hingga rejected, termasuk yang rejected di step manapun |
| Kadus | Tidak memiliki scope approval khusus (bukan approver). Jabatan struktural non-approval saja — tidak ada daftar surat "menunggu Kadus" karena Kadus tidak lagi menjadi gate manapun di `flow_steps` |

### 3.1. Gambaran Umum Alur Kerja (Non-Teknis)

Sistem Informasi Desa (SID) adalah sebuah platform digital berbasis web yang membantu pengelolaan administrasi surat-menyurat serta manajemen data desa. Dapat diakses melalui browser tanpa perlu instalasi aplikasi khusus.

Secara sederhana, sistem ini bekerja seperti loket pelayanan digital. Warga dapat secara langsung mengajukan permohonan surat melalui sistem tanpa perlu melalui petugas desa. Sebelum permohonan disetujui, terdapat mekanisme verifikasi berjenjang berbasis flow dinamis (Category + Flow) yang melibatkan Ketua RT (approve), Ketua RW (notifikasi FYI saja, bukan approver), dan Kepala Desa/Sekretaris Desa (approve, menggantikan posisi Kadus lama), sebelum diproses final oleh Kasi/Kaur yang berwenang atas jenis surat tersebut.

Jumlah dan urutan tahap approval tidak hardcode — ditentukan oleh flow spesifik jenis surat, sehingga bisa berbeda-beda antar jenis surat meski berada di kategori yang sama. Penolakan di tahap manapun bersifat final (terminal): permohonan langsung ditolak dan warga mendapat notifikasi. Kepala Desa/Sekretaris Desa berperan sebagai approver aktif, sedangkan Kadus tidak lagi terlibat dalam alur approval surat. Seluruh proses berlangsung secara digital sehingga tidak perlu lagi membawa berkas fisik antar kantor.

Sistem juga dilengkapi fitur keamanan data untuk melindungi informasi pribadi warga seperti Nomor Induk Kependudukan (NIK) agar tidak dapat dibaca oleh pihak yang tidak berwenang, bahkan sekalipun terjadi kebocoran data pada tingkat teknis. Setiap perubahan yang terjadi pada data surat tercatat secara otomatis, sehingga selalu ada jejak yang dapat ditelusuri.

**Table 4 - Alur Sistem Kerja (Flow Default: RT → Kades/Sekdes → Staff)**

| No. | Pelaku | Yang Dilakukan | Hasil |
|---|---|---|---|
| 1 | Warga | Login dan mengisi formulir permohonan surat secara mandiri, pilih jenis surat, pengisian form. | Data permohonan tersimpan dengan status `pending` |
| 2 | Sistem | Mencatat waktu pengajuan, menyimpan data (snapshot `flow_id`, `current_step_order = 1`), mengirim notifikasi ke RT wilayah warga. | RT wilayah warga mendapat notifikasi |
| 3 | RT | Memeriksa permohonan, memberikan keputusan (approve/reject). | Status: `in_progress` atau `rejected` (terminal) |
| 4a | Sistem (jika RT reject) | Catat keputusan + waktu + IP + kirim notif ke Warga. | Proses selesai (terminal), `rejected_at_step` = step RT |
| 4b | Sistem (jika RT approve) | Catat keputusan + waktu + IP. Secara **paralel**: kirim notif FYI ke RW (non-blocking) + kirim notif ke Kepala Desa/Sekretaris Desa (approver berikutnya). `current_step_order += 1`. | RW mendapat notifikasi FYI (non-blocking, tidak pernah menjadi gate) + Kepala Desa/Sekretaris Desa mendapat notifikasi |
| 5 | Kepala Desa / Sekretaris Desa | Memeriksa surat dengan `current_step_order` sesuai posisinya, memberikan keputusan (approve/reject). Saling menggantikan (first-action-wins). | Status: `in_progress` atau `rejected` (terminal) |
| 6a | Sistem (jika Kades/Sekdes reject) | Catat keputusan + kirim notif ke Warga. | Proses selesai (terminal), `rejected_at_step` = step Kades/Sekdes |
| 6b | Sistem (jika Kades/Sekdes approve) | Catat keputusan, `current_step_order += 1`, kirim notif ke Kasi/Kaur sesuai `flow_steps.approver_position` step berikutnya. | Kasi/Kaur mendapat notifikasi |
| 7 | Kasi/Kaur | Memproses surat dengan `current_step_order` sesuai posisinya (step final, `is_final=true`), memberikan keputusan final. | Status: `approved` atau `rejected` (terminal, dicatat di `rejected_at_step`) |
| 8 | Sistem (jika approved) | Generate `letter_number` resmi, hitung `expires_at`, kirim notif ke Warga + Kepala Desa & Sekretaris Desa (monitoring). | Surat selesai, siap didownload |
| 9 | Warga | Menerima notifikasi hasil akhir, dapat download PDF surat. | - |

> Alur ini menggunakan status generik (`pending`/`in_progress`/`approved`/`rejected`) dan pointer `current_step_order` — bukan status granular per posisi. Tabel di atas merepresentasikan flow default 3-tahap-approve (`RT → Kades/Sekdes → Staff`); flow lain bisa punya jumlah/urutan tahap berbeda (lihat `TDD-03_Database_Schema.md` Section 3, `letter_categories`/`approval_flows`/`flow_steps`).

### 3.2. Diagram Alur Sistem

⚠ Diagram tersedia di file diagram terpisah (Activity Diagram — Diagram Alur Sistem v5.0, lihat file PlantUML proyek).
