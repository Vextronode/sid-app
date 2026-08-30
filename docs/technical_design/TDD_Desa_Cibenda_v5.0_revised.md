# TECHNICAL DESIGN DOCUMENT
## SISTEM INFORMASI DESA - DESA CIBENDA

> **Catatan revisi:** Dokumen ini adalah hasil koreksi TDD terhadap Patch Guide v3.2→v4.2 dan Patch Guide v4.2→v5.0. Perubahan yang diterapkan pada revisi ini:
> 1. Perbaikan judul Table 15 (sisa label lama "Usecase 4c - Kadus Approval" → dikoreksi jadi "Usecase 5 - View Daftar Surat") di Daftar Isi, Daftar Table, dan badan dokumen.
> 2. Pemisahan Section 3.4 (Blockchain-Inspired Hashing, Next Dev Paket 2) dan Section 3.5 (Dynamic Tipe Surat, Next Dev Paket 1) menjadi dua sub-section terpisah sesuai Patch 24.
> 3. Update daftar Sequence Diagram di Section 5.3.3 — menghapus referensi ke "Sequence RW Approval" dan "Sequence Kadus" (tidak berlaku sejak v5.0), diganti dengan sequence generik sesuai Patch 38.
> 4. Klarifikasi status Kadus sebagai aktor di UC-01, UC-02, UC-05, UC-06 (tetap sebagai aktor untuk fungsi non-approval seperti login/lihat status, karena jabatan struktural Kadus masih ada — hanya dihapus dari alur *approval surat*).
> 5. Semua referensi diagram tetap memakai label "⚠ Diagram ada di file lain" sesuai instruksi — tidak digambar ulang di sini.

---

## DAFTAR ISI

1. [INFORMASI DOKUMEN](#1-informasi-dokumen) — 9
   1.1. [Status Dokumen](#11-status-dokumen) — 9
   1.2. [Riwayat Perubahan](#12-riwayat-perubahan) — 9
2. [LATAR BELAKANG & TUJUAN SISTEM](#2-latar-belakang--tujuan-sistem) — 10
3. [RUANG LINGKUP](#3-ruang-lingkup) — 11
   3.1. [MVP & Fitur Utama](#31-mvp--fitur-utama) — 11
   3.2. [Fitur Pendukung SID](#32-fitur-pendukung-sid) — 12
   3.3. [Out of Scope (MVP)](#33-out-of-scope-mvp) — 12
   3.4. [Next Dev — Paket 2: Blockchain-Inspired Hashing](#34-next-dev--paket-2-blockchain-inspired-hashing) — 13
   3.5. [Next Dev — Paket 1: Dynamic Tipe Surat (Create + WYSIWYG + Field Requirement)](#35-next-dev--paket-1-dynamic-tipe-surat-create--wysiwyg--field-requirement) — 14
4. [PENGGUNA SISTEM & ROLE](#4-pengguna-sistem--role) — 15
5. [ARSITEKTUR & PEMODELAN SISTEM](#5-arsitektur--pemodelan-sistem) — 16
   5.1. [Arsitektur - Non Teknis](#51-arsitektur---non-teknis) — 16
      5.1.1. [Gambaran Umum](#511-gambaran-umum) — 16
      5.1.2. [Alur Sistem Kerja](#512-alur-sistem-kerja) — 17
      5.1.3. [Diagram Alur Sistem](#513-diagram-alur-sistem) — 19
   5.2. [Arsitektur Teknis](#52-arsitektur-teknis) — 20
      5.2.1. [Tech Stack](#521-tech-stack) — 20
      5.2.2. [Diagram Arsitektur Teknis](#522-diagram-arsitektur-teknis) — 22
      5.2.3. [Sistem Notifikasi & Event Architecture](#523-sistem-notifikasi--event-architecture) — 23
      5.2.4. [Blockchain-Inspired Hashing Implementation](#524-blockchain-inspired-hashing-implementation) — 24
      5.2.5. [Diagram Deployment Architecture](#525-diagram-deployment-architecture) — 25
      5.2.6. [Struktur Folder Project](#526-struktur-folder-project) — 26
   5.3. [Pemodelan Sistem](#53-pemodelan-sistem) — 27
      5.3.1. [Usecase](#531-usecase) — 27
      5.3.2. [Usecase Description](#532-usecase-description) — 31
      5.3.3. [Sequence Diagram](#533-sequence-diagram) — 55
      5.3.4. [Class Diagram](#534-class-diagram) — 60
   5.4. [Desain Database](#54-desain-database) — 61
      5.4.1. [Entity Relationship Diagram (ERD)](#541-entity-relationship-diagram-erd) — 61
      5.4.2. [Definisi Tabel & Atribut](#542-definisi-tabel--atribut) — 62
      5.4.3. [Indexing Strategy](#543-indexing-strategy) — 76
      5.4.4. [Strategi Enkripsi Field](#544-strategi-enkripsi-field) — 79
      5.4.5. [Benchmarking Query](#545-benchmarking-query) — 81
      - Kategori Warga — 82
      - Kategori Aset — 82
      - Kategori Keuangan — 83
      - Kategori Notifikasi — 83
      - Kategori Officials — 83
   5.5. [Desain API](#55-desain-api) — 85
      5.5.1. [Konvensi & Autentikasi](#551-konvensi--autentikasi) — 85
      5.5.2. [Endpoint Specification](#552-endpoint-specification) — 85
   5.6. [Keamanan Sistem](#56-keamanan-sistem) — 86
      5.6.1. [Implementasi Keamanan per Layer](#561-implementasi-keamanan-per-layer) — 86
      5.6.2. [Infrastruktur & Deployment](#562-infrastruktur--deployment) — 88
      5.6.3. [Compliance](#563-compliance) — 88
6. [KLASIFIKASI DATA & THREAT MODELING](#6-klasifikasi-data--threat-modeling) — 89
   6.1. [Klasifikasi Data](#61-klasifikasi-data) — 89
   6.2. [Threat Modeling](#62-threat-modeling) — 89
7. [NON-FUNCTIONAL REQUIREMENTS](#7-non-functional-requirements) — 91
8. [ROADMAP & RESIKO](#8-roadmap--resiko) — 92
   8.1. [Roadmap Pengembangan](#81-roadmap-pengembangan) — 92
   8.2. [Asumsi & Risiko](#82-asumsi--risiko) — 93
      8.2.1. [Asumsi & Risiko Infrastruktur Teknis](#821-asumsi--risiko-infrastruktur-teknis) — 93
      8.2.2. [Asumsi & Risiko Operasional & Sosial](#822-asumsi--risiko-operasional--sosial) — 94
   8.3. [Pertanyaan Prioritas](#83-pertanyaan-prioritas) — 95
      8.3.1. [Validasi dengan Pihak Desa / Client](#831-validasi-dengan-pihak-desa--client) — 95
      8.3.2. [Keputusan Teknis Internal Tim](#832-keputusan-teknis-internal-tim) — 95
   8.4. [Known Technical Constraints](#84-known-technical-constraints) — 97

---

## Daftar Table

| Table | Judul | Halaman |
|---|---|---|
| Table 1 | Riwayat Perubahan | 9 |
| Table 2 | Fitur Utama (MVP) | 11 |
| Table 3 | Justifikasi Blockchain-Inspired Hashing | 13 |
| Table 4 | Pengguna dan Role | 15 |
| Table 5 | Scope Monitoring Surat per Role | 15 |
| Table 6 | Alur Sistem Kerja | 17 |
| Table 7 | Tech Stack - Tahap 1 | 20 |
| Table 8 | Tech Stack - Tahap 2 | 21 |
| Table 9 | Trigger Notification | 23 |
| Table 10 | Usecase 1 - Login | 31 |
| Table 11 | Usecase 2 - Logout | 32 |
| Table 12 | Usecase 3 - Input Permohonan Surat | 32 |
| Table 13 | Usecase 4a - RT Approval | 34 |
| Table 14 | Usecase 4c (baru) - Kades/Sekdes Approval | 35 |
| Table 15 | Usecase 5 - View Daftar Surat | 37 |
| Table 16 | Usecase 6 - Detail dan Status Surat | 38 |
| Table 17 | Usecase 7 - Validasi Integritas Surat (Next Dev) | 39 |
| Table 18 | Usecase 8 - Download Surat (PDF On-Demand) | 40 |
| Table 19 | Usecase 9 - CRUD Warga | 41 |
| Table 20 | Usecase 11 - Kelola Aset Desa (Tahap 2) | 42 |
| Table 21 | Usecase 12 - Catat Transaksi Keuangan Desa (Tahap 2) | 44 |
| Table 22 | Usecase 13 - Laporan Keuangan dan Rekap Aset (Tahap 2) | 45 |
| Table 23 | Usecase 14 - Kelola User dan Role | 46 |
| Table 24 | Usecase 15 - Dashboard dan Statistik | 47 |
| Table 25 | Usecase 16 - Halaman Publik (Warga) | 49 |
| Table 26 | Usecase 17 - Register Akun Warga | 50 |
| Table 27 | Usecase 18 - Kelola Profil Desa | 51 |
| Table 28 | Usecase 19 - Kelola Berita / Informasi | 52 |
| Table 29 | Table Database villages | 62 |
| Table 30 | Table Database users | 63 |
| Table 31 | Table Database citizens | 64 |
| Table 32 | Table Database officials | 65 |
| Table 33 | Table Database letter_types | 66 |
| Table 34 | Table Database letters | 67 |
| Table 35 | Table Database letter_approvals | 69 |
| Table 36 | Table Database letter_status_logs | 70 |
| Table 37 | Table Database letter_hashes (Next Dev) | 71 |
| Table 38 | Table Database village_assets (Tahap 2) | 72 |
| Table 39 | Table Database village_finances (Tahap 2) | 73 |
| Table 40 | Table Database notifications | 74 |
| Table 41 | Table Database news | 74 |
| Table 42 | Indexing Strategy - Table letters | 76 |
| Table 43 | Indexing Strategy - Table letter_status_logs | 76 |
| Table 44 | Indexing Strategy - Table citizens | 77 |
| Table 45 | Indexing Strategy - Table village_assets | 77 |
| Table 46 | Indexing Strategy - Table village_finances | 78 |
| Table 47 | Indexing Strategy - Table notifications | 78 |
| Table 48 | Indexing Strategy - Table officials | 79 |
| Table 49 | Algoritma Implementasi Enkripsi | 79 |
| Table 50 | Field Yang Dienkripsi | 80 |
| Table 51 | Strategi Dual-Column | 80 |
| Table 52 | Key Management | 81 |
| Table 53 | Query Benchmark - Kategori Surat | 82 |
| Table 54 | Query Benchmark - Kategori Warga | 82 |
| Table 55 | Query Benchmark - Kategori Aset | 82 |
| Table 56 | Query Benchmark - Kategori Keuangan | 83 |
| Table 57 | Query Benchmark - Kategori Notifikasi | 83 |
| Table 58 | Query Benchmark - Kategori Officials | 83 |
| Table 59 | Template Hasil Benchmark | 84 |
| Table 60 | Logging & Audit Trail | 87 |
| Table 61 | Compliance | 88 |
| Table 62 | Klasifikasi Data | 89 |
| Table 63 | Ancaman & Mitigasi | 90 |
| Table 64 | Non-Functional Requirements | 91 |
| Table 65 | Roadmap Pengembangan | 92 |
| Table 66 | Asumsi & Risiko Infrastruktur Teknis | 93 |
| Table 67 | Asumsi & Risiko Operasional & Sosial | 94 |
| Table 68 | Validasi Pihak Desa/Client | 95 |
| Table 69 | Keputusan Teknis Tim Internal | 95 |
| Table 70 | Known Technical Constraints | 97 |

> **Catatan revisi Daftar Tabel:** Nomor tabel di dokumen ini digeser +1 dari draft sebelumnya mulai Table 5, karena "Table 5 - Scope Monitoring Surat per Role" (sebelumnya menyatu tanpa nomor resmi di Section 4) sekarang diberi nomor tabel formal. Judul Table 15 dikoreksi dari sisa label lama "Usecase 4c - Kadus Approval" menjadi "Usecase 5 - View Daftar Surat" sesuai isi tabel yang sebenarnya. UC-04c versi lama (Kadus Approval) sudah **dihapus total** sejak v5.0 (Patch 37) dan digantikan UC-04c versi baru (Kades/Sekdes Approval), yang diberi nomor Table 14.

---

## 1. INFORMASI DOKUMEN

### 1.1. Status Dokumen

### 1.2. Riwayat Perubahan

**Table 1 - Riwayat Perubahan**

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1 | 16 April 2026 | Draft awal, disusun berdasarkan asumsi requirement awal | Handika Chandra Pratama |
| 2 | 25 April 2026 | Revisi arah aplikasi dan sistem | Handika Chandra Pratama |
| 2.1 | 09 Mei 2026 | penyesuaian minim pada sedikit inkonsistensi | Handika Chandra Pratama |
| 3.1 | 19 Mei 2026 | Peluasan Scope, Fitur | Nadirah |
| 3.2 | 20 Mei 2026 | Revisi Diagram | Handika |
| 4.0 | Juni 2026 | Post-observasi client: 4-tahap approval (RT→RW→Kadus→Kasi), 8 role, struktur wilayah proper (hamlets/rws/rts), deadline approval + reminder, PDF on-demand. | Handika Chandra Pratama |
| 4.1 | Juni 2026 | Import Excel warga masuk Tahap 1, organisasi non-struktural desa (village_org_positions + village_org_members), peraturan desa, domisili warga, UI grouping manajemen jabatan. 22 UC aktif MVP (26 UC total termasuk non-MVP), 17 tabel MVP. | Handika Chandra Pratama |
| 4.2 | Juni 2026 | Role sekretaris_desa baru (ENUM jadi 9 nilai), Sekdes punya akun sistem dengan scope monitoring identik Kepala Desa, scope monitoring surat per role dikonfirmasi (Petugas Desa = semua, Kades/Sekdes = hanya status level desa), dynamic form digabung ke Next Dev satu paket dengan WYSIWYG + create tipe surat. | Handika Chandra Pratama |
| 5.0 | (isi tanggal saat patch diterapkan) | Perombakan RBAC (RT approve → RW notif-only → Kades/Sekdes approve → Staff final), sistem Category+Flow approval dinamis (menggantikan hardcode 4-tahap RT→RW→Kadus→Kasi), restrukturisasi data warga (tabel families/KK, citizen_socioeconomics, residency lokal/pendatang, self-reference orang tua). | Handika Chandra Pratama |
| 5.0.1 | (isi tanggal revisi ini) | **Revisi kerapian dokumen**: koreksi judul Table 15 (sisa label lama "Kadus Approval"), pemisahan Section 3.4/3.5, update daftar sequence diagram, klarifikasi peran Kadus sebagai aktor non-approval. Tidak ada perubahan keputusan teknis/skema — murni penyelarasan dokumen dengan Patch Guide v4.2 dan v5.0. | (isi nama) |

---

## 2. LATAR BELAKANG & TUJUAN SISTEM

Pengelolaan administrasi surat dan data kependudukan di desa masih sering dilakukan secara manual atau menggunakan sistem yang tidak terintegrasi. Hal ini mengakibatkan proses yang lambat, rawan kehilangan data, serta sulitnya pelacakan status dokumen oleh pihak desa.

Sistem Informasi Desa (SID) ini dibangun sebagai platform digital terpadu yang mempermudah administrasi desa. Sistem ini dirancang dengan prinsip modular sehingga dapat dikembangkan secara bertahap sesuai kebutuhan.

**Tujuan Sistem**

- Menyediakan layanan dasar administrasi surat secara digital
- Memungkinkan pengelolaan data desa secara terpusat
- Membangun arsitektur yang dapat dikembangkan (scalable) sesuai kebutuhan
- Menjamin integritas data melalui mekanisme blockchain-inspired hashing
- Memenuhi standar keamanan data kependudukan sesuai regulasi Indonesia (UU PDP, BSSN)
- Menyediakan halaman publik informatif untuk warga desa
- Memberikan akses layanan mandiri (self-service) bagi warga untuk mengajukan permohonan surat secara digital

---

## 3. RUANG LINGKUP

Ruang lingkup ini sangat terbuka pada requirement client setelah observasi pertama.

### 3.1. MVP & Fitur Utama

Fokus utama MVP adalah tiga fitur inti yang membentuk alur kerja administrasi surat.

**Table 2 - Fitur Utama (MVP)**

| Fitur | Deskripsi | Output |
|---|---|---|
| Input Surat | Warga mengajukan permohonan surat secara mandiri (self-service) melalui akun yang telah terdaftar. Data pemohon diambil otomatis dari data akun warga yang login. | Surat diteruskan ke RT untuk approval tahap 1 |
| Approval Surat (Category + Flow Dinamis) | Proses persetujuan berjalan berbasis flow dinamis (tidak lagi hardcode 4 tahap). Untuk kategori Approval Normal dengan flow default 3-tahap-approve: (1) RT memeriksa dan memberikan keputusan pertama (approve/reject), (2) RW menerima notifikasi FYI otomatis (bukan approver, tidak bisa approve/reject/block, murni pemberitahuan pasif), (3) Kepala Desa atau Sekretaris Desa memeriksa dan memberikan keputusan lanjutan (saling menggantikan, siapa lebih dulu action itu yang tercatat), (4) Kasi Pelayanan / Kaur TU Umum memeriksa dan memberikan keputusan Final. Surat yang ditolak di tahap manapun langsung berstatus ditolak. Flow lain untuk kategori/jenis surat berbeda bisa memiliki jumlah dan urutan tahap yang berbeda (misal 2 tahap saja, skip Kades/Sekdes). | Status berubah sesuai Keputusan per-tahap. Tercatat di log sistem |
| Status Tracking | Melihat perkembangan status surat secara real-time | - |
| Validasi Kelayakan Surat | Setiap jenis surat memiliki flag verification_type yang menentukan alur verifikasi kelayakan: <br>• Auto: lolos otomatis jika NIK pemohon terdaftar di database warga<br>• Manual: sistem menampilkan checklist persyaratan, warga wajib konfirmasi saat mengisi form<br>• Document: warga wajib upload dokumen pendukung sebelum permohonan dapat disubmit | - |
| Download Surat | Surat yang sudah kasi approve dapat didownload sebagai PDF. Generate on Demand saat klik tombol download (tidak tersimpan di server) | File PDF |

### 3.2. Fitur Pendukung SID

- Dashboard:
  - Warga: status surat yang diajukan
  - RT: daftar surat wilayah yang menunggu keputusan
  - Petugas Desa:
    - Manajemen User, Role & Jabatan (officials + organisasi non-struktural desa)
    - Manajemen Data Warga:
      - Manual input
      - Import Excel
    - Kelola Peraturan Desa
    - Kelola Info Desa dan Berita Desa
    - Kelola Struktur Wilayah (Dusun/RW/RT)
    - Kelola Setting Deadline Approval per tahap
    - Kelola Data Organisasi Desa (BPD, BUMDES, LPM, Karang Taruna, PKK)
  - RW: daftar surat yang lewat FYI (read-only, bukan lagi menunggu approval — RW sudah bukan approver di v5.0)
  - Kepala Desa / Sekretaris Desa: daftar surat yang menunggu approval mereka (approver aktif di v5.0, bukan lagi monitoring only), query generik berbasis current_step_order
  - Kasi Pelayanan / Kaur TU & Umum: daftar surat dengan current_step_order yang menunjuk ke posisi ini, menunggu keputusan final
- Halaman Publik (beranda, profil desa, berita, info surat, peraturan desa, hubungi kami)
- Registrasi Akun Warga (self-service, validasi NIK warga Cibenda)
- Sistem Notifikasi (in-app & email) dengan chain approval dinamis + reminder deadline

> **Catatan revisi:** Dashboard Kadus sudah dihapus dari daftar ini sesuai Patch 39 (v5.0), karena Kadus tidak lagi terlibat dalam alur approval surat. Jabatan struktural Kadus tetap ada di `officials.position`, tapi tanpa dashboard approval khusus.

### 3.3. Out of Scope (MVP)

- Fitur Create new Tipe Surat lengkap dengan dynamic form requirement field, WYSIWYG template editor, dan CRUD field requirement untuk tipe surat — dipindah menjadi Next Dev - Paket 1 (satu paket utuh, bukan Tahap 2). Tabel letter_type_fields dan letter_field_values tidak ada di MVP sama sekali. Template surat tetap developer-only via seeder di MVP.
- Portal warga self-service dengan pengajuan surat via WhatsApp Bot terintegrasi (Planned Expansion)
- Validasi integritas data Blockchain-inspired hashing (Next Dev — Paket 2).
- Aset Desa & Keuangan Desa (Planned Expansion / Tahap 2)
- Full accounting / APBDes, sistem keuangan desa yang ada di point sebelumnya adalah pencatatan sederhana, bukan APBDes (Planned Expansion / Tahap 2)
- Integrasi blockchain penuh (Ethereum / Hyperledger) (Future Expansion)
- Integrasi API eksternal / Dukcapil, sinkronisasi data kependudukan (Future Expansion)
- Fitur AI (klasifikasi surat, generate surat, smart search) (Future Expansion)
- Data Kelayakan Bantuan Sosial (`citizen_aid_eligibility`, `citizen_aid_history`, `aid_programs`) — dikeluarkan dari MVP, sejajar dengan Aset & Keuangan Desa, karena belum ada use case terkait bansos/DTKS yang dirumuskan (Next Dev / Tahap 2)

### 3.4. Next Dev — Paket 2: Blockchain-Inspired Hashing

**CATATAN PENTING**: Fitur ini dikeluarkan dari MVP dan dipindahkan ke Next Dev — Paket 2. Seluruh detail implementasi tetap dicatat di section ini sebagai referensi pengembangan selanjutnya. Tabel letter_hashes, LetterObserver, GenerateLetterHashJob, dan HashingService tidak diimplementasikan di Tahap 1.

**Latar Belakang & Justifikasi**

Sistem administrasi digital rentan terhadap manipulasi data langsung pada level database, baik melalui celah keamanan maupun penyalahgunaan akses oleh pihak internal. Teknologi blockchain telah terbukti mengatasi permasalahan ini melalui mekanisme hash chain, namun implementasi blockchain penuh memerlukan infrastruktur jaringan yang kompleks dan biaya operasional yang tidak feasible untuk sistem administrasi tingkat desa.

Oleh karena itu, sistem ini mengadopsi konsep inti blockchain mekanisme hash chain berbasis SHA-256 dan mengimplementasikannya pada level database relasional. Pendekatan ini disebut blockchain-inspired data integrity validation.

**Table 3 - Justifikasi Blockchain-Inspired Hashing**

| Pertanyaan Umum | Jawaban / Justifikasi |
|---|---|
| Mengapa tidak pakai blockchain asli? | Blockchain memerlukan konsensus jaringan (nodes), smart contract, dan gas fee. Tujuan kita adalah integritas data, bukan desentralisasi. Pendekatan ini lebih feasible untuk infrastruktur desa. |
| Apa bedanya dengan enkripsi biasa? | SHA-256 adalah one-way hash function tujuannya bukan menyembunyikan data, tapi menghasilkan fingerprint unik yang tidak bisa dipalsukan tanpa terdeteksi. |
| Seberapa aman SHA-256? | SHA-256 adalah standar industri yang digunakan Bitcoin dan TLS. Belum ada collision attack yang berhasil secara praktis hingga saat ini. |
| Limitasi yang harus diakui di laporan | Efektif mendeteksi direct DB manipulation. Tidak efektif jika attacker punya akses kode (bisa regenerate hash). Tidak setara full blockchain jaringan. Cocok sebagai kontribusi akademik dengan analisis kritis yang jujur. |

**Mekanisme Pembuatan Hash**

- Data surat diterima dalam bentuk plaintext
- Ambil field kritis: id, NIK plaintext, letter_type_id, submitted_at, dan prev_hash dari block terakhir
- Generate SHA-256 hash dari kombinasi field tersebut
- Enkripsi NIK dengan AES-256 (setelah hash digenerate)
- Simpan hash ke tabel letter_hashes dengan referensi prev_hash membentuk chain
- Seluruh proses dijalankan dalam satu DB::transaction() untuk konsistensi

**Mekanisme Validasi Integritas**

- Ambil data surat dari database
- Decrypt (buka) kolom terenkripsi untuk mendapatkan nilai plaintext
- Generate ulang SHA-256 hash dari field kritis yang sama
- Bandingkan hash yang baru digenerate dengan hash yang tersimpan di letter_hashes
- VALID: hash cocok data tidak pernah dimodifikasi
- TIDAK VALID: hash berbeda data telah dimodifikasi setelah surat disimpan

**Chain Mechanism**

Setiap block hash menyimpan referensi ke hash block sebelumnya (prev_hash), membentuk rantai yang tidak dapat dimanipulasi sebagian:

- Block 1 → hash1 (prev_hash = NULL)
- Block 2 → hash2 (prev_hash = hash1)
- Block 3 → hash3 (prev_hash = hash2)
- Jika data pada Block 1 diubah → hash1 berubah → chain Block 2 dan 3 ikut rusak

### 3.5. Next Dev — Paket 1: Dynamic Tipe Surat (Create + WYSIWYG + Field Requirement)

> **Catatan revisi:** Sub-section ini sebelumnya menyatu dengan Section 3.4 (Blockchain). Dipisah menjadi section tersendiri sesuai Patch 24 (v4.2) agar dua paket Next Dev yang berbeda konteks (integritas data vs dynamic form) tidak tercampur dalam satu nomor section.

**Latar belakang keputusan:** Fitur dynamic form awalnya direncanakan masuk MVP (developer-inject via seeder), lalu sempat direncanakan masuk Tahap 2 (WYSIWYG). Kemudian diputuskan digabung jadi satu paket Next Dev karena ketiga kebutuhan (create tipe surat baru, WYSIWYG template editor, edit field requirement) butuh infrastruktur tabel yang sama persis. Memisahnya hanya akan membangun setengah infrastruktur yang harus dilengkapi nanti.

**Scope Next Dev Paket 1:**

- Petugas Desa bisa create tipe surat baru (tidak lagi developer-only)
- WYSIWYG template editor menggantikan seeder developer untuk letter_types.template
- Petugas Desa bisa CRUD field requirement per tipe surat (dokumen, checklist, field teks), termasuk untuk tipe surat yang sudah ada dan sudah dipakai warga

**Tabel: letter_type_fields (Next Dev)**

Skema form dinamis per tipe surat.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_type_id | BIGINT | FK → letter_types.id, NOT NULL | Tipe surat pemilik field |
| label | VARCHAR(150) | NOT NULL | Label field yang tampil ke warga |
| field_key | VARCHAR(100) | NOT NULL | Identifier snake_case, unik per letter_type |
| field_type | ENUM | NOT NULL | text \| textarea \| number \| date \| select \| image \| document \| checkbox |
| options | JSON | NULL | Hanya untuk field_type = 'select' |
| is_required | BOOLEAN | DEFAULT true | Wajib diisi warga |
| hint_text | VARCHAR(255) | NULL | Teks bantuan untuk warga |
| validation_rules | JSON | NULL | Contoh: {"max_size_kb":2048,"allowed_ext":["pdf"]} |
| sort_order | INT | DEFAULT 0 | Urutan tampil di form |
| is_active | BOOLEAN | DEFAULT true | Soft delete flag |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel: letter_field_values (Next Dev)**

Jawaban warga per pengajuan.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, NOT NULL | Surat yang mengandung jawaban ini |
| field_id | BIGINT | FK → letter_type_fields.id, NOT NULL | Field yang dijawab |
| field_key | VARCHAR(100) | NOT NULL | Denormalized — untuk histori jika field di-soft-delete |
| value_text | TEXT | NULL | Untuk: text, textarea, number, date, select, checkbox |
| value_file | VARCHAR(255) | NULL | Untuk: image, document (path storage) |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Constraint Edit/Delete Field (untuk referensi Next Dev):**

| Aksi | Field belum dipakai warga | Field sudah dipakai warga |
|---|---|---|
| Edit label, hint_text, is_required, sort_order | Bebas | Bebas |
| Edit field_type | Bebas | Dilarang — soft-delete + buat baru |
| Edit field_key | Bebas | Dilarang — data lama pakai key lama |
| Edit validation_rules | Bebas | Hanya boleh memperlunak, tidak memperketat |
| Edit options (tambah pilihan) | Bebas | Boleh |
| Edit options (rename/hapus yang sudah dipilih) | Bebas | Dilarang |
| Delete | Hard delete | Soft delete (is_active = false) |

Cek "sudah dipakai": `LetterFieldValue::where('field_id', $fieldId)->exists()`

**Status Tabel `letter_types` di MVP vs Next Dev Paket 1:**

| Kolom | MVP | Next Dev Paket 1 |
|---|---|---|
| `template` | Diisi developer via seeder, NULL = Draft | Petugas Desa bisa buat/edit via WYSIWYG |
| `validity_days` | Petugas Desa bisa edit | Tetap bisa edit |
| `assigned_role` | Petugas Desa bisa edit | Tetap bisa edit |
| `is_active` | Petugas Desa bisa toggle | Tetap bisa toggle |
| Buat tipe surat baru | Developer-only | Petugas Desa bisa |
| Field requirement (dokumen/checklist) | Fix, developer-only via seeder | Petugas Desa CRUD bebas (dengan constraint di atas) |

---

## 4. PENGGUNA SISTEM & ROLE

Sistem mendefinisikan sembilan role dengan hak akses yang berbeda. Seluruh role diimplementasikan pada tahap MVP.

**Table 4 - Pengguna dan Role**

| Role | Akses & Kewenangan | Status |
|---|---|---|
| Petugas Desa (Operator) | 1. Login<br>2. CRUD data warga (citizens) manual + excel<br>3. kelola user & jabatan<br>4. kelola profil desa & berita<br>5. kelola struktur wilayah<br>6. setting deadline approval<br>7. kelola peraturan desa<br>8. kelola organisasi desa<br>9. Bisa lebih dari 1 akun aktif bersamaan.<br>10. Full visibility ke seluruh surat dari semua status (baik desa maupun masih di tahap awal) | ✅ MVP |
| Kepala Desa | 1. Login<br>2. Approver aktif (BARU v5.0) — gate baru menggantikan posisi Kadus lama, resolve berbasis posisi (kepala_desa), bukan wilayah<br>3. Dashboard menampilkan daftar surat yang menunggu approval-nya (action item), bukan lagi murni read-only<br>4. Validasi integritas data (Next Dev) | ✅ MVP |
| Sekretaris Desa | 5. Login<br>6. Approver aktif (BARU v5.0), step sama dengan Kepala Desa — keduanya saling menggantikan, siapa lebih dulu action itu yang tercatat (first-action-wins, disederhanakan di application layer, bukan DB constraint) — ⚠ status ini asumsi/rekomendasi default, belum keputusan final eksplisit, perlu dikonfirmasi ulang<br>7. Dashboard sama persis dengan Kepala Desa (approver aktif, bukan lagi murni monitoring)<br>8. Role dipisah agar tidak ambigu saat manajemen jabatan | ✅ MVP |
| Kasi Pelayanan | 1. Login<br>2. memproses surat yang current_step_order-nya menunjuk ke posisi ini (sesuai flow_steps.approver_position), final step<br>3. approve/reject (tahap final)<br>4. generate nomor surat<br>5. terima notifikasi. | ✅ MVP |
| Kaur TU dan Umum | 1. Login<br>2. memproses surat yang current_step_order-nya menunjuk ke posisi ini (sesuai flow_steps.approver_position), final step<br>3. approve/reject (tahap final)<br>4. generate nomor surat<br>5. terima notifikasi. | ✅ MVP |
| Kepala Dusun | 1. Login,<br>2. DIHAPUS TOTAL dari alur approval surat (v5.0) — posisi digantikan Kepala Desa/Sekretaris Desa. Jabatan struktural boleh tetap ada (officials.position='kadus') untuk keperluan non-approval, misal halaman publik struktur desa dan sebagai aktor pasif pada UC login/lihat status.<br>3. terima notifikasi. | ✅ MVP |
| RT | 1. Login<br>2. proses surat pending di wilayahnya<br>3. approve/reject (tahap 1)<br>4. terima notifikasi. | ✅ MVP |
| RW | 1. Login<br>2. NOTIF ONLY (v5.0) — bukan lagi approver, tidak bisa approve/reject/block. Murni penerima notifikasi FYI otomatis begitu RT approve, tidak tercatat sebagai approval level di tabel manapun<br>3. Tidak ada aksi approve/reject apapun — hanya menerima FYI<br>4. terima notifikasi. | ✅ MVP |
| Warga | 1. Register & login akun<br>2. ajukan permohonan surat mandiri (self-service)<br>3. lihat status & riwayat surat miliknya<br>4. download surat yang masih belum habis masa berlakunya<br>5. akses halaman publik | ✅ MVP |
| Warga (Publik) | 1. Akses halaman publik (beranda, profil desa, pengumuman, info jenis surat)<br>2. tanpa login | ✅ MVP (read-only publik) |

> **Catatan status Kadus (v5.0):** Kadus dihapus total sebagai *approver surat*, namun jabatan struktural `officials.position='kadus'` tetap eksis di sistem. Sebagai konsekuensinya, akun Kadus tetap **bisa login** dan tetap muncul sebagai aktor pasif di UC-01 (Login), UC-02 (Logout), UC-05 (Lihat Daftar Surat — hanya melihat, tanpa hak approve apapun), dan UC-06 (Lihat Detail Surat). Ini bukan inkonsistensi; Kadus hanya kehilangan hak approval, bukan akun sistemnya.

**Table 5 - Scope Monitoring Surat per Role**

| Role | Surat Yang Bisa Dilihat |
|---|---|
| Warga | Hanya surat milik sendiri |
| RT | Surat wilayahnya, status pending (step aktif = rt) |
| RW | Surat yang lewat FYI (notifikasi read-only, bukan status filter aktif — RW bukan approver di v5.0) |
| Kepala Desa / Sekretaris Desa | Surat dengan current_step_order menunjuk ke posisi kepala_desa/sekdes, status in_progress (approver aktif di v5.0) |
| Kasi Pelayanan / Kaur TU | Surat dengan current_step_order menunjuk ke posisinya, status in_progress (step final) |
| Petugas Desa | SEMUA surat — dari pending hingga rejected, termasuk yang rejected di step manapun |
| Kadus | Tidak memiliki scope approval khusus (bukan approver sejak v5.0). Jabatan struktural non-approval saja — tidak ada daftar surat "menunggu Kadus" karena Kadus tidak lagi menjadi gate manapun di flow_steps |

---

## 5. ARSITEKTUR & PEMODELAN SISTEM

### 5.1. Arsitektur - Non Teknis

Bagian ini menjelaskan gambaran sistem secara umum menggunakan bahasa yang mudah dipahami oleh semua pihak, termasuk pengguna non-teknis seperti admin desa dan kepala desa.

#### 5.1.1. Gambaran Umum

Sistem Informasi Desa (SID) adalah sebuah platform digital berbasis web yang dirancang untuk membantu pengelolaan administrasi surat-menyurat, serta manajemen data pada desa. Sistem ini dapat diakses melalui browser di komputer maupun perangkat lain yang terhubung ke internet, tanpa perlu menginstal aplikasi khusus.

Secara sederhana, sistem ini bekerja seperti sebuah loket pelayanan digital. Warga dapat secara langsung mengajukan permohonan surat melalui sistem tanpa perlu melalui petugas desa. Sebelum permohonan disetujui, terdapat mekanisme verifikasi berjenjang berbasis flow dinamis (Category + Flow) yang melibatkan Ketua RT (approve), Ketua RW (notifikasi FYI saja, bukan approver), dan Kepala Desa/Sekretaris Desa (approve, menggantikan posisi Kadus lama), sebelum diproses final oleh Kasi/Kaur yang berwenang atas jenis surat tersebut. Jumlah dan urutan tahap approval tidak lagi hardcode — ditentukan oleh flow spesifik jenis surat, sehingga bisa berbeda-beda antar jenis surat meski berada di kategori yang sama. Penolakan di tahap manapun bersifat final (terminal), permohonan langsung ditolak dan warga mendapat notifikasi. Kepala Desa/Sekretaris Desa kini berperan sebagai approver aktif (bukan lagi monitoring only), sedangkan Kadus tidak lagi terlibat dalam alur approval surat. Seluruh proses berlangsung secara digital sehingga tidak perlu lagi membawa berkas fisik antar kantor.

Sistem juga dilengkapi dengan fitur keamanan data untuk melindungi informasi pribadi warga seperti Nomor Induk Kependudukan (NIK) agar tidak dapat dibaca oleh pihak yang tidak berwenang, bahkan sekalipun terjadi kebocoran data pada tingkat teknis. Setiap perubahan yang terjadi pada data surat pun tercatat secara otomatis, sehingga selalu ada jejak yang dapat ditelusuri.

#### 5.1.2. Alur Sistem Kerja

Berikut adalah alur kerja sistem dari awal pengajuan surat oleh warga hingga warga menerima hasil keputusan akhir dari Kasi/Kaur:

**Table 6 - Alur Sistem Kerja**

| No. | Pelaku | Yang Dilakukan | Hasil |
|---|---|---|---|
| 1 | Warga | Login dan mengisi formulir permohonan surat secara mandiri, pilih jenis surat, pengisian form. | Data permohonan tersimpan dengan status PENDING |
| 2 | Sistem | Mencatat waktu pengajuan, menyimpan data, mengirim notifikasi ke RT wilayah warga. | RT wilayah warga mendapat notifikasi |
| 3 | RT | Memeriksa permohonan, memberikan keputusan (approve/reject). | Status: rt_approved atau rt_rejected (terminal) |
| 4a | Sistem (jika RT reject) | Catat keputusan + waktu + IP + kirim notif ke Warga. | Proses selesai (terminal) |
| 4b | Sistem (jika RT approve) | Catat keputusan + waktu + IP + kirim notif FYI ke RW (non-blocking) + kirim notif ke Kepala Desa/Sekretaris Desa secara paralel. | RW mendapat notifikasi FYI (non-blocking) + Kepala Desa/Sekretaris Desa mendapat notifikasi (approver berikutnya) |
| 5 | Kepala Desa / Sekretaris Desa | Memeriksa surat dengan current_step_order sesuai posisinya, memberikan keputusan (approve/reject). Saling menggantikan dengan Sekdes/Kades (first-action-wins). | Status: in_progress atau rejected (terminal) |
| 6a | Sistem (jika Kades/Sekdes reject) | Catat keputusan + kirim notif ke Warga. | Proses selesai (terminal) |
| 6b | Sistem (jika Kades/Sekdes approve) | Catat keputusan, current_step_order += 1, kirim notif ke Kasi/Kaur sesuai assigned_role tipe surat. | Kasi/Kaur mendapat notifikasi |
| 7 | Kasi/Kaur | Memproses surat dengan current_step_order sesuai posisinya (step final), memberikan keputusan final. | Status: approved atau rejected (terminal, dicatat di rejected_at_step) |
| 8 | Sistem (jika approved) | Generate letter_number resmi, hitung expires_at, kirim notif ke Warga + Kades (monitoring). | Surat selesai, siap didownload |
| 9 | Warga | Menerima notifikasi hasil akhir, dapat download PDF surat. | - |

> **Catatan revisi:** Tabel ini disederhanakan dari versi lama yang masih mencantumkan langkah 8a/8b/9/10/11 hardcode untuk "Kadus". Sejak v5.0, alur menggunakan status generik (`pending`/`in_progress`/`approved`/`rejected`) dan pointer `current_step_order`, bukan status granular per posisi. Langkah 7-9 di atas merepresentasikan step final (Kasi/Kaur) sesuai flow default 3-tahap-approve (`RT → Kades/Sekdes → Staff`), sesuai Patch 28 & 35.

#### 5.1.3. Diagram Alur Sistem

⚠ Diagram ada di file lain

### 5.2. Arsitektur Teknis

Bagian ini menjabarkan detail teknis sistem meliputi teknologi yang digunakan, diagram arsitektur, strategi deployment, dan struktur folder project.

#### 5.2.1. Tech Stack

**Tahap 1**

**Table 7 - Tech Stack - Tahap 1**

| Layer | Teknologi | Keterangan |
|---|---|---|
| Backend Framework | Laravel (REST API) | Arsitektur pisah repo - Laravel sebagai pure API provider |
| Authentication | Laravel Sanctum | SPA cookie-based auth, HttpOnly cookie (bukan localStorage) |
| Authorization | spatie/laravel-permission | RBAC, manajemen role dan permission yang robust |
| Audit Trail | spatie/laravel-activitylog | Logging otomatis setiap perubahan data kritis |
| Queue & Jobs | Laravel Queue + Jobs | Proses asinkron: notifikasi, reminder deadline, hashing (Next Dev) |
| Event System | Laravel Events & Listeners | Event-driven: LetterSubmitted, LetterApproved, dll. |
| Notification | Laravel Notifications + Mail | Multi-channel: database (in-app) dan email |
| Observer | Laravel Observer | Auto-trigger hashing saat data surat dibuat/diubah (Next Dev) |
| Scheduler | Laravel Scheduler | Cron job: reminder surat overdue deadline (setiap jam), backup terjadwal |
| Dev Monitoring | Laravel Telescope | Debug dan analisis query (development only) |
| Frontend | React (pisah repo) | SPA - komunikasi via REST API menggunakan Axios |
| Database | PostgreSQL | MVCC, partial index, JSONB, EXPLAIN ANALYZE |
| ORM | Eloquent ORM | Query builder, relasi, enkripsi field via $casts |
| API Docs | Postman / Swagger | Dokumentasi endpoint API yang dapat diexport |
| Data Dummy | Laravel Seeders & Factories | Generate 10.000 - 50.000 records untuk benchmarking |
| PDF Generation | barryvdh/laravel-dompdf | Generate PDF on-demand saat tombol download diklik |
| Import Data | maatwebsite/excel | Import data warga massal dari file Excel/CSV |

**Tahap 2**

**Table 8 - Tech Stack - Tahap 2**

| Layer | Teknologi | Keterangan |
|---|---|---|
| Queue Driver | Redis | Upgrade dari database driver, performa queue lebih tinggi |
| Queue Monitoring | Laravel Horizon | Dashboard real-time monitoring queue worker (aktif jika pakai Redis) |
| Caching | Redis Cache | Cache query berat (dashboard, laporan keuangan) |
| Containerization | Docker + Laravel Sail | Kontenerisassi, PHP 8.3, PostgreSQL 16, Redis, Mailpit |
| WA Bot Integration | WhatsApp Business API (Fonnte / Twilio) | Channel alternatif pengajuan surat warga |

#### 5.2.2. Diagram Arsitektur Teknis

⚠ Diagram ada di file lain

#### 5.2.3. Sistem Notifikasi & Event Architecture

**Trigger Notifikasi**

**Table 9 - Trigger Notification**

| Event | Penerima Notifikasi | Status Surat | Keterangan |
|---|---|---|---|
| Warga submit surat baru | RT wilayah warga | pending | Resolve via citizens.rt_id |
| RT approve surat | RW (notifikasi FYI) + Kepala Desa/Sekretaris Desa | in_progress | RW: resolve via rts.rw_id, murni FYI non-blocking. Kades/Sekdes: resolve via officials.position IN ('kepala_desa','sekdes') |
| RT reject surat | Warga | rejected | TERMINAL, rejected_at_step = step RT |
| Kepala Desa/Sekretaris Desa approve surat | Kasi/Kaur sesuai letter_types.assigned_role | in_progress | current_step_order += 1, resolve via assigned_role ENUM |
| Kepala Desa/Sekretaris Desa reject surat | Warga | rejected | TERMINAL, rejected_at_step = step Kades/Sekdes |
| Kasi/Kaur approve surat | Kepala Desa (monitoring) + Warga | approved | Generate letter_number + expires_at. PDF siap didownload. |
| Kasi/Kaur reject surat | Warga | rejected | TERMINAL |
| Deadline terlewati | Pejabat yang belum action (reminder) | Tidak berubah | Scheduler kirim reminder setiap jam. is_overdue = true. |
| Fallback: RT tidak ditemukan | Semua petugas_desa aktif (broadcast) | - | Jika RT wilayah kosong/tidak ditemukan |

**Alur Teknis**

- Action terjadi (submit / approve RT / reject RT / approve Kades-Sekdes / reject Kades-Sekdes / approve Kasi/Kaur / reject Kasi/Kaur) → Controller memanggil Event
- Laravel Event didispatch → Listener menerima dan memproses
- Listener mendispatch Notification Job ke Queue
- Queue worker memproses job secara asinkron, response API tidak tertunda
- Notifikasi tersimpan ke tabel notifications (database channel)
- Opsional: email dikirim via Laravel Mail (email channel)
- Frontend polling atau WebSocket (Laravel Echo) menampilkan notifikasi real-time
- Scheduler SendApprovalReminderJob berjalan setiap jam, cek letter_approvals.deadline_at yang terlewat

> **Catatan revisi:** RW dihilangkan dari daftar aksi "Action terjadi" karena RW tidak pernah memanggil endpoint decision/approval (v5.0) — notifikasi ke RW murni side-effect otomatis begitu RT approve, sesuai Patch 29 & 38.

#### 5.2.4. Blockchain-Inspired Hashing Implementation

⚠ Diagram ada di file lain

**Implementasi Laravel**

- Laravel Observer auto-trigger saat model Letter dibuat
- Laravel Background Job (GenerateLetterHash) dijalankan via Queue agar tidak memblokir response
- HashingService service class yang mengelola logika hash dan validasi

#### 5.2.5. Diagram Deployment Architecture

⚠ Diagram ada di file lain

#### 5.2.6. Struktur Folder Project

⚠ Diagram ada di file lain

### 5.3. Pemodelan Sistem

#### 5.3.1. Usecase

⚠ Diagram ada di file lain

> **Catatan revisi:** Diagram use case Kadus (approval) sudah tidak relevan sejak v5.0 dan dihapus dari daftar rujukan. Diagram use case yang relevan sekarang: Login/Logout, Input Surat, RT Approval, Kades/Sekdes Approval (generik), Staff/Kasi-Kaur Approval Final, dan seluruh UC administratif (UC-09 s/d UC-24). Diagram aktual tetap berada di file PlantUML terpisah.

#### 5.3.2. Usecase Description

**UC-01: Login**

**Table 10 - Usecase 1 - Login**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-01 |
| Nama | Login |
| Aktor | Warga, RT, RW, Kadus (akun tetap ada, tanpa hak approval — lihat catatan Section 4), Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
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

**UC-02: Logout**

**Table 11 - Usecase 2 - Logout**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-02 |
| Nama | Logout |
| Aktor | Warga, RT, RW, Kadus (akun tetap ada, tanpa hak approval), Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login dan session aktif |
| Post-condition | Session dihapus, user diarahkan ke halaman login |

Main Flow:
1. User menekan tombol Logout
2. Sistem menghapus token Sanctum dari sisi server
3. Sistem menghapus HttpOnly cookie dari browser
4. Sistem mencatat event logout (timestamp, IP, user agent)
5. Sistem mengarahkan user ke halaman login

**UC-03: Input Permohonan Surat**

**Table 12 - Usecase 3 - Input Permohonan Surat**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-03 |
| Nama | Input Permohonan Surat |
| Aktor | Warga |
| Pre-condition | Warga sudah login dengan akun terdaftar, jenis surat tersedia (template != NULL + is_active = true) |
| Post-condition | Permohonan tersimpan dengan status PENDING, hash integritas dibuat otomatis via queue (Next Dev), notifikasi terkirim ke RT wilayah warga |

Main Flow:
1. Warga membuka menu "Ajukan Permohonan Surat"
2. Warga memilih jenis surat (hanya tampil yang template != NULL AND is_active = true)
3. Sistem menampilkan persyaratan berdasarkan verification_type jenis surat:
   - auto → sistem otomatis validasi jika NIK warga terdaftar, lanjut submit
   - manual → sistem tampilkan checklist persyaratan, warga wajib konfirmasi kelengkapan
   - document → sistem tampilkan form upload dokumen pendukung; wajib diisi sebelum submit
4. Sistem mengambil data warga dari auth()->user()->citizen secara otomatis (nama, NIK, alamat sudah terisi dari akun yang login)
5. Warga melengkapi form (keperluan, catatan tambahan)
6. Jika verification_type = document → Warga upload dokumen pendukung
7. Warga submit permohonan
8. Sistem memvalidasi semua input (field wajib, format)
9. Sistem resolve RT wilayah warga via OfficialService (berdasarkan citizens.rt_id)
10. Sistem menyimpan data dalam DB::transaction():
    - citizen_id = auth()->user()->citizen_id
    - submitted_by = auth()->user()->id (role: warga)
    - NIK dienkripsi AES-256 → applicant_nik
    - SHA-256 dari NIK plaintext → applicant_nik_hash
    - status = pending, submitted_at = now()
    - flow_id = snapshot dari letter_types.flow_id, current_step_order = 1
    - INSERT ke letter_status_logs (status: pending, actor_id, IP)
11. Sistem men-dispatch SendNotificationJob ke RT yang berwenang
12. Sistem menampilkan konfirmasi sukses ke Warga

Alternative Flow:
- 6a. Ukuran file dokumen melebihi batas → error "File terlalu besar"
- 8a. Validasi gagal → tampilkan pesan error per field; tidak menyimpan data
- 9a. RT wilayah tidak ditemukan / jabatan kosong → surat tetap tersimpan PENDING, notifikasi dikirim ke semua petugas_desa aktif (broadcast fallback)

**UC-04a: RT Approval / Rejection Surat**

**Table 13 - Usecase 4a - RT Approval**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04a |
| Nama | RT Approval / Rejection Surat (Tahap 1) |
| Aktor | RT |
| Pre-condition | RT sudah login; ada surat dengan status PENDING di wilayahnya |
| Post-condition | Status surat berubah (in_progress / rejected), log tercatat, notifikasi terkirim |

Main Flow:
1. RT membuka daftar surat wilayahnya berstatus PENDING
2. RT membuka detail permohonan
3. RT memeriksa data pemohon dan keperluan surat
4. RT memilih tindakan: Setujui atau Tolak
5. RT mengisi catatan keputusan (wajib jika menolak)
6. Sistem memvalidasi bahwa RT berwenang atas wilayah surat ini (via OfficialService cek rt_id)
7. Sistem memproses dalam DB::transaction():
   - Jika SETUJUI: UPDATE current_step_order += 1, status = in_progress, isi processed_at
   - Jika TOLAK: UPDATE status = rejected, rejected_at_step = step RT, isi processed_at
   - INSERT ke letter_approvals (approval_level: 'rt', action, notes, approved_by, flow_step_id, deadline_at)
   - INSERT ke letter_status_logs (old: pending, new: in_progress/rejected, actor_id, IP)
8. Jika approve: Sistem resolve RW wilayah (FYI, non-blocking) + resolve Kades/Sekdes (approver berikutnya) → dispatch notifikasi ke keduanya secara paralel
9. Jika reject: Sistem dispatch notifikasi ke Warga (TERMINAL)
10. Sistem menampilkan konfirmasi keputusan ke RT

Authorization:
- Hanya RT yang rt_id-nya sesuai dengan wilayah warga pemohon yang boleh approve
- 5a. RT memilih Tolak tanpa catatan → sistem meminta catatan wajib diisi

**Notifikasi RW (Side-Effect, Non-Blocking) — Bukan Use Case Approval Tersendiri**

> Sejak v5.0, RW tidak lagi punya use case approval sendiri (UC lama "UC-04b: RW Approval" dihapus total). Sub-flow berikut menggantikannya sebagai bagian dari efek samping UC-04a:

Main Flow (side-effect, dijalankan otomatis, bukan aksi user):
1. RT approve surat (di UC-04a)
2. Sistem resolve RW wilayah warga (via rts.rw_id) secara paralel/independent
3. Sistem dispatch notifikasi FYI ke RW — murni pemberitahuan, tidak ada tombol approve/reject/block apapun di sisi RW
4. Secara bersamaan (TIDAK menunggu aksi RW), sistem langsung lanjut resolve approver berikutnya (Kepala Desa/Sekretaris Desa) dan dispatch notifikasi ke mereka
5. RW dapat melihat riwayat notifikasi yang pernah diterima di dashboard-nya (read-only, lihat UC-15)

Catatan Penting:
- RW TIDAK PERNAH tercatat sebagai approval_level di tabel letter_approvals
- RW TIDAK memblokir alur surat — surat langsung lanjut ke step berikutnya begitu RT approve
- Fallback notifikasi RW kosong/tidak ditemukan: broadcast ke semua petugas_desa aktif (pola sama dengan fallback RT)

**UC-04c: Kepala Desa / Sekretaris Desa Approval / Rejection Surat**

**Table 14 - Usecase 4c (baru) - Kades/Sekdes Approval**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04c |
| Nama | Kepala Desa / Sekretaris Desa Approval / Rejection Surat |
| Aktor | Kepala Desa ATAU Sekretaris Desa (saling menggantikan, first-action-wins) |
| Pre-condition | User sudah login sebagai kepala_desa atau sekretaris_desa; ada surat dengan current_step_order menunjuk ke step approver_position IN ('kepala_desa','sekdes') |
| Post-condition | letters.status berubah jadi in_progress (jika masih ada step berikut) atau approved/rejected (jika step ini is_final); current_step_order bertambah jika approve |

Main Flow:
1. User membuka daftar surat dengan step aktif = posisi dirinya (query generik: JOIN flow_steps ON flow_id & current_step_order, WHERE approver_position = posisi user)
2. User membuka detail, memeriksa riwayat approval sebelumnya (RT + FYI RW)
3. User memilih Setujui/Tolak, isi catatan jika menolak
4. Sistem cek: apakah surat masih di step yang sesuai (gate logic, re-validasi race condition disederhanakan di app layer)
5. Jika SETUJUI: INSERT ke letter_approvals (approval_level sesuai role aktor, flow_step_id terisi), current_step_order += 1, status jadi in_progress atau approved jika step berikutnya is_final
6. Jika TOLAK: status jadi rejected, rejected_at_step dicatat (TERMINAL)
7. Notifikasi ke step berikutnya (jika approve) atau ke Warga (jika reject/final approve)

Catatan:
1. Tidak ada DB-level lock untuk mencegah Kades & Sekdes approve bersamaan — disederhanakan sebagai app-layer check (first-action-wins)
2. ⚠ Status Sekdes ikut approve di step sama dengan Kades adalah rekomendasi/asumsi default, BELUM keputusan final eksplisit, perlu dikonfirmasi ulang

> **Catatan revisi:** UC-04c versi lama ("Kadus Approval") sudah **dihapus total** sejak v5.0 (Patch 37) karena Kadus tidak lagi bagian dari alur approval. Nomor UC-04c di-reuse untuk use case baru ini (Kades/Sekdes Approval), sesuai penomoran yang dipakai di Patch Guide v5.0.

**UC-04d: Kasi / Kaur Approval / Rejection Surat (Final Step)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-04d |
| Nama | Kasi / Kaur Approval / Rejection Surat (Final Step) |
| Aktor | Kasi Pelayanan atau Kaur TU & Umum (sesuai flow_steps.approver_position pada step is_final=true) |
| Pre-condition | Kasi/Kaur sudah login; ada surat dengan current_step_order menunjuk ke step approver_position sesuai role-nya dan is_final=true |
| Post-condition | Status surat berubah (approved / rejected). Jika approved: letter_number digenerate, expires_at dihitung, PDF siap didownload, notifikasi ke Warga + Kades/Sekdes (monitoring). |

Main Flow:
1. Kasi/Kaur membuka daftar surat dengan current_step_order menunjuk ke posisinya (query generik: JOIN flow_steps ON flow_id & current_step_order)
2. Kasi/Kaur membuka detail permohonan beserta seluruh riwayat keputusan sebelumnya (RT, FYI RW, Kades/Sekdes)
3. Kasi/Kaur memilih tindakan: Setujui atau Tolak
4. Kasi/Kaur mengisi catatan keputusan (wajib jika menolak)
5. Sistem memvalidasi: step saat ini adalah step is_final=true dan approver_position sesuai role user
6. Sistem memproses dalam DB::transaction():
   - Jika SETUJUI: UPDATE status = 'approved', generate letter_number, hitung expires_at (jika validity_days tidak NULL)
   - Jika TOLAK: UPDATE status = 'rejected', rejected_at_step dicatat (TERMINAL)
   - INSERT ke letter_approvals (approval_level sesuai role aktor, flow_step_id terisi, action, notes, approved_by)
   - INSERT ke letter_status_logs (old: in_progress, new: approved/rejected, actor_id, IP)
7. Jika approved: dispatch notifikasi ke Warga + Kades/Sekdes (monitoring)
8. Jika rejected: dispatch notifikasi ke Warga (TERMINAL)

Authorization:
- Hanya user dengan role sesuai flow_steps.approver_position pada step aktif yang bisa approve
- Surat dengan current_step_order yang tidak sesuai tidak bisa diakses (disabled / 403)
- 4a. Kasi/Kaur memilih Tolak tanpa catatan → sistem meminta catatan wajib diisi

**UC-05: Lihat Daftar Surat**

**Table 15 - Usecase 5 - View Daftar Surat**

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
    - RT: surat wilayahnya, status 'pending' (step aktif = rt)
    - RW: surat yang lewat FYI (read-only, tidak ada filter status aktif karena RW bukan approver di v5.0)
    - Kepala Desa / Sekretaris Desa: surat dengan current_step_order menunjuk ke posisi kepala_desa/sekdes, status in_progress
    - Kasi/Kaur: surat dengan current_step_order menunjuk ke posisinya (step final), status in_progress
    - Petugas Desa: SEMUA surat tanpa filter status (full visibility pipeline)
    - Kadus: tidak memiliki filter approval khusus (bukan approver); jika ditampilkan sama sekali, hanya sebagai referensi struktur wilayah non-approval
4. User dapat memfilter berdasarkan: status (sesuai role), jenis surat, periode, nama pemohon
5. Sistem menampilkan daftar dengan informasi: nomor surat, pemohon, jenis, status, tanggal
6. Sistem menampilkan badge 'overdue' jika is_overdue = true

**UC-06: Lihat Detail & Status Surat**

**Table 16 - Usecase 6 - Detail dan Status Surat**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-06 |
| Nama | Lihat Detail & Status Surat |
| Aktor | Warga, RT, RW, Kadus (read-only), Kasi Pelayanan, Kaur TU & Umum, Petugas Desa, Kepala Desa, Sekretaris Desa |
| Pre-condition | User sudah login, surat sudah ada di sistem |
| Post-condition | Sistem menampilkan detail surat dan seluruh riwayat perubahan status |

Main Flow:
1. User memilih surat dari daftar
2. Sistem mengambil data surat beserta relasi (letter_type, statusLogs, approvals, hash)
3. Sistem menampilkan:
   - Detail data pemohon (nama, NIK ter-mask, keperluan)
   - Status terkini dengan badge warna (pending / in_progress / approved / rejected) — detail 'sedang di step mana' dilihat dari current_step_order + JOIN ke flow_steps
   - Indikator di tahap mana surat berada (RT / RW-FYI / Kades-Sekdes / Kasi-Kaur)
   - Informasi approval RT (jika sudah diproses RT)
   - Informasi notifikasi FYI RW (jika sudah dikirim)
   - Timeline riwayat: setiap perubahan status + timestamp + aktor + catatan + IP
   - Badge 'overdue' jika deadline terlewati
   - Informasi approval Kades/Sekdes (jika sudah diproses)
   - Informasi approval Kasi/Kaur (jika sudah diproses)
4. Tombol Download PDF muncul jika status = approved (step final). Untuk warga: disabled jika expires_at sudah lewat. Untuk petugas/kasi/kades: selalu aktif

**UC-07: Validasi Integritas Data Surat**

Status: NEXT DEV (Paket 2) — Tidak ada di MVP. Tabel letter_hashes dan HashingService belum diimplementasikan di Tahap 1.

**Table 17 - Usecase 7 - Validasi Integritas Surat (Next Dev)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-07 |
| Nama | Validasi Integritas Data Surat |
| Aktor | Kepala Desa |
| Pre-condition | Kepala Desa sudah login, surat dan hash-nya sudah tersimpan di letter_hashes |
| Post-condition | Sistem menampilkan hasil validasi integritas data surat |

Main Flow:
1. Kepala Desa membuka detail surat
2. Kepala Desa menekan tombol "Validasi Integritas"
3. Sistem memanggil HashingService::validateIntegrity(letterId)
4. Service mengambil data surat dari DB dan mendekripsi NIK (AES-256)
5. Service meng-generate ulang SHA-256 hash dari field kritis (id, NIK, type_id, submitted_at, prev_hash)
6. Service membandingkan hash baru dengan hash tersimpan di letter_hashes
7. Hasil:
   - VALID → data otentik, tidak ada modifikasi sejak surat dibuat
   - TIDAK VALID → terdeteksi modifikasi; sistem tandai is_valid = false di letter_hashes

**UC-08: Download Surat (PDF On-Demand)**

**Table 18 - Usecase 8 - Download Surat (PDF On-Demand)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-08 |
| Nama | Download Surat (PDF On-Demand) |
| Aktor | Warga (dengan cek expires_at), Petugas Desa, Kasi Pelayanan, Kaur TU & Umum, Kepala Desa |
| Pre-condition | User sudah login, surat sudah berstatus 'approved' |
| Post-condition | File PDF ter-download (di-generate on-demand, tidak disimpan di server) |

Main Flow:
1. User membuka detail surat berstatus approved
2. User menekan tombol 'Download Surat PDF'
3. Backend melakukan pengecekan:
   - Jika role = warga: cek expires_at → jika sudah lewat → 403 "Masa berlaku surat telah habis"
   - Jika role = petugas_desa / kasi_pelayanan / kaur_tu_umum / kepala_desa → tidak cek expires_at
4. Sistem mengambil template dari letter_types.template (HTML Blade)
5. Sistem inject data: nomor surat, data pemohon, keperluan, tanggal
6. Sistem mengambil TTD dan stempel dari officials (Kades aktif: is_active=true AND ended_at IS NULL)
7. barryvdh/laravel-dompdf generate PDF dari template yang sudah diisi data
8. Sistem mengembalikan binary PDF langsung (tidak disimpan file di server)

Alternative Flow:
- 3a. Status bukan approved → tombol Download tidak muncul
- 3b. Warga + expires_at sudah lewat → 403, tombol disabled di UI

**UC-09: Kelola Data Warga - CRUD Citizens**

**Table 19 - Usecase 9 - CRUD Warga**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-09 |
| Nama | Kelola Data Warga (CRUD Citizens) |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Data warga berhasil dibuat / diupdate di tabel citizens |

Main Flow - Tambah Warga:
1. Petugas Desa membuka menu "Data Warga"
2. Petugas memilih "Tambah Warga Baru"
3. Petugas mengisi form:
   - NIK (16 digit numerik), nama lengkap, tempat & tanggal lahir
   - Jenis kelamin, alamat, rt_id, hamlet_id (pilih dari dropdown yang terisi data tabel rts dan hamlets)
   - Status perkawinan, pekerjaan
   - Agama, pendidikan terakhir, domicile_status (status domisili), current_domicile (alamat domisili saat ini jika tidak menetap)
   - BARU v5.0: blood_type (golongan darah), residency_type (lokal/pendatang), origin_region (jika pendatang)
   - BARU v5.0: father_id/father_name_text (pilih dari data warga terdaftar atau isi teks bebas jika tidak terdaftar), mother_id/mother_name_text (sama)
   - BARU v5.0: family_id (pilih dari dropdown KK yang sudah ada, atau buat KK baru via sub-flow Kelola Data Keluarga di bawah), family_role (kepala_keluarga/istri/suami/anak/famili_lain)
4. Sistem memvalidasi:
   - Format NIK: 16 digit numerik wajib
   - Keunikan NIK: generate SHA-256 dari NIK → cek di nik_hash
5. Sistem menyimpan:
   - nik → dienkripsi AES-256
   - nik_hash → SHA-256 dari NIK plaintext (untuk indexing)
   - address → dienkripsi AES-256
6. Sistem menampilkan konfirmasi "Data warga berhasil disimpan"

Main Flow - Edit Warga:
1. Petugas membuka data warga dari daftar
2. Petugas memilih "Edit"
3. Petugas mengubah field yang diperlukan (kecuali NIK tidak bisa diubah)
4. Sistem menyimpan perubahan dan memperbarui data

Main Flow - Lihat & Cari Warga:
1. Petugas membuka menu "Data Warga"
2. Petugas dapat mencari berdasarkan: nama (LIKE) atau NIK (converted to hash)
3. Sistem menampilkan daftar dengan: nama, NIK ter-mask (****xxxx), alamat, status

Main Flow - Import Excel:
1. Petugas memilih 'Import Data Warga dari Excel'
2. Petugas upload file Excel (.xlsx / .csv) sesuai template yang disediakan
3. Sistem memvalidasi format file dan header kolom
4. Sistem memproses via maatwebsite/excel: validasi per baris (format NIK, duplikat)
5. Sistem menyimpan data yang valid, skip baris yang error
6. Sistem menampilkan ringkasan: jumlah berhasil, jumlah error beserta detail per baris

Alternative Flow:
- 4a. NIK sudah terdaftar → sistem tampilkan error "NIK sudah ada dalam database warga"
- 4b. Format NIK salah → sistem tampilkan error "NIK harus 16 digit angka"

Catatan Alur Update KTP/KK (v5.0):
Karena Petugas Desa sifatnya asesor/pencatat administratif, bukan penerbit resmi (penerbitan tetap di Kecamatan/Dukcapil), maka UC-09 tetap sebagai tempat Petugas Desa mencatat ulang data yang sudah resmi berubah di Kecamatan (misal warga bawa KK baru, Petugas input update ke families/citizens). Ini murni pencatatan administratif desa, BUKAN proses penerbitan — tidak perlu approval flow apapun (RT/Kades/dst), cukup CRUD biasa oleh Petugas Desa.

Main Flow - Kelola Data Keluarga (KK):
- Petugas Desa buka menu "Data Keluarga (KK)"
- Tambah KK baru: input no_kk, family_address, pilih rt_id/hamlet_id
- Tambah anggota ke KK: pilih/buat citizen, set family_role, FK ke family_id
- Sistem otomatis validasi: hanya 1 family_role='kepala_keluarga' per family_id aktif

**UC-11: Kelola Aset Desa**

Status: TAHAP 2 — Dikeluarkan dari MVP. Tabel village_assets / village_finances tidak ada di MVP Tahap 1.

**Table 20 - Usecase 11 - Kelola Aset Desa (Tahap 2)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-11 |
| Nama | Kelola Aset Desa (CRUD) |
| Aktor | Petugas Desa (CRUD) / Kepala Desa (Read only) |
| Pre-condition | Petugas Desa/Kepala Desa sudah login |
| Post-condition | Data aset berhasil dibuat / diupdate / dihapus di tabel village_assets |

Main Flow - Tambah Aset:
1. Petugas membuka menu "Aset Desa"
2. Petugas memilih "Tambah Aset Baru"
3. Petugas mengisi form:
    - Kode aset (unik per desa), nama aset, kategori (Tanah, Bangunan, Kendaraan, Peralatan, dll)
    - Lokasi, nilai (Rp), kondisi (Baik / Rusak Ringan / Rusak Berat)
    - Tanggal perolehan, keterangan tambahan
4. Sistem memvalidasi kode aset unik dalam lingkup desa
5. Sistem menyimpan data; mencatat created_by = petugas_id
6. Sistem menampilkan konfirmasi sukses

Main Flow - Edit Aset:
1. Petugas memilih aset dari daftar → pilih "Edit"
2. Petugas mengubah field yang diperlukan (kondisi, nilai, lokasi, dll.)
3. Sistem menyimpan perubahan

Main Flow - Hapus Aset:
1. Petugas memilih aset → pilih "Hapus"
2. Sistem menampilkan konfirmasi "Yakin ingin menghapus aset ini?"
3. Petugas konfirmasi → sistem menghapus data (soft delete atau hard delete)

Main Flow - Lihat & Filter:
1. Petugas / Kepala Desa membuka menu "Aset Desa"
2. User dapat memfilter berdasarkan: kondisi, kategori, lokasi
3. Sistem menampilkan daftar aset beserta total nilai aset

Alternative Flow:
- 4a. Kode aset sudah terdaftar → sistem tampilkan error "Kode aset sudah digunakan"

**UC-12: Catat Transaksi Keuangan Desa**

Status: TAHAP 2 — Dikeluarkan dari MVP. Tabel village_assets / village_finances tidak ada di MVP Tahap 1.

**Table 21 - Usecase 12 - Catat Transaksi Keuangan Desa (Tahap 2)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-12 |
| Nama | Catat Transaksi Keuangan Desa |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Transaksi tersimpan di village_finances, dashboard keuangan diperbarui |

Main Flow:
1. Petugas membuka menu "Keuangan Desa"
2. Petugas memilih "Catat Transaksi Baru"
3. Petugas memilih tipe: Pemasukan atau Pengeluaran
4. Petugas mengisi form:
    - Tanggal transaksi, kategori (Dana Desa / PAD / Operasional / Infrastruktur / dll.)
    - Nominal (Rp), keterangan / deskripsi transaksi
5. Sistem menyimpan transaksi; mencatat recorded_by = petugas_id
6. Sistem memperbarui ringkasan dashboard keuangan (total pemasukan, pengeluaran, saldo)
7. Sistem menampilkan konfirmasi sukses

Main Flow - Edit Transaksi:
1. Petugas membuka daftar transaksi → pilih "Edit"
2. Petugas mengubah field yang diperlukan
3. Sistem menyimpan perubahan

Main Flow - Hapus Transaksi:
1. Petugas memilih transaksi → pilih "Hapus"
2. Sistem konfirmasi → hapus data

Alternative Flow:
- 4a. Nominal diisi 0 atau negatif → sistem tampilkan error "Nominal harus lebih dari 0"

**UC-13: Lihat Laporan Keuangan & Rekap Aset**

Status: TAHAP 2 — Dikeluarkan dari MVP. Tabel village_assets / village_finances tidak ada di MVP Tahap 1.

**Table 22 - Usecase 13 - Laporan Keuangan dan Rekap Aset (Tahap 2)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-13 |
| Nama | Lihat Laporan Keuangan & Rekap Aset |
| Aktor | Petugas Desa, Kepala Desa |
| Pre-condition | User sudah login |
| Post-condition | Sistem menampilkan laporan sesuai filter yang dipilih; dapat dicetak / diexport |

Main Flow - Laporan Keuangan:
1. User membuka menu "Laporan" → pilih "Keuangan Desa"
2. User menentukan filter periode (bulan & tahun)
3. Sistem mengambil data dari village_finances sesuai filter
4. Sistem menampilkan:
    - Tabel daftar transaksi (tanggal, tipe, kategori, nominal, keterangan)
    - Ringkasan: total pemasukan, total pengeluaran, saldo periode
    - Grafik sederhana pemasukan vs pengeluaran (opsional)
5. User dapat mencetak atau export ke PDF / Excel

Main Flow - Rekap Aset:
1. User membuka menu "Laporan" → pilih "Aset Desa"
2. User dapat memfilter berdasarkan: kondisi, kategori
3. Sistem mengambil data dari village_assets sesuai filter
4. Sistem menampilkan:
    - Tabel daftar aset (kode, nama, kategori, lokasi, nilai, kondisi)
    - Ringkasan: total aset, total nilai, jumlah per kondisi (baik / rusak ringan / rusak berat)
5. User dapat mencetak atau export laporan

**UC-14: Kelola User & Role**

**Table 23 - Usecase 14 - Kelola User dan Role**

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
3. Petugas mengisi / mengubah data:
    - Untuk akun RT/RW/Kadus/Kades/Kasi/Kaur: nama, email, role, rt_id/rw_id/hamlet_id (sesuai jabatan), citizen_id, started_at, status aktif
    - Untuk akun Petugas Desa: nama, email, role, status aktif
    - Untuk jabatan Sekretaris Desa (sekdes di officials): saat Petugas Desa assign/update jabatan Sekdes, sistem otomatis set users.role = 'sekretaris_desa' pada akun yang bersangkutan (bukan kepala_desa). Dashboard yang muncul saat login adalah dashboard Sekdes.
4. Sistem memvalidasi: email unik, role valid (9 nilai ENUM: warga, rt, rw, kadus, kasi_pelayanan, kaur_tu_umum, petugas_desa, kepala_desa, sekretaris_desa), citizen_id valid
5. Untuk pembuatan akun jabatan baru: sistem INSERT ke tabel officials (citizen_id, user_id, position, rt_id/rw_id/hamlet_id, started_at)
6. Untuk rotasi jabatan (pergantian pejabat lama): sistem UPDATE officials SET ended_at = today, is_active = false
7. Jika posisi yang dirotasi adalah sekdes: sistem UPDATE users SET role = 'sekretaris_desa' pada akun baru
8. Sistem menyimpan perubahan ke tabel users
9. Sistem mencatat aktivitas di log audit (spatie/activitylog)

Alternative Flow:
- 4a. Email sudah terdaftar → error "Email sudah digunakan"
- 4b. citizen_id tidak ditemukan di citizens → error "Data kependudukan tidak ditemukan"
- 4c. Guard: Petugas Desa tidak bisa nonaktifkan diri sendiri, dan tidak bisa nonaktifkan satu-satunya petugas_desa aktif yang tersisa

> **Catatan:** Meski Kadus tetap dicantumkan dalam daftar jabatan yang dikelola di UC-14 (karena jabatan strukturalnya masih ada), Kadus tidak lagi punya relevansi terhadap `flow_steps.approver_position` sejak v5.0.

**UC-15: Lihat Dashboard & Statistik**

**Table 24 - Usecase 15 - Dashboard dan Statistik**

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

Dashboard Warga:
- Daftar surat yang pernah diajukan beserta status terkini
- Indikator visual status (di tahap RT / RW-FYI / Kades-Sekdes / Kasi-Kaur / selesai)
- Notifikasi belum dibaca

Dashboard RT:
- Jumlah surat wilayah: total pending, sudah diproses
- Daftar surat yang menunggu keputusan RT
- Notifikasi belum dibaca

Dashboard RW (BERUBAH TOTAL v5.0):
- Bukan lagi 'daftar surat menunggu approval', jadi 'daftar surat yang lewat FYI' — read-only, tanpa tombol approve/reject sama sekali
- RW hanya melihat riwayat notifikasi yang pernah diterima

Dashboard Petugas Desa:
- Jumlah warga terdaftar
- Full visibility semua surat (semua status, termasuk rejected)
- Widget aset & keuangan tidak ada di MVP (dipindah ke Tahap 2)
- Notifikasi belum dibaca

Dashboard Kasi/Kaur:
- Jumlah surat dengan current_step_order yang diassign ke role-nya (step final)
- Daftar surat menunggu keputusan final
- Notifikasi belum dibaca, badge overdue

Dashboard Kepala Desa / Sekretaris Desa (BERUBAH v5.0):
- Dari 'monitoring only, hanya lihat status level desa ke atas' menjadi approver aktif — dashboard sekarang menampilkan daftar surat yang menunggu approval mereka (query generik berbasis current_step_order), bukan lagi murni read-only
- Daftar surat dengan current_step_order menunjuk ke posisi kepala_desa/sekdes, status in_progress
- Filter status surat
- (Statistik per periode → Out of Scope / Planned Expansion)
- Notifikasi belum dibaca
- Dashboard Kepala Desa dan Sekretaris Desa identik (approver aktif, saling menggantikan)

> **Catatan revisi:** Dashboard Kadus dihapus total dari daftar UC-15, sesuai Patch 39 (v5.0), karena Kadus tidak lagi punya action item approval apapun. Kadus tidak dicantumkan lagi sebagai aktor dashboard aktif di UC-15 — hanya tetap muncul sebagai aktor UC-01/02/05/06 (login & lihat-saja).

**UC-16: Lihat Halaman Publik (Warga Tanpa Login)**

**Table 25 - Usecase 16 - Halaman Publik (Warga)**

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
   - Beranda - sambutan kepala desa, info singkat desa, statistik publik
   - Profil Desa - sejarah, visi misi, struktur pemerintahan desa
   - Pengumuman & Berita - daftar berita/pengumuman yang sudah dipublikasikan
   - Info Jenis Surat - daftar jenis surat yang tersedia beserta persyaratannya
   - Peraturan Desa - daftar peraturan desa yang sudah dibuat
   - Hubungi Kami - nomor WA dari officials dengan position IN ('kasi_pelayanan', 'kaur_tu_umum') yang is_active=true
4. Semua konten halaman publik hanya dapat dibaca (read-only), tidak ada aksi input

Notes:
- Halaman publik berfungsi sebagai landing page sebelum login
- Warga yang ingin mengajukan surat diarahkan untuk login / register terlebih dahulu
- Konten diambil dari tabel news (is_published = true) dan letter_types (is_active = true)
- Tidak ada data sensitif warga yang ditampilkan di halaman publik

**UC-17: Register Akun Warga**

**Table 26 - Usecase 17 - Register Akun Warga**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-17 |
| Nama | Register Akun Warga |
| Aktor | Calon pengguna (Warga Cibenda) |
| Pre-condition | Warga belum memiliki akun, NIK sudah terdaftar di tabel citizens |
| Post-condition | Akun warga berhasil dibuat, langsung aktif, warga dapat login |

Main Flow:
1. Warga membuka halaman registrasi
2. Warga mengisi form: NIK (16 digit), nama lengkap, email, password
3. Sistem memvalidasi format NIK (16 digit numerik) dan format email
4. Sistem generate SHA-256 dari NIK → cari di citizens.nik_hash
5. Jika NIK tidak ditemukan di citizens → error "NIK tidak terdaftar sebagai warga Desa Cibenda"
6. Jika NIK ditemukan tapi sudah punya akun → error "NIK sudah terdaftar, silakan login"
7. Jika NIK ditemukan dan belum punya akun:
   - INSERT ke users: citizen_id = [id citizen], role = 'warga', is_active = true
8. Sistem mengarahkan warga ke halaman login
9. Warga login dan mengakses dashboard

Alternatif Flow:
- 3a. Format NIK salah → error "NIK harus 16 digit angka"
- 3b. Email sudah digunakan akun lain → error "Email sudah terdaftar"
- 3c. Password terlalu lemah → error dengan panduan password

**UC-18: Kelola Profil Desa**

**Table 27 - Usecase 18 - Kelola Profil Desa**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-18 |
| Nama | Kelola Profil Desa |
| Aktor | Petugas Desa (saja) — Kepala Desa TIDAK termasuk |
| Pre-condition | User sudah login |
| Post-condition | Data profil desa berhasil diperbarui dan tampil di halaman publik |

Main Flow:
1. User membuka menu "Profil Desa"
2. Sistem menampilkan data profil desa saat ini:
   - Nama desa, kode desa, nama Kepala Desa
   - Sejarah singkat desa
   - Visi dan misi desa
   - Alamat kantor desa, nomor telepon
   - Struktur pemerintahan desa
3. User memilih "Edit Profil Desa"
4. User mengubah field yang diperlukan
5. Sistem memvalidasi input (field wajib tidak boleh kosong)
6. Sistem menyimpan perubahan ke tabel villages
7. Sistem menampilkan konfirmasi "Profil desa berhasil diperbarui"
8. Perubahan langsung tampil di halaman publik (UC-16)

Alternatif Flow:
- 5a. Field wajib kosong (nama desa, nama Kepala Desa) → sistem tampilkan error validasi per field

Notes:
- Hanya Petugas Desa yang dapat mengedit profil desa (Kepala Desa dihapus dari aktor)
- Tidak ada approval bertingkat; perubahan langsung tersimpan
- Data profil desa ditampilkan di halaman publik tanpa login (UC-16)

**UC-19: Kelola Berita / Informasi**

**Table 28 - Usecase 19 - Kelola Berita / Informasi**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-19 |
| Nama | Kelola Berita / Informasi |
| Aktor | Petugas Desa (saja) — Kepala Desa TIDAK termasuk |
| Pre-condition | User sudah login |
| Post-condition | Berita / pengumuman berhasil dibuat / diperbarui / dihapus; konten tampil di halaman publik jika dipublikasikan |

Main Flow - Tambah Berita:
1. User membuka menu "Berita & Informasi"
2. User memilih "Tambah Berita Baru"
3. User mengisi form:
   - Judul berita (wajib)
   - Konten / isi berita (wajib, rich text)
   - Thumbnail / gambar (opsional)
   - Status: Draft atau Publikasikan
4. Sistem generate slug otomatis dari judul
5. Sistem memvalidasi: judul wajib diisi, konten wajib diisi, slug unik
6. Sistem menyimpan ke tabel news:
   - author_id = user yang login
   - is_published = true/false sesuai pilihan
   - published_at = now() jika langsung dipublikasikan
7. Sistem menampilkan konfirmasi sukses
8. Jika is_published = true → berita langsung tampil di halaman publik (UC-16)

Main Flow - Edit Berita:
1. User membuka daftar berita → pilih "Edit"
2. User mengubah field yang diperlukan
3. User dapat mengubah status: Draft ↔ Publikasikan
4. Sistem menyimpan perubahan dan memperbarui updated_at

Main Flow - Hapus Berita:
1. User memilih berita → pilih "Hapus"
2. Sistem menampilkan konfirmasi "Yakin ingin menghapus berita ini?"
3. User konfirmasi → sistem menghapus data (soft delete)
4. Berita tidak lagi tampil di halaman publik

Main Flow - Lihat Daftar Berita:
1. User membuka menu "Berita & Informasi"
2. Sistem menampilkan semua berita (Draft & Publikasi) milik desa
3. User dapat memfilter berdasarkan: status (draft / published), periode

Alternatif Flow:
- 5a. Judul kosong → error "Judul berita wajib diisi"
- 5b. Slug sudah digunakan → sistem generate slug alternatif otomatis (tambahkan suffix angka)

Notes:
- Hanya Petugas Desa yang dapat membuat dan mengedit berita (Kepala Desa dihapus dari aktor)
- Berita berstatus is_published = true otomatis tampil di halaman publik (UC-16)
- Data yang ditampilkan di halaman publik hanya dari news dengan is_published = true

**UC-20: Kelola Struktur Wilayah (Dusun / RW / RT)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-20 |
| Nama | Kelola Struktur Wilayah (Dusun / RW / RT) |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Data struktur wilayah berhasil ditambah / diubah / dinonaktifkan |

Main Flow:
- Petugas membuka menu 'Kelola Wilayah'
- UI menampilkan hierarki: Desa → Dusun → RW → RT
- Petugas dapat tambah / edit / nonaktifkan unit wilayah (hamlets, rws, rts)
- Sistem memvalidasi keunikan code (dusun) dan full_label per level
- Sistem menyimpan ke hamlets / rws / rts
- Menonaktifkan wilayah: is_active = false (guard: cek ada warga aktif di wilayah ini)

Catatan:
- 5 Dusun Desa Cibenda: Patrol, Sinargalih, Cibenda, Budiasih, Sucen — di-seed saat instalasi

**UC-21: Edit Konfigurasi Tipe Surat (Versi Sederhana — MVP)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-21 |
| Nama | Edit Konfigurasi Tipe Surat (Versi Sederhana — MVP) |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Konfigurasi tipe surat berhasil diperbarui |
| Catatan Penting | Template HTML dan form field adalah developer-only via seeder. Tambah/hapus/ubah template → Next Dev - Paket 1 (WYSIWYG). |

Main Flow:
- Petugas membuka menu 'Tipe Surat'
- Sistem menampilkan daftar dengan badge: Draft / Aktif / Nonaktif
- Petugas memilih tipe surat → klik Edit
- Petugas hanya bisa mengubah: validity_days, assigned_role, is_active (toggle)
- Sistem menyimpan perubahan ke letter_types

**UC-22: Kelola Setting Deadline Approval**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-22 |
| Nama | Kelola Setting Deadline Approval |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Setting deadline approval per tahap berhasil diperbarui |

Main Flow:
- Petugas membuka menu 'Pengaturan Sistem' → 'Deadline Approval'
- Sistem menampilkan setting per tahap approval yang berlaku
- Petugas mengubah deadline_hours dan/atau reminder_hours per tahap
- Sistem memvalidasi: deadline_hours > 0, reminder_hours < deadline_hours
- Sistem menyimpan ke approval_settings (UNIQUE per village_id + approval_level)

Catatan:
- Jika deadline terlewat: surat TIDAK auto-reject. Hanya is_overdue = true + notif reminder.

**UC-23: Kelola Data Organisasi Desa (BPD, BUMDES, LPM, Karang Taruna, PKK)**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-23 |
| Nama | Kelola Data Organisasi Desa (BPD, BUMDES, LPM, Karang Taruna, PKK) |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Catatan Pending | Fitur rotasi jabatan aktif/nonaktif ditentukan setelah konfirmasi dari desa (apakah statis atau dinamis). Tabel sudah ada, implementasi fitur menyusul. |

Main Flow:
- Petugas membuka menu 'Organisasi Desa'
- UI menampilkan grouping: BPD / BUMDES / LPM / Karang Taruna / PKK
- Petugas klik group → tampil daftar jabatan beserta pemegang jabatan aktif
- Petugas dapat edit nama, foto, nomor WA pemegang jabatan
- Jika fitur rotasi aktif: ganti pemegang jabatan (INSERT baru + UPDATE lama ended_at)

**UC-24: Kelola Peraturan Desa**

| Field | Keterangan |
|---|---|
| Use Case ID | UC-24 |
| Nama | Kelola Peraturan Desa |
| Aktor | Petugas Desa |
| Pre-condition | Petugas Desa sudah login |
| Post-condition | Peraturan desa berhasil dibuat / diperbarui / dihapus |

Main Flow:
- Petugas membuka menu 'Peraturan Desa'
- Sistem menampilkan daftar semua peraturan desa
- Petugas dapat: Tambah (isi regulation_number, title, content, enacted_date) / Edit / Hapus
- Peraturan langsung tampil di halaman publik (tidak ada is_published)
- Sistem menyimpan ke village_regulations dengan created_by = user yang login

Catatan:
- Tidak ada file lampiran di MVP. Murni teks.

**Klarifikasi Total Use Case**

Sistem ini mendefinisikan **22 Use Case yang aktif berjalan di MVP**. Namun total keseluruhan UC yang pernah didefinisikan sepanjang proyek — termasuk yang sudah dipindah keluar MVP tapi tetap dipertahankan nomornya untuk konsistensi referensi — adalah **26 UC**.

| Kategori | Jumlah | Daftar |
|---|---|---|
| ✅ Aktif di MVP | 22 UC | UC-01, 02, 03, 04a, (notif-only RW sebagai sub-flow, bukan UC tersendiri), 04c, 04d, 05, 06, 08, 09, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 |
| ❌ Non-MVP (nomor tetap dipertahankan) | 4 UC | UC-07 (→ Next Dev Paket 2), UC-11, UC-12, UC-13 (→ Tahap 2) |
| **Total keseluruhan** | **26 UC** | — |

> Catatan: UC-10 sudah diintegrasikan ke UC-03 sejak v3.2, sehingga tidak dihitung sebagai UC tersendiri. UC-04b (RW Approval) dan UC-04c versi lama (Kadus Approval) sudah dihapus total sejak v5.0 — perannya digantikan oleh sub-flow notifikasi pasif (dalam UC-04a) dan UC-04c versi baru (Kades/Sekdes Approval).

#### 5.3.3. Sequence Diagram

⚠ Diagram ada di file lain

Daftar sequence diagram yang relevan sejak v5.0 (menggantikan daftar versi v4.2 yang masih mencantumkan RW & Kadus sebagai gate approval terpisah):

- Sequence Diagram: Input Surat
- Sequence Diagram: Register Akun Warga
- Sequence Diagram: RT Approval / Rejection Surat
- Sequence Diagram: Notifikasi RW (Side-Effect, Non-Blocking) — menunjukkan begitu RT approve, sistem (a) kirim notifikasi FYI ke RW dan (b) secara paralel langsung lanjut resolve approver berikutnya (Kades/Sekdes), tanpa RW menjadi blocking gate
- Sequence Diagram: Process Flow Step (Generic Approval) — sequence generik untuk approver manapun (RT/Kades/Sekdes/Kasi/Kaur) dengan parameter approver_position, menggantikan kebutuhan sequence diagram terpisah per role
- Sequence Diagram: Blockchain-Inspired Hashing (Next Dev — Paket 2)

> **Catatan revisi:** "Sequence RW Approval" dan "Sequence Kadus Approval" (v4.2) **dihapus** dari daftar karena RW bukan lagi approver dan Kadus dihapus total dari alur approval sejak v5.0, sesuai Patch 38. Diagram aktual tetap berada di file PlantUML terpisah — tidak digambar ulang di sini.

#### 5.3.4. Class Diagram

⚠ Diagram ada di file lain

Catatan Resolve OfficialService (v5.0):
Resolve approver Kades/Sekdes TIDAK berbasis wilayah (bukan rt_id/rw_id/hamlet_id), melainkan berbasis officials.position IN ('kepala_desa','sekdes') + is_active=true — pola yang sama seperti resolve Kasi/Kaur di v4.2 (berbasis posisi/role, bukan wilayah).

OfficialService tetap butuh method resolve RW (untuk keperluan kirim notifikasi FYI), tapi levelnya turun dari "approver dengan gate" menjadi "notifier" — tidak ada pengecekan otorisasi approve untuk RW, karena RW tidak pernah memanggil endpoint decision/approval.

### 5.4. Desain Database

#### 5.4.1. Entity Relationship Diagram (ERD)

⚠ Diagram ada di file lain

Catatan Update ERD (v5.0): label diperbarui menjadi ERD v7. ERD perlu digambar ulang karena:
- 5 entity baru: letter_categories, approval_flows, flow_steps, families, citizen_socioeconomics
- Entity letters berubah signifikan (status generik, tambah flow_id/current_step_order/rejected_at_step)
- Entity citizens berubah signifikan (hapus no_kk, tambah 11 kolom baru termasuk 2 self-reference FK)
- Entity letter_approvals berubah ENUM approval_level
- Entity officials — relasi ke Kadus untuk approval dilepas (Kadus tetap ada sebagai jabatan struktural, tapi tidak lagi terhubung ke alur approval surat)

#### 5.4.2. Definisi Tabel & Atribut

**Tabel: villages**

Menyimpan data desa.

**Table 29 - Table Database villages**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, Auto Increment | Primary key |
| name | VARCHAR(100) | NOT NULL | Nama desa |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Kode desa resmi |
| head_name | VARCHAR(100) | NULL | Nama kepala desa |
| address | TEXT | NULL | Alamat kantor desa |
| phone | VARCHAR(20) | NULL | Nomor telepon |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel: users**

Menyimpan data akun pengguna sistem. Kolom password menggunakan Argon2id. Seluruh role sistem disimpan di tabel ini. Kolom citizen_id menghubungkan akun dengan data kependudukan di tabel citizens (nullable untuk akun teknis tanpa data kependudukan).

**Table 30 - Table Database users**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, Auto Increment | Primary key |
| name | VARCHAR(100) | NOT NULL | Nama lengkap pengguna |
| email | VARCHAR(100) | UNIQUE | Email untuk login |
| password | VARCHAR(255) | NOT NULL | Hash Argon2id |
| role | ENUM | NOT NULL | warga \| rt \| rw \| kadus \| kasi_pelayanan \| kaur_tu_umum \| petugas_desa \| kepala_desa \| sekretaris_desa |
| village_id | BIGINT | FK → villages.id, NOT NULL | Scalable untuk jadi multi desa |
| citizen_id | BIGINT | FK → citizens.id, NULL | Link ke data kependudukan. NULL untuk akun teknis tanpa data kependudukan |
| is_active | BOOLEAN | DEFAULT true | Status akun aktif/nonaktif |
| email_verified_at | TIMESTAMP | NULL | Waktu verifikasi email |
| remember_token | VARCHAR(100) | NULL | Token remember me |
| created_at | TIMESTAMP | | Waktu dibuat |
| updated_at | TIMESTAMP | | Waktu diperbarui |

- sekretaris_desa: role baru. Diberikan saat Petugas Desa assign jabatan Sekdes di tabel officials. Scope dashboard identik dengan kepala_desa. Saat rotasi jabatan Sekdes, users.role akun yang bersangkutan otomatis diupdate ke sekretaris_desa oleh sistem.
- kadus: role tetap ada di ENUM untuk kompatibilitas akun (login/logout/lihat status), namun tidak lagi punya relevansi terhadap `flow_steps.approver_position` sejak v5.0.

**Tabel: Citizens**

Menyimpan data kependudukan warga Desa Cibenda. Kolom nik dan address dienkripsi AES-256. Pencarian menggunakan nik_hash (SHA-256 dari NIK plaintext).

**Table 31 - Table Database citizens**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa asal warga |
| nik | TEXT | NOT NULL | NIK warga - AES-256 encrypted |
| nik_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 dari NIK plaintext - untuk pencarian & indexing |
| name | VARCHAR(100) | NOT NULL | Nama lengkap warga |
| date_of_birth | DATE | NULL | Tanggal lahir |
| place_of_birth | VARCHAR(100) | NULL | Tempat lahir |
| gender | ENUM('L','P') | NOT NULL | Jenis kelamin |
| address | TEXT | NOT NULL | Alamat lengkap - AES-256 encrypted |
| rt_id | BIGINT | FK → rts.id, NULL | BARU v4.0 — menggantikan rt VARCHAR(5) |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | BARU v4.0 — menggantikan hamlet VARCHAR(100) |
| marital_status | ENUM | NULL | belum_kawin \| kawin \| cerai_hidup \| cerai_mati |
| occupation | VARCHAR(100) | NULL | Pekerjaan |
| religion | ENUM | NULL | BARU v4.0 — islam \| kristen \| katolik \| hindu \| buddha \| konghucu |
| last_education | ENUM | NULL | BARU v4.0 — tidak_sekolah \| sd \| smp \| sma \| diploma \| s1 \| s2 \| s3 |
| domicile_status | ENUM | NOT NULL, DEFAULT 'menetap' | BARU v4.0 — menetap \| merantau_dalam_negeri \| merantau_luar_negeri \| tki. Murni informatif, tidak mempengaruhi hak akses. |
| current_domicile | VARCHAR(150) | NULL | BARU v4.0 — Alamat domisili saat ini jika tidak menetap di Cibenda |
| family_id | BIGINT | FK → families.id, NULL | BARU v5.0 — NULL = belum/tidak tergabung KK manapun di sistem |
| family_role | ENUM | NULL | BARU v5.0 — kepala_keluarga \| istri \| suami \| anak \| famili_lain |
| father_id | BIGINT | FK → citizens.id, NULL | BARU v5.0 — self-reference, untuk fitur pohon keluarga |
| mother_id | BIGINT | FK → citizens.id, NULL | BARU v5.0 — self-reference |
| father_name_text | VARCHAR(100) | NULL | BARU v5.0 — fallback teks bebas jika father_id NULL (ortu tidak terdaftar sebagai warga desa) |
| mother_name_text | VARCHAR(100) | NULL | BARU v5.0 — fallback teks bebas jika mother_id NULL |
| blood_type | ENUM | NULL | BARU v5.0 — A \| B \| AB \| O \| tidak_tahu |
| residency_type | ENUM | NOT NULL, DEFAULT 'lokal' | BARU v5.0 — lokal \| pendatang. TIDAK dipisah jadi tabel/entitas berbeda — cukup kolom pembeda di citizens yang sama |
| origin_region | VARCHAR(150) | NULL | BARU v5.0 — asal daerah, relevan jika residency_type='pendatang' |
| data_source | ENUM | NOT NULL, DEFAULT 'manual_input_desa' | BARU v5.0 — manual_input_desa \| import_excel \| dukcapil_sync, untuk future Dukcapil integration Tahap 3 |
| last_verified_at | TIMESTAMP | NULL | BARU v5.0 — kapan terakhir dicocokkan dengan dokumen fisik |
| sync_status | ENUM | NULL | BARU v5.0 — synced \| pending \| conflict |
| is_active | BOOLEAN | DEFAULT true | Status aktif warga |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

> **Catatan revisi:** Kolom `no_kk` (ada di v3.2/v4.2) sudah **dihapus** dari tabel `citizens` sejak v5.0, dipindah ke tabel baru `families.no_kk` sesuai Patch 41.

**Tabel Baru (v5.0): families**

Tabel Kartu Keluarga (KK), sengaja dibuat TIPIS — hanya berisi data yang benar-benar sama untuk semua anggota keluarga.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| no_kk | TEXT | NOT NULL | AES-256 encrypted |
| no_kk_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256, pola sama seperti nik/nik_hash |
| family_address | TEXT | NOT NULL | AES-256 encrypted, alamat resmi sesuai dokumen KK |
| family_status | ENUM | NOT NULL, DEFAULT 'aktif' | aktif \| pindah \| bubar |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa asal KK |
| rt_id | BIGINT | FK → rts.id, NULL | |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | |
| head_of_family_id | BIGINT | FK → citizens.id, NULL | Denormalisasi OPSIONAL untuk performa query |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

Catatan head_of_family_id: bersifat opsional/denormalisasi — data ini pada prinsipnya bisa diturunkan dari citizens.family_role = 'kepala_keluarga'. Jika kolom ini dipakai (untuk mempercepat query "siapa kepala keluarga dari KK ini" tanpa perlu scan semua citizens), aplikasi WAJIB menjaga konsistensi manual antara kedua sumber data ini.

Catatan enkripsi no_kk: mengikuti pola dual-column yang sudah baku di TDD sejak v3.2 (sama seperti nik/nik_hash), karena No KK levelnya sama sensitif dengan NIK.

**Tabel Baru (v5.0): citizen_socioeconomics**

Status: MASUK MVP. Relasi 1:1 dengan citizens (per individu, BUKAN per keluarga). Dipisah tabel karena sering kosong (belum semua warga disurvei), diinput petugas berbeda-beda, dan butuh jejak waktu survei.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| citizen_id | BIGINT | FK → citizens.id, UNIQUE NOT NULL | Relasi 1:1 dengan citizens |
| income_range | ENUM | NULL | <1jt \| 1-3jt \| 3-5jt \| 5-10jt \| >10jt |
| house_ownership_status | ENUM | NULL | milik_sendiri \| sewa \| menumpang \| dinas |
| water_source | ENUM | NULL | pdam \| sumur \| sungai \| lainnya |
| electricity_source | ENUM | NULL | pln \| non_pln \| tidak_ada |
| dependents_count | INT | NULL | Jumlah tanggungan |
| productive_assets | JSON | NULL | Aset produktif |
| surveyed_at | TIMESTAMP | NULL | Waktu survei dilakukan |
| surveyed_by | BIGINT | FK → users.id, NULL | Petugas yang melakukan survei |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Cluster Kelayakan Bantuan Sosial (v5.0) — TAHAP 2 / NEXT DEV**

⚠ TAHAP 2 / NEXT DEV — Cluster ini dikeluarkan dari MVP, sejajar dengan village_assets/village_finances. Alasan: belum ada use case terkait bansos/DTKS yang dirumuskan di TDD manapun (siapa input skor, siapa approve masuk program, dll).

Skema berikut dicatat untuk referensi Next Dev/Tahap 2, TIDAK dibuat di migrasi MVP:
- citizen_aid_eligibility: id BIGINT PK, citizen_id FK -> citizens.id, dtks_score DECIMAL(5,2), poverty_decile INT, assessment_period VARCHAR(20), created_at TIMESTAMP
- citizen_aid_history: id BIGINT PK, citizen_id FK -> citizens.id, program_id FK -> aid_programs.id, status ENUM('diajukan','disetujui','ditolak','aktif','selesai'), period VARCHAR(20), created_at TIMESTAMP, updated_at TIMESTAMP
- aid_programs: id BIGINT PK, name VARCHAR(100), description TEXT, is_active BOOLEAN

**Tabel: officials**

Menyimpan rekam jejak jabatan struktural desa (RT, RW, Kepala Desa, Petugas Desa) per periode. Digunakan untuk resolusi wilayah saat routing notifikasi dan approval. Saat rotasi jabatan: INSERT baru + UPDATE ended_at lama, data citizens tidak disentuh.

**Table 32 - Table Database officials**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| citizens_id | BIGINT | FK → citizens.id, NOT NULL | Warga yang menjabat |
| user_id | BIGINT | FK → users.id, NULL | Akun sistem pejabat |
| position | ENUM('kepala_desa','kasi_pelayanan','kaur_tu_umum','kadus','petugas_desa','rw','rt','sekdes','kasi_kesejahteraan','kasi_pemerintahan','kaur_perencanaan','kaur_keuangan','staf_sipades','staf_siskeudes') | NOT NULL | Posisi jabatan |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa wilayah jabatan |
| rt_id | BIGINT | FK → rts.id, NULL | BARU v4.0 — diisi untuk jabatan RT |
| rw_id | BIGINT | FK → rws.id, NULL | BARU v4.0 — diisi untuk jabatan RW |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | BARU v4.0 — diisi untuk jabatan Kadus |
| signature_img | VARCHAR(255) | NULL | BARU v4.0 — Path file TTD pejabat (relevan untuk Kades, untuk generate PDF surat) |
| stamp_img | VARCHAR(255) | NULL | BARU v4.0 — Path file stempel desa (relevan untuk Kades) |
| photo_img | VARCHAR(255) | NULL | BARU v4.0 — Path foto pejabat (ditampilkan di halaman publik) |
| phone_wa | VARCHAR(20) | NULL | BARU v4.0 — Nomor WA pejabat untuk fitur Hubungi Kami di halaman publik |
| started_at | DATE | NOT NULL | Tanggal mulai menjabat |
| ended_at | DATE | NULL | Tanggal akhir jabatan. NULL = masih aktif |
| is_active | BOOLEAN | DEFAULT true | Status jabatan aktif |
| notes | TEXT | NULL | Catatan, misal: "akhir periode", "meninggal" |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

- Catatan user_id: Akun sistem pejabat. NULL untuk jabatan non-sistem (kasi_kesejahteraan, kasi_pemerintahan, kaur_perencanaan, kaur_keuangan, staf_sipades, staf_siskeudes). Sekdes (sekdes) PUNYA akun — user_id NOT NULL dengan users.role = 'sekretaris_desa'.
- Catatan Kadus (v5.0): jabatan `kadus` tetap eksis di ENUM `position` untuk keperluan struktural non-approval (misal halaman publik struktur desa), namun **tidak lagi direferensikan** oleh `flow_steps.approver_position` di sistem approval surat.

**Pemetaan officials.position → users.role:**

| officials.position | users.role | user_id |
|---|---|---|
| kepala_desa | kepala_desa | NOT NULL |
| kasi_pelayanan | kasi_pelayanan | NOT NULL |
| kaur_tu_umum | kaur_tu_umum | NOT NULL |
| kadus | kadus | NOT NULL |
| petugas_desa | petugas_desa | NOT NULL |
| rw | rw | NOT NULL |
| rt | rt | NOT NULL |
| sekdes | sekretaris_desa | NOT NULL |
| kasi_kesejahteraan | — | NULL |
| kasi_pemerintahan | — | NULL |
| kaur_perencanaan | — | NULL |
| kaur_keuangan | — | NULL |
| staf_sipades | — | NULL |
| staf_siskeudes | — | NULL |

**Tabel: letter_types**

Master data jenis surat yang tersedia dalam sistem. Bersifat fleksibel dan dapat dikelola oleh admin desa.

**Tabel Baru (v5.0): letter_categories**

Gate awal klasifikasi surat, menentukan handler/modul yang menangani. Jarang berubah.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| code | ENUM | NOT NULL, UNIQUE | approval_normal \| upload_mandiri \| dokumen_pendukung \| update_data |
| name | VARCHAR(100) | NOT NULL | Nama kategori |
| description | TEXT | NULL | Deskripsi kategori |
| handler_class | VARCHAR(150) | NOT NULL | Nama class handler yang menangani modul ini |
| is_active | BOOLEAN | DEFAULT true | Status aktif kategori |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

| Code | Nama | Karakteristik |
|---|---|---|
| approval_normal | Approval Normal | Melalui rangkaian approval bertingkat; jumlah & urutan tahap ditentukan approval_flows |
| upload_mandiri | Upload Mandiri | TTD eksternal, tanpa approval berjenjang standar |
| dokumen_pendukung | Dokumen Pendukung | Bukan output surat final, sekadar syarat lampiran |
| update_data | Update Data Kependudukan | Bukan proses terbit surat, murni update citizens/families |

**Tabel Baru (v5.0): approval_flows**

Anak dari category, urutan step approval spesifik. Jumlah flow per category tidak ditentukan di depan — muncul organik dari pengelompokan surat yang alurnya identik.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| category_id | BIGINT | FK → letter_categories.id, NOT NULL | Kategori pemilik flow ini |
| name | VARCHAR(150) | NOT NULL | Nama flow, contoh: 'RT-Kades-Staff (3 Tahap)' |
| description | TEXT | NULL | Deskripsi flow |
| is_active | BOOLEAN | DEFAULT true | Status aktif flow |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

Untuk category upload_mandiri, dokumen_pendukung, update_data — tetap wajib punya row di approval_flows (misal flow "Direct — Tanpa Approval Bertingkat") demi konsistensi satu pola query di seluruh sistem, meski flow_steps-nya kosong/minimal.

**Tabel Baru (v5.0): flow_steps**

Urutan approver per flow.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | Flow pemilik step ini |
| step_order | INT | NOT NULL | Urutan step dalam flow |
| approver_position | ENUM | NOT NULL | rt \| kepala_desa \| sekdes \| kasi_pelayanan \| kaur_tu_umum |
| is_final | BOOLEAN | DEFAULT false | true jika step ini adalah step terakhir/final |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

Catatan: UNIQUE(flow_id, step_order)

⚠ PENTING: 'rw' dan 'kadus' TIDAK PERNAH muncul sebagai approver_position di tabel ini. RW ditangani sebagai side-effect notifikasi kode, bukan step approval formal. Kadus tidak lagi bagian dari alur approval surat sejak v5.0.

**Table 33 - Table Database letter_types**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Kode jenis surat (contoh: SKD, SKU, SKTM) |
| name | VARCHAR(100) | NOT NULL | Nama lengkap jenis surat |
| description | TEXT | NULL | Deskripsi dan konteks penggunaan surat |
| template | TEXT | NULL | Template isi surat (opsional) |
| verification_type | ENUM | NOT NULL | auto / manual / document |
| requirements_info | TEXT | NULL | Deskripsi persyaratan yang ditampilkan ke Petugas Desa |
| assigned_role | ENUM | NULL | BARU v4.0 — kasi_pelayanan \| kaur_tu_umum. Menentukan approver tahap final (Kasi/Kaur) |
| validity_days | INT | NULL | BARU v4.0 — Masa berlaku surat dalam hari setelah status approved. NULL = tidak expire |
| category_id | BIGINT | FK → letter_categories.id, NOT NULL | BARU v5.0 — gate awal jenis surat |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | BARU v5.0 — selalu diisi (termasuk untuk category upload_mandiri/dokumen_pendukung/update_data, demi konsistensi query) |
| is_active | BOOLEAN | DEFAULT true | Status aktif jenis surat |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

- Status tipe surat: template=NULL + is_active=false = Draft | template='...' + is_active=true = Aktif | template='...' + is_active=false = Dinonaktifkan
- Catatan assigned_role (v5.0): Dengan hadirnya flow_steps.approver_position, kolom assigned_role di letter_types (v4.2, dipakai untuk resolve Kasi/Kaur) bisa dianggap redundan karena informasi "siapa approver di step mana" sudah terkandung dalam flow_steps. Rekomendasi: pertahankan assigned_role sebagai kolom derived/cache untuk kompatibilitas mundur & kemudahan query cepat (opsional dihapus di iterasi berikutnya), tapi source of truth resmi soal approver adalah flow_steps.

Penjelasan verification_type:
- Auto, sistem otomatis validasi jika NIK pemohon terdaftar di tabel citizens
- Manual, sistem menampilkan checklist persyaratan, petugas wajib konfirmasi telah memverifikasi secara manual
- Document, dokumen pendukung dikelola melalui form seeder per tipe surat di Tahap 1 (kolom supporting_document sudah dihapus dari letters; field requirement dinamis akan tersedia di Next Dev - Paket 1)

**Tabel: letters**

Tabel utama sistem, menyimpan data permohonan surat. Kolom applicant_nik dienkripsi dengan AES-256. Kolom applicant_nik_hash menyimpan SHA-256 dari NIK plaintext untuk keperluan indexing dan pencarian.

**Table 34 - Table Database letters**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa asal surat |
| letter_type_id | BIGINT | FK → letter_types.id, NOT NULL | Jenis surat |
| submitted_by | BIGINT | FK → users.id, NOT NULL | User yang mengajukan surat |
| on_behalf_of | BIGINT | FK → citizens.id, NULL | Selalu NULL di MVP; dipersiapkan untuk future use case di mana petugas mungkin input atas nama warga tertentu |
| citizen_id | BIGINT | FK → citizens.id, NULL | Referensi data warga pemohon. Diisi dari auth()->user()->citizen_id saat warga self-service submit |
| letter_number | VARCHAR(50) | UNIQUE, NULL | Nomor surat resmi; diisi otomatis saat status = 'approved' (step is_final=true) |
| applicant_name | VARCHAR(100) | NOT NULL | Nama pemohon |
| applicant_nik | TEXT | NOT NULL | NIK pemohon - AES-256 encrypted |
| applicant_nik_hash | VARCHAR(64) | NOT NULL | SHA-256 dari NIK plaintext untuk indexing & pencarian |
| applicant_address | TEXT | NULL | Alamat pemohon - AES-256 encrypted |
| purpose | TEXT | NOT NULL | Keperluan pengajuan surat |
| notes | TEXT | NULL | Catatan tambahan dari Petugas Desa |
| is_overdue | BOOLEAN | DEFAULT false | BARU v4.0 — true jika ada tahap yang melebihi deadline. Di-set oleh scheduler. |
| expires_at | TIMESTAMP | NULL | BARU v4.0 — Waktu masa berlaku surat habis (dihitung saat status = 'approved' + validity_days). NULL = tidak expire. |
| status | ENUM | NOT NULL, DEFAULT 'pending' | pending \| in_progress \| approved \| rejected |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | BARU v5.0 — SNAPSHOT dari letter_types.flow_id saat submit. Dikunci agar perubahan flow di letter_types di masa depan tidak mengubah aturan surat yang sudah berjalan. |
| current_step_order | INT | NOT NULL, DEFAULT 1 | BARU v5.0 — step_order yang sedang aktif/ditunggu, dicocokkan ke flow_steps |
| rejected_at_step | INT | NULL | BARU v5.0 — step_order tempat surat direject, untuk histori/laporan |
| submitted_at | TIMESTAMP | NOT NULL | Waktu pengajuan surat |
| processed_at | TIMESTAMP | NULL | Waktu terakhir diproses (approver manapun di step manapun) |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Semantik letters.status (v5.0):**
- pending : step 1 belum ada action
- in_progress : minimal 1 step approve, belum sampai step is_final=true
- approved : step dengan is_final=true sudah di-approve → trigger letter_number + expires_at
- rejected : TERMINAL — ada satu step yang reject, rejected_at_step dicatat

**Query Pattern Generik (menggantikan seluruh query hardcode per role v4.2):**

```sql
SELECT l.* FROM letters l JOIN flow_steps fs ON fs.flow_id = l.flow_id AND fs.step_order = l.current_step_order WHERE fs.approver_position = ? AND l.status IN ('pending','in_progress')
```

Pola ini menggantikan seluruh query spesifik per role yang di v4.2 ditulis manual per tahap (findByRtIdAndStatus, findByHamletIdAndStatus, dst untuk kasus wilayah; untuk Kades/Sekdes/Kasi/Kaur query generik ini sudah cukup karena resolvenya berbasis posisi bukan wilayah). Untuk RT yang masih berbasis wilayah, tetap perlu JOIN tambahan ke citizens.rt_id.

Catatan desain on_behalf_of vs citizen_id:
- citizen_id: referensi warga pemohon yang diambil dari akun login warga
- on_behalf_of: kolom tetap ada namun selalu NULL di MVP, dipersiapkan untuk kebutuhan future di mana petugas mungkin input atas nama warga lain
- Pada MVP self-service, submitted_by (users.id warga) dan citizen_id (citizens.id warga yang sama) sudah cukup mendeskripsikan pemohon

Catatan Keamanan
- applicant_nik: terenkripsi AES-256 via Laravel $casts tidak bisa dibaca langsung dari database
- applicant_nik_hash: SHA-256 dari NIK plaintext digunakan untuk indexing dan pencarian (bukan untuk membaca NIK)
- applicant_address: terenkripsi AES-256 data lokasi warga dilindungi

**Tabel: letter_approvals**

Menyimpan record keputusan approval per surat per tahap. Satu surat dapat memiliki beberapa record approval sesuai jumlah step di flow-nya (RT, Kades/Sekdes, Kasi/Kaur). Relasi: one-to-many (letters → letter_approvals).

**Table 35 - Table Database letter_approvals**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, NOT NULL | Surat yang diproses |
| approved_by | BIGINT | FK → users.id, NOT NULL | User (RT/Kades/Sekdes/Kasi/Kaur) yang memutuskan |
| approval_level | ENUM('rt', 'kepala_desa', 'sekdes', 'kasi_pelayanan', 'kaur_tu_umum') | NOT NULL | Tahap approval: rt (tahap 1), kepala_desa/sekdes (tahap lanjutan, saling menggantikan), kasi_pelayanan/kaur_tu_umum (final). 'rw' dan 'kadus' DIHAPUS dari ENUM v5.0 — keduanya tidak pernah membuat row di tabel ini |
| action | ENUM('approved', 'rejected') | NOT NULL | approved / rejected |
| flow_step_id | BIGINT | FK → flow_steps.id, NULL | BARU v5.0 — referensi step spesifik yang dieksekusi, untuk audit trail granular |
| notes | TEXT | NULL | Catatan / alasan keputusan (wajib jika rejected) |
| deadline_at | TIMESTAMP | NULL | BARU v4.0 — Deadline waktu untuk action, dihitung dari approval_settings.deadline_hours |
| reminded_at | TIMESTAMP | NULL | BARU v4.0 — Waktu reminder terakhir dikirim |
| created_at | TIMESTAMP | NOT NULL | Waktu keputusan dibuat |
| updated_at | TIMESTAMP | NULL | Update waktu keputusan |

**Tabel: letter_status_logs**

Audit trail lengkap setiap perubahan status surat. Mencatat siapa melakukan apa, kapan, dan dari IP mana. Tidak dapat dihapus atau diubah.

**Table 36 - Table Database letter_status_logs**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, NOT NULL | Surat yang berubah statusnya |
| actor_id | BIGINT | FK → users.id, NOT NULL | User yang melakukan perubahan |
| old_status | ENUM('pending', 'in_progress', 'approved', 'rejected') | NULL | Status sebelum perubahan (NULL untuk log pertama) |
| new_status | ENUM('pending', 'in_progress', 'approved', 'rejected') | NOT NULL | Status setelah perubahan |
| notes | TEXT | NULL | Catatan perubahan |
| ip_address | VARCHAR(45) | NULL | IP address aktor (mendukung IPv4 & IPv6) |
| user_agent | TEXT | NULL | Informasi browser / client |
| created_at | TIMESTAMP | NOT NULL | Waktu perubahan terjadi |

**Tabel: letter_hashes**

Menyimpan hash SHA-256 dari setiap surat untuk validasi integritas data. Membentuk struktur rantai (hash chain) berbasis konsep blockchain.

Status: NEXT DEV — Paket 2. Tabel ini dikeluarkan dari MVP. Tidak perlu dibuat di migrasi Tahap 1.

**Table 37 - Table Database letter_hashes (Next Dev)**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, UNIQUE | Satu hash per surat |
| hash_value | VARCHAR(64) | NOT NULL | SHA-256 hash dari data surat (64 hex chars) |
| prev_hash | VARCHAR(64) | NULL | Hash block sebelumnya, NULL jika block pertama |
| block_index | BIGINT | NOT NULL | Urutan block dalam chain (sequential) |
| is_valid | BOOLEAN | DEFAULT true | Hasil validasi integritas terakhir |
| created_at | TIMESTAMP | NOT NULL | Waktu hash dibuat |

Catatan chain mechanism:
- Block 1 → hash1 (prev_hash = NULL)
- Block 2 → hash2 (prev_hash = hash1)
- Block 3 → hash3 (prev_hash = hash2)
  - Jika data Block 1 dimodifikasi → hash1 berubah → chain Block 2 & 3 rusak → terdeteksi

**Tabel: village_assets**

Menyimpan data inventaris aset milik Desa Cibenda. Dikelola oleh Petugas Desa.

Status: TAHAP 2 — Tabel ini dikeluarkan dari MVP. Tidak perlu dibuat di migrasi Tahap 1.

**Table 38 - Table Database village_assets (Tahap 2)**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa pemilik aset |
| asset_code | VARCHAR(50) | NOT NULL | Kode asset, unik dalam lingkup satu desa |
| name | VARCHAR(150) | NOT NULL | Nama aset |
| category | VARCHAR(100) | NULL | Kategori: Tanah, Bangunan, Kendaraan, Peralatan, dll. |
| location | TEXT | NULL | Lokasi / keberadaan aset |
| value | DECIMAL(15,2) | NULL | Nilai aset dalam Rupiah |
| condition | ENUM | NOT NULL | baik / rusak_ringan / rusak_berat |
| acquisition_date | DATE | NULL | Tanggal perolehan aset |
| notes | TEXT | NULL | Keterangan tambahan |
| created_by | BIGINT | FK → users.id, NOT NULL | Petugas yang menginput data |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel: village_finances**

Menyimpan catatan pemasukan dan pengeluaran Desa Cibenda. Bukan full accounting system, hanya pencatatan sederhana untuk kebutuhan pelaporan desa.

Status: TAHAP 2 — Tabel ini dikeluarkan dari MVP. Tidak perlu dibuat di migrasi Tahap 1.

**Table 39 - Table Database village_finances (Tahap 2)**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa yang mencatat |
| transaction_date | DATE | NOT NULL | Tanggal transaksi |
| type | ENUM | NOT NULL | pemasukan / pengeluaran |
| category | VARCHAR(100) | NULL | Dana Desa, PAD, Operasional, Infrastruktur, dll. |
| amount | DECIMAL(15,2) | NOT NULL | Nominal transaksi dalam Rupiah |
| description | TEXT | NULL | Keterangan / deskripsi transaksi |
| recorded_by | BIGINT | FK → users.id, NOT NULL | Petugas yang mencatat transaksi |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel Baru: hamlets**

Tabel dusun. Menggantikan penyimpanan wilayah sebagai string bebas.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa yang memiliki dusun ini |
| name | VARCHAR(100) | NOT NULL | Nama dusun (contoh: Dusun Patrol) |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Kode dusun |
| is_active | BOOLEAN | DEFAULT true | Status aktif dusun |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

5 Dusun Desa Cibenda: Patrol, Sinargalih, Cibenda, Budiasih, Sucen — di-seed saat instalasi.

**Tabel Baru: rws**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| hamlet_id | BIGINT | FK → hamlets.id, NOT NULL | Dusun yang menaungi RW ini |
| number | VARCHAR(5) | NOT NULL | Nomor RW (contoh: 001) |
| full_label | VARCHAR(20) | NOT NULL | Label lengkap: 'RW 001' |
| is_active | BOOLEAN | DEFAULT true | Status aktif RW |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel Baru: rts**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| rw_id | BIGINT | FK → rws.id, NOT NULL | RW yang menaungi RT ini |
| number | VARCHAR(5) | NOT NULL | Nomor RT (contoh: 001) |
| full_label | VARCHAR(30) | NOT NULL | Label lengkap: 'RT 001/RW 001' |
| is_active | BOOLEAN | DEFAULT true | Status aktif RT |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

Hierarki wilayah: villages → hamlets → rws → rts.

**Tabel Baru: approval_settings**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa yang dikonfigurasi |
| approval_level | ENUM('rt','rw','kadus','kasi') | NOT NULL | Tahap approval yang dikonfigurasi |
| deadline_hours | INT | NOT NULL, DEFAULT 24 | Berapa jam pejabat punya waktu untuk action |
| reminder_hours | INT | NOT NULL, DEFAULT 12 | Berapa jam sebelum deadline, notif reminder dikirim |
| is_active | BOOLEAN | DEFAULT true | Status konfigurasi aktif |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

Catatan: UNIQUE(village_id, approval_level)

> **Catatan revisi:** Nilai ENUM `approval_level` pada tabel ini (`'rt','rw','kadus','kasi'`) adalah peninggalan skema v4.2 yang belum eksplisit di-patch ulang oleh Patch Guide v5.0 — Patch Guide v5.0 tidak menyebutkan perubahan pada `approval_settings`. Karena `letter_approvals.approval_level` sudah berubah ENUM-nya (Patch 34: `'rt','kepala_desa','sekdes','kasi_pelayanan','kaur_tu_umum'`), disarankan tim teknis meninjau ulang konsistensi ENUM ini terhadap `letter_approvals` agar deadline setting tetap bisa mereferensikan tahap approval yang benar-benar berlaku di v5.0. Ini dicatat sebagai potensi technical debt, bukan diubah sepihak dalam revisi dokumen ini karena tidak ada instruksi patch eksplisit untuk tabel ini.

**Tabel Baru: village_org_positions**

Master jabatan per organisasi non-struktural.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa pemilik |
| org_type | ENUM | NOT NULL | bpd \| bumdes \| lpm \| karang_taruna \| pkk |
| position_label | VARCHAR(100) | NOT NULL | Label jabatan, contoh: Ketua BPD, Wakil Ketua, Anggota |
| is_single_occupant | BOOLEAN | DEFAULT true | false = bisa diisi banyak orang (contoh: Anggota BPD) |
| sort_order | INT | DEFAULT 0 | Urutan tampil di UI |
| is_active | BOOLEAN | DEFAULT true | Status aktif jabatan |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel Baru: village_org_members**

History pemegang jabatan organisasi non-struktural.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| position_id | BIGINT | FK → village_org_positions.id, NOT NULL | Jabatan yang dipegang |
| member_name | VARCHAR(150) | NOT NULL | Nama pemegang jabatan |
| photo_img | VARCHAR(255) | NULL | Path foto (ditampilkan di halaman publik) |
| phone_wa | VARCHAR(20) | NULL | Nomor WA |
| started_at | DATE | NOT NULL | Tanggal mulai menjabat |
| ended_at | DATE | NULL | Tanggal akhir jabatan. NULL = masih aktif |
| is_active | BOOLEAN | DEFAULT true | Status aktif |
| notes | TEXT | NULL | Catatan |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel Baru: village_regulations**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa penerbit peraturan |
| regulation_number | VARCHAR(100) | NOT NULL | Nomor peraturan desa |
| title | VARCHAR(200) | NOT NULL | Judul peraturan |
| content | TEXT | NOT NULL | Isi peraturan desa (teks) |
| enacted_date | DATE | NULL | Tanggal ditetapkan |
| created_by | BIGINT | FK → users.id, NOT NULL | Petugas yang mencatat |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

Catatan: Tidak ada kolom is_published. Semua peraturan yang disimpan langsung tampil di halaman publik.

**Tabel: notifications**

**Table 40 - Table Database notifications**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | Primary key UUID |
| type | VARCHAR(255) | NOT NULL | Fully-qualified class name notifikasi Laravel |
| notifiable_type | VARCHAR(255) | NOT NULL | Tipe pemilik notifikasi (polymorphic, biasanya App\Models\User) |
| notifiable_id | BIGINT | NOT NULL | ID pemilik notifikasi |
| data | JSON | NOT NULL | Payload konten notifikasi |
| read_at | TIMESTAMP | NULL | NULL = belum dibaca, diisi saat user membaca |
| created_at | TIMESTAMP | NOT NULL | Waktu notifikasi dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Tabel: news**

Menyimpan berita dan pengumuman yang dapat diakses publik (halaman publik warga) maupun internal desa.

**Table 41 - Table Database news**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa penerbit berita |
| author_id | BIGINT | FK → users.id, NOT NULL | User yang menulis |
| title | VARCHAR(200) | NOT NULL | Judul berita / pengumuman |
| slug | VARCHAR(200) | UNIQUE, NOT NULL | URL-friendly identifier |
| content | TEXT | NOT NULL | Isi konten berita |
| thumbnail | VARCHAR(255) | NULL | Path file gambar thumbnail |
| is_published | BOOLEAN | DEFAULT false | Status publikasi, false = draft |
| published_at | TIMESTAMP | NULL | Waktu dipublikasikan (NULL jika masih draft) |
| created_at | TIMESTAMP | NOT NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NOT NULL | Waktu diperbarui |

**Ringkasan Total Tabel MVP (v5.0)**

Total tabel MVP naik dari 17 (v4.2) menjadi 22 (v5.0): +3 dari sistem Category+Flow approval, +2 dari families/citizen_socioeconomics.

```
-- Wilayah (4): villages, hamlets, rws, rts
-- Pengguna & Jabatan Struktural (3): users, citizens, officials
-- Data Keluarga & Sosio-Ekonomi (2) -- BARU v5.0: families, citizen_socioeconomics
-- Organisasi Non-Struktural (2): village_org_positions, village_org_members
-- Klasifikasi & Alur Surat (3) -- BARU v5.0: letter_categories, approval_flows, flow_steps
-- Surat (4): letter_types, letters, letter_approvals, letter_status_logs
-- Konfigurasi (1): approval_settings
-- Konten & Komunikasi (3): notifications, news, village_regulations

Total: 4 + 3 + 2 + 2 + 3 + 4 + 1 + 3 = 22 tabel
```

**Tabel yang di-hold (bukan bagian dari 22 tabel MVP):**

| Tabel | Di-hold ke |
|---|---|
| village_assets | Tahap 2 |
| village_finances | Tahap 2 |
| letter_hashes | Next Dev (Paket 2 — Blockchain) |
| letter_type_fields | Next Dev (Paket 1 — Dynamic Form) |
| letter_field_values | Next Dev (Paket 1 — Dynamic Form) |
| citizen_aid_eligibility | Next Dev / Tahap 2 (Kelayakan Bansos) |
| citizen_aid_history | Next Dev / Tahap 2 (Kelayakan Bansos) |
| aid_programs | Next Dev / Tahap 2 (Kelayakan Bansos) |

#### 5.4.3. Indexing Strategy

Strategi indexing dirancang berdasarkan pola query yang paling sering digunakan, mencakup operasi dashboard, pencarian warga, manajemen surat, aset, keuangan, dan audit trail.

**Index Tabel "letters"**

**Table 42 - Indexing Strategy - Table letters**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_letters_status | status | B-Tree | Filter surat by status, dipakai di semua list view & dashboard |
| idx_letters_village | village_id | B-Tree | Filter surat per desa |
| idx_letters_submitted_at | submitted_at DESC | B-Tree | Sorting list surat terbaru (default tampilan) |
| idx_letters_overdue | is_overdue | B-Tree | Filter surat overdue untuk scheduler & dashboard |
| idx_letters_nik_hash | applicant_nik_hash | B-Tree | Pencarian surat berdasarkan NIK pemohon |
| idx_letters_citizen | citizen_id | B-Tree | Join letters ↔ citizens |
| idx_letters_on_behalf | on_behalf_of | B-Tree | Query surat berdasarkan warga yang diwakilkan |
| idx_letters_village_status | (village_id, status) | Composite | Dashboard: surat desa X dengan status Y, query paling sering |
| idx_letters_village_date | (village_id, submitted_at DESC) | Composite | Laporan periode per desa |
| idx_letters_flow_step | (flow_id, current_step_order) | Composite | BARU v5.0 — Query dashboard generik per role, paling kritis di v5.0 |

**Index Tabel "letter_status_logs"**

**Table 43 - Indexing Strategy - Table letter_status_logs**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_logs_letter | letter_id | B-Tree | Ambil semua log untuk 1 surat (status tracking) |
| idx_logs_created | created_at DESC | B-Tree | Sorting log terbaru |

**Index Tabel "citizens"**

**Table 44 - Indexing Strategy - Table citizens**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_citizens_nik_hash | nik_hash | B-Tree UNIQUE | Auto-fill & validasi NIK query paling sering dipanggil saat input surat |
| idx_citizens_village | village_id | B-Tree | Filter warga per desa |
| idx_citizens_name | name | B-Tree | Pencarian warga berdasarkan nama |
| idx_citizens_rt | rt_id | B-Tree | Filter warga per RT (resolve wilayah) |
| idx_citizens_hamlet | hamlet_id | B-Tree | Filter warga per dusun |
| idx_citizens_family | family_id | B-Tree | BARU v5.0 — Ambil semua anggota dalam satu KK |
| idx_citizens_residency | residency_type | B-Tree | BARU v5.0 — Filter warga lokal vs pendatang |
| idx_citizens_father | father_id | B-Tree | BARU v5.0 — Fitur pohon keluarga |
| idx_citizens_mother | mother_id | B-Tree | BARU v5.0 — Fitur pohon keluarga |

**Index Tabel "village_assets"**

**Table 45 - Indexing Strategy - Table village_assets**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_assets_village | village_id | B-Tree | List semua aset per desa |
| idx_assets_condition | condition | B-Tree | Filter aset berdasarkan kondisi (baik/rusak) |
| idx_assets_category | category | B-Tree | Filter aset berdasarkan kategori |
| idx_assets_village_condition | (village_id, condition) | Composite | Dashboard rekap aset per kondisi per desa |

**Index Tabel "village_finances"**

**Table 46 - Indexing Strategy - Table village_finances**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_finances_village_date | (village_id, transaction_date DESC) | Composite | Laporan keuangan per periode, query utama laporan |
| idx_finances_type | type | B-Tree | Filter pemasukan / pengeluaran |
| idx_finances_village_type | (village_id, type) | Composite | Agregasi SUM per tipe per desa (dashboard keuangan) |

**Index Tabel "notifications"**

**Table 47 - Indexing Strategy - Table notifications**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_notif_notifiable | (notifiable_type, notifiable_id) | Composite | Query semua notifikasi milik 1 user, dijalankan setiap halaman dimuat |
| idx_notif_read_at | read_at | B-Tree | Filter notifikasi belum dibaca (WHERE read_at IS NULL) |

**Index Tabel "officials"**

**Table 48 - Indexing Strategy - Table officials**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_officials_village | village_id | B-Tree | Filter jabatan per desa |
| idx_officials_position | position | B-Tree | Query RT/RW aktif |
| idx_officials_active | is_active | B-Tree | Filter jabatan aktif |
| idx_officials_resolve | (village_id, position, is_active) | composite | Resolve jabatan aktif per posisi per desa |
| idx_officials_user | user_id | B-Tree | Lookup user → jabatan (authorization check) |
| idx_officials_rt | rt_id | B-Tree | Resolve pejabat RT per wilayah RT |
| idx_officials_rw | rw_id | B-Tree | Resolve pejabat RW per wilayah RW |
| idx_officials_hamlet | hamlet_id | B-Tree | Resolve Kadus per dusun (struktural, non-approval) |

**Index Tabel rts:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_rts_rw | rw_id | B-Tree | Semua RT dalam satu RW |
| idx_rts_active | is_active | B-Tree | Filter RT aktif |

**Index Tabel rws:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_rws_hamlet | hamlet_id | B-Tree | Semua RW dalam satu dusun |

**Index Tabel hamlets:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_hamlets_village | village_id | B-Tree | Semua dusun dalam satu desa |

**Index Tabel letter_approvals:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_approvals_letter | letter_id | B-Tree | Semua approval untuk 1 surat |
| idx_approvals_deadline | deadline_at | B-Tree | Scheduler cek deadline yang terlewat |
| idx_approvals_level | (letter_id, approval_level) | Composite | Cek apakah sudah ada approval tahap tertentu untuk surat tertentu |

**Index Tabel letter_categories:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_categories_code | code | B-Tree UNIQUE | Lookup handler berdasarkan kode kategori |

**Index Tabel approval_flows:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_flows_category | category_id | B-Tree | Ambil semua flow dalam satu category |

**Index Tabel flow_steps:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_flowsteps_flow_order | (flow_id, step_order) | Composite UNIQUE | Query step aktif — paling kritis, dipanggil di setiap pengecekan gate |
| idx_flowsteps_position | approver_position | B-Tree | Resolve semua flow yang punya step approver tertentu |

**Index Tabel families:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_families_nokk_hash | no_kk_hash | B-Tree UNIQUE | Pencarian KK berdasarkan No KK |
| idx_families_village | village_id | B-Tree | Filter KK per desa |
| idx_families_rt | rt_id | B-Tree | Filter KK per RT |

**Index Tabel citizen_socioeconomics:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_socioeco_citizen | citizen_id | B-Tree UNIQUE | Relasi 1:1 dengan citizens |

#### 5.4.4. Strategi Enkripsi Field

Sistem SID mengelola data kependudukan warga (NIK, alamat) yang termasuk kategori data pribadi sangat sensitif sesuai UU PDP No. 27/2022. Untuk memastikan data tetap tidak terbaca meskipun terjadi kebocoran database, diterapkan enkripsi field-level menggunakan AES-256.

**Algoritma & Implementasi**

**Table 49 - Algoritma Implementasi Enkripsi**

| Aspek | Detail |
|---|---|
| Algoritma | AES-256-CBC |
| Implementasi | Laravel built-in Encryption (Illuminate\Contracts\Encryption\Encrypter) |
| Key Source | APP_KEY di file .env (32-byte random key) |
| Laravel Mechanism | $casts property di Eloquent Model |
| Password Hashing | Argon2id (bukan enkripsi, one-way hash) |

**Field yang Dienkripsi**

**Table 50 - Field Yang Dienkripsi**

| Tabel | Kolom | Alasan |
|---|---|---|
| citizens | nik | NIK warga, data pribadi sangat sensitif (UU PDP) |
| citizens | address | Alamat warga, data pribadi sensitif |
| families | no_kk | BARU v5.0 — No KK, data pribadi sangat sensitif, sepadan NIK |
| families | family_address | BARU v5.0 — Alamat resmi KK, data pribadi sensitif |
| letters | applicant_nik | NIK pemohon dalam permohonan surat |
| letters | applicant_address | Alamat pemohon dalam permohonan surat |
| users | password | Hash Argon2id (bukan enkripsi, tapi one-way hash) |

**Strategi Dual-Column untuk NIK dan No KK**

Kolom terenkripsi tidak dapat di-index secara langsung karena setiap proses enkripsi menghasilkan ciphertext yang berbeda meskipun plaintext-nya sama. Untuk tetap mendukung pencarian berdasarkan NIK/No KK, diterapkan strategi dual-column:

**Table 51 - Strategi Dual-Column**

| Kolom | Isi | Fungsi |
|---|---|---|
| nik / applicant_nik | AES-256 ciphertext | Penyimpanan aman, hanya bisa dibaca via Eloquent |
| nik_hash / applicant_nik_hash | SHA-256 dari NIK plaintext | Indexing & pencarian, tidak mengandung NIK asli, tidak bisa di-reverse |
| no_kk (families) | AES-256 ciphertext | BARU v5.0 — Penyimpanan aman No KK, pola sama dengan NIK |
| no_kk_hash (families) | SHA-256 dari No KK plaintext | BARU v5.0 — Indexing & pencarian No KK, tidak bisa di-reverse |

**Urutan Proses saat Surat Baru Dibuat:**

Urutan ini penting untuk konsistensi dengan mekanisme blockchain hashing (Next Dev — Paket 2):

1. Terima NIK dari request (plaintext)
2. Generate SHA-256 dari NIK plaintext → simpan ke applicant_nik_hash (untuk indexing)
3. Generate SHA-256 hash surat (untuk letter_hashes, Next Dev) menggunakan NIK plaintext SEBELUM dienkripsi
4. Enkripsi NIK dengan AES-256 → simpan ke applicant_nik
5. Simpan semua dalam satu DB::transaction()

**Key Management**

**Table 52 - Key Management**

| Aspek | Kebijakan |
|---|---|
| Penyimpanan key | APP_KEY di file .env, tidak pernah di-commit ke repository |
| Backup key | Simpan di tempat aman terpisah dari server (password manager / vault) |
| Rotasi key | Tidak boleh di-regenerate di production, semua data terenkripsi tidak dapat didekripsi jika key berubah |
| Environment | Key production berbeda dari key development/staging |

#### 5.4.5. Benchmarking Query

**Tujuan**

Membuktikan secara empiris efektivitas strategi indexing dan optimasi query yang diterapkan.

**Metodologi**

1. Generate data dummy menggunakan Laravel Seeders & Factories
   a. Target: 10.000 - 50.000 records di tabel letters
   b. Proporsional: citizens (~5.000), families (~1.500), assets (~500), finances (~2.000)
2. Jalankan setiap query tanpa index → catat execution time & query plan
3. Tambahkan index sesuai strategi di 5.4.3
4. Jalankan query yang sama, bandingkan hasil
5. Gunakan EXPLAIN ANALYZE (PostgreSQL) untuk melihat detail query execution plan
6. Dokumentasikan sebagai tabel perbandingan di laporan skripsi

**Query yang di-Benchmark**

**1. Kategori Surat**

**Table 53 - Query Benchmark - Kategori Surat**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-01 | `SELECT * FROM letters WHERE village_id = ? AND status = ?` | Filter surat by desa & status | Query utama dashboard, paling sering dieksekusi |
| Q-02 | `SELECT * FROM letters WHERE applicant_nik_hash = ?` | Cari surat berdasarkan NIK pemohon | Pencarian surat spesifik warga |
| Q-03 | `SELECT * FROM letters WHERE village_id = ? AND submitted_at BETWEEN ? AND ?` | Surat dalam periode tertentu | Laporan bulanan / tahunan |
| Q-04 | `SELECT status, COUNT(*) FROM letters WHERE village_id = ? GROUP BY status` | Agregasi jumlah surat per status | Widget statistik di dashboard |
| Q-05 | `SELECT * FROM letter_status_logs WHERE letter_id = ? ORDER BY created_at` | Semua log untuk 1 surat | Halaman status tracking, audit trail |
| Q-06 | `SELECT * FROM letters WHERE is_overdue = true AND village_id = ?` | Surat overdue deadline | Scheduler reminder + dashboard badge |
| Q-07 | `SELECT l.* FROM letters l JOIN flow_steps fs ON fs.flow_id = l.flow_id AND fs.step_order = l.current_step_order WHERE fs.approver_position = ? AND l.status IN ('pending','in_progress')` | BARU v5.0 — Query dashboard generik per role approver | Dipanggil di setiap dashboard approver (RT/Kades/Sekdes/Kasi/Kaur) |

**Kategori Warga**

**Table 54 - Query Benchmark - Kategori Warga**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-08 | `SELECT * FROM citizens WHERE nik_hash = ?` | Cari warga by NIK | Auto-fill saat input surat, dipanggil setiap input NIK |
| Q-09 | `SELECT * FROM citizens WHERE village_id = ? AND name LIKE ?` | Cari warga by nama | Pencarian warga di menu Data Warga |
| Q-10 | `SELECT * FROM citizens WHERE rt_id = ?` | Ambil warga per RT | Digunakan OfficialService saat resolve wilayah |
| Q-11 | `SELECT * FROM families WHERE no_kk_hash = ?` | BARU v5.0 — Cari KK by No KK | Auto-fill saat tambah anggota keluarga baru |
| Q-12 | `SELECT c.* FROM citizens c WHERE c.family_id = ?` | BARU v5.0 — Ambil semua anggota dalam satu KK | Tampilan detail KK, validasi kepala keluarga tunggal |

**Kategori Aset**

**Table 55 - Query Benchmark - Kategori Aset**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-13 | `SELECT * FROM village_assets WHERE village_id = ? AND condition = ?` | Filter aset by kondisi | Laporan rekap aset per kondisi |
| Q-14 | `SELECT condition, COUNT(*), SUM(value) FROM village_assets WHERE village_id = ? GROUP BY condition` | Agregasi rekap aset | Widget rekap aset di dashboard |

**Kategori Keuangan**

**Table 56 - Query Benchmark - Kategori Keuangan**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-15 | `SELECT * FROM village_finances WHERE village_id = ? AND transaction_date BETWEEN ? AND ?` | Laporan keuangan per periode | Laporan keuangan bulanan |
| Q-16 | `SELECT type, SUM(amount) FROM village_finances WHERE village_id = ? AND transaction_date BETWEEN ? AND ? GROUP BY type` | Rekap pemasukan & pengeluaran | Widget ringkasan keuangan di dashboard |

**Kategori Notifikasi**

**Table 57 - Query Benchmark - Kategori Notifikasi**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-17 | `SELECT * FROM notifications WHERE notifiable_type = ? AND notifiable_id = ? AND read_at IS NULL` | Notifikasi belum dibaca per user | Dieksekusi setiap halaman dimuat |

**Kategori Officials**

**Table 58 - Query Benchmark - Kategori Officials**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-18 | `SELECT * FROM officials WHERE village_id = ? AND position = ? AND is_active = true AND ended_at IS NULL` | Ambil semua pejabat aktif per posisi per desa | Dipanggil saat sistem resolve daftar RT/RW aktif |
| Q-19 | `SELECT o.* FROM officials o JOIN rts r ON o.rt_id = r.id WHERE r.id = ? AND o.position = 'rt' AND o.is_active = true AND o.ended_at IS NULL` | Resolve RT spesifik berdasarkan rt_id | Query kritis — dipanggil setiap warga submit surat |
| Q-20 | `SELECT o.* FROM officials o JOIN rws r ON o.rw_id = r.id WHERE r.id = ? AND o.position = 'rw' AND o.is_active = true AND o.ended_at IS NULL` | Resolve RW berdasarkan rw_id | Dipanggil setiap RT approve surat (untuk notifikasi FYI) |
| Q-21 | `SELECT * FROM officials WHERE village_id = ? AND position IN ('kepala_desa','sekdes') AND is_active = true AND ended_at IS NULL` | BARU v5.0 — Resolve Kades/Sekdes aktif berbasis posisi, bukan wilayah | Dipanggil setiap RT approve surat (approver berikutnya) |
| Q-22 | `SELECT * FROM officials WHERE user_id = ? AND position = ? AND is_active = true AND ended_at IS NULL` | Cek apakah user yang login adalah pejabat aktif di posisi tertentu | Dipanggil di setiap authorization check (Policy & OfficialService) |

**Kategori Deadline**

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-23 | `SELECT la.*, l.* FROM letter_approvals la JOIN letters l ON la.letter_id = l.id WHERE la.deadline_at < NOW() AND la.action IS NULL` | Surat yang melewati deadline | Scheduler setiap jam untuk kirim reminder |

**Template Tabel Hasil Benchmarking**

**Table 59 - Template Hasil Benchmark**

| # | Query | Tanpa Index (ms) | Seq Scan / Index? | Dengan Index (ms) | Index Scan / Type | Improvement |
|---|---|---|---|---|---|---|
| Q-01 | Filter surat village + status | - | - | - | - | - |
| Q-02 | Cari surat by NIK hash | - | - | - | - | - |
| Q-03 | Surat per periode | - | - | - | - | - |
| Q-04 | Agregasi status surat | - | - | - | - | - |
| Q-05 | Log audit satu surat | - | - | - | - | - |
| Q-06 | Surat overdue deadline | - | - | - | - | - |
| Q-07 | Dashboard generik per role approver | - | - | - | - | - |
| Q-08 | Auto-fill NIK warga | - | - | - | - | - |
| Q-09 | Cari warga by nama | - | - | - | - | - |
| Q-10 | Ambil warga per RT | - | - | - | - | - |
| Q-11 | Cari KK by No KK | - | - | - | - | - |
| Q-12 | Ambil anggota satu KK | - | - | - | - | - |
| Q-13 | Filter aset by kondisi | - | - | - | - | - |
| Q-14 | Rekap aset per kondisi | - | - | - | - | - |
| Q-15 | Laporan keuangan periode | - | - | - | - | - |
| Q-16 | Rekap pemasukan/pengeluaran | - | - | - | - | - |
| Q-17 | Notifikasi belum dibaca | - | - | - | - | - |
| Q-18 | Resolve pejabat aktif per posisi per desa | - | - | - | - | - |
| Q-19 | Resolve RT per wilayah | - | - | - | - | - |
| Q-20 | Resolve RW per wilayah | - | - | - | - | - |
| Q-21 | Resolve Kades/Sekdes berbasis posisi | - | - | - | - | - |
| Q-22 | Validasi user sebagai pejabat aktif | - | - | - | - | - |
| Q-23 | Surat melewati deadline | - | - | - | - | - |

### 5.5. Desain API

#### 5.5.1. Konvensi & Autentikasi

⚠ Diagram ada di file lain

#### 5.5.2. Endpoint Specification

⚠ Diagram ada di file lain

### 5.6. Keamanan Sistem

#### 5.6.1. Implementasi Keamanan per Layer

**Authentication & Authorization**

- Laravel Sanctum dengan SPA cookie-based auth token disimpan di HttpOnly cookie, bukan localStorage
- RBAC via spatie/laravel-permission setiap endpoint diproteksi middleware role
- Session timeout otomatis untuk mencegah sesi yang ditinggalkan
- (Opsional), ada kemungkinan Token API Based menggantikan cookie-based

**Data in Transit**

- Wajib HTTPS (TLS 1.2 / 1.3) di seluruh komunikasi client-server
- Force HTTPS dikonfigurasi di level Laravel (AppServiceProvider) dan web server
- Secure cookie + SameSite=Strict untuk mencegah CSRF lintas origin

**Data at Rest**

- Password pengguna: Argon2id lebih tahan terhadap GPU brute-force dibanding bcrypt
- Field sensitif NIK, No KK, dan alamat: AES-256-CBC via Laravel Encryption ($casts = encrypted)
- Key management: APP_KEY tersimpan di .env, tidak pernah di-commit ke repository

**Backend Security**

- CSRF protection aktif (default Laravel middleware)
- Semua input divalidasi via Laravel Form Request, tidak ada data yang masuk tanpa validasi
- Hanya menggunakan Eloquent ORM / Query Builder, raw query dilarang
- Rate limiting pada endpoint login dan seluruh API endpoint via Laravel Throttle
- Logging setiap failed login attempt

**Frontend Security**

- Token autentikasi disimpan di HttpOnly, cookie tidak dapat diakses via JavaScript (XSS-proof)
- React melakukan auto-escape semua output, mencegah XSS dari data yang ditampilkan
- Data sensitif tidak disimpan di React state lebih lama dari yang diperlukan
- Tidak ada data sensitif yang muncul di browser console atau network log yang tidak perlu

**Logging & Audit Trail**

**Table 60 - Logging & Audit Trail**

| Event yang Dicatat | Data yang Disimpan | Implementasi |
|---|---|---|
| Login & Logout | Timestamp, IP, user agent, status sukses/gagal | spatie/activitylog + custom listener |
| Failed Login Attempt | Timestamp, IP, email yang dicoba | Laravel event + log file |
| Perubahan status surat | Old status, new status, actor, IP | letter_status_logs table |
| Akses data sensitif (NIK, No KK) | User, surat/data yang diakses, timestamp, IP | spatie/activitylog custom log |
| Perubahan data kritis | Model, kolom berubah, old value, new value | spatie/activitylog |

**Backup & Recovery**

- Backup database dijadwalkan otomatis via Laravel Scheduler
- File backup dienkripsi sebelum disimpan tidak bisa dibaca tanpa decryption key
- Akses ke file backup dibatasi, terpisah dari direktori aplikasi
- Backup disimpan di lokasi terpisah dari server utama (offsite backup)

#### 5.6.2. Infrastruktur & Deployment

- Wajib HTTPS (TLS 1.2 / 1.3) force HTTPS di konfigurasi Laravel
- Secure + SameSite cookie configuration
- Firewall aktif hanya buka port 80, 443, dan SSH (port kustom)
- SSH key authentication nonaktifkan password-based SSH login
- fail2ban aktif untuk proteksi brute-force pada SSH dan endpoint login
- Update rutin: OS, PHP, PostgreSQL, dan seluruh dependency
- Disable PHP error display di production gunakan logging ke file
- Disable directory listing di konfigurasi web server.

#### 5.6.3. Compliance

**Table 61 - Compliance**

| Regulasi / Standar | Relevansi | Implementasi dalam Sistem |
|---|---|---|
| UU PDP No. 27/2022 | NIK, No KK, dan data kependudukan adalah data pribadi yang dilindungi hukum | Field-level encryption, access log, data minimization hanya kumpulkan data yang diperlukan |
| SNI ISO/IEC 27001 | Framework internasional manajemen keamanan informasi | Dijadikan referensi kebijakan keamanan dan kontrol teknis yang diterapkan |
| Panduan BSSN / SPBE | Standar keamanan sistem pemerintahan berbasis elektronik di Indonesia | Acuan arsitektur keamanan dan deployment environment |

---

## 6. KLASIFIKASI DATA & THREAT MODELING

### 6.1. Klasifikasi Data

Seluruh data yang dikelola sistem diklasifikasikan ke dalam tiga level berdasarkan tingkat sensitivitas dan implikasi perlindungannya:

**Table 62 - Klasifikasi Data**

| Level | Data | Contoh | Perlakuan |
|---|---|---|---|
| Sangat Sensitif | Data pribadi desa, dan kependudukan | NIK, No. KK, data pemohon surat, data sosio-ekonomi warga. Data keuangan desa sensitif | Enkripsi AES-256 field-level, log setiap akses |
| Sensitif Sedang | Data identitas pengguna sistem | Nama, alamat, email, no. HP user | Proteksi RBAC, tidak expose di log publik |
| Rendah | Data publik/operasional | Nama desa, berita, profil profil, data aset desa (kode, nama, lokasi) | Standard protection |

### 6.2. Threat Modeling

Threat modeling mendefinisikan aset yang dilindungi, potensi ancaman, dan strategi mitigasi yang diterapkan pada sistem

**Aset yang Dilindungi:**

- Data NIK dan No. KK warga yang diproses dalam permohonan surat dan data keluarga
- Dokumen surat resmi dan riwayat keputusan approval (termasuk audit trail per flow_step)
- Kredensial (username & password) seluruh pengguna sistem
- Integritas rantai data (hash chain) yang membuktikan keaslian surat (Next Dev)
- Data sosio-ekonomi warga
- Data aset desa dan catatan keuangan desa

**Tabel Ancaman & Mitigasi:**

**Table 63 - Ancaman & Mitigasi**

| Threat | Skenario | Mitigasi |
|---|---|---|
| Admin internal abuse | Akses atau modifikasi data tanpa keperluan resmi | RBAC ketat + audit log setiap akses data sensitif |
| Credential bocor | Login dari luar menggunakan kredensial yang bocor | Rate limiting + HttpOnly cookie + fail2ban di server |
| Database bocor langsung | Direct DB access saat server dikompromis | Field-level encryption, NIK/No KK tetap tidak terbaca meskipun DB bocor |
| Akun admin diambil alih | Full akses ke data seluruh desa oleh pihak tidak berwenang | Enkripsi data + audit trail + session timeout otomatis |
| SQL Injection | Input berbahaya dikirim via form atau API endpoint | Eloquent ORM only, hindari raw query, validasi semua input |
| XSS Attack | Skrip berbahaya diinjeksi melalui form input | React auto-escape + validasi dan sanitasi di backend |
| Backup tidak aman | File backup dibaca oleh pihak tidak berwenang | Backup dienkripsi sebelum disimpan, akses dibatasi |
| Misconfig server | Port terbuka, SSH password login aktif | Firewall + SSH key authentication + fail2ban |
| Race condition approval (Kades/Sekdes) | Kades dan Sekdes memproses surat yang sama di step yang sama secara bersamaan | Disederhanakan sebagai app-layer check (first-action-wins) — dicatat sebagai limitasi yang diterima, bukan solusi permanen |

---

## 7. NON-FUNCTIONAL REQUIREMENTS

**Table 64 - Non-Functional Requirements**

| Aspek | Requirement | Keterangan |
|---|---|---|
| Performance | Response API ≤ 500ms untuk operasi CRUD standar | Diukur di staging environment dengan data representatif |
| Performance | Response API ≤ 2000ms untuk operasi kompleks | Kompleks: generate hash (Next Dev), query laporan, agregasi |
| Concurrent Users | Minimal 50 concurrent users tanpa degradasi signifikan | Diuji dengan load testing tool (Apache JMeter / k6) |
| Scalability | Penambahan desa baru tanpa perubahan struktur database | Arsitektur modular hanya tambah data, bukan skema |
| Scalability | Penambahan flow approval baru untuk jenis surat baru tanpa perubahan kode | BARU v5.0 — cukup tambah row di approval_flows + flow_steps |
| Security | HTTPS wajib, Argon2id, AES-256, RBAC, rate limiting | Seluruh layer keamanan harus aktif di production |
| Reliability | Semua transaksi kritis menggunakan DB::transaction() | ACID compliance data tidak boleh setengah tersimpan |
| Queue Reliability | Queue job dilengkapi retry mechanism | Notifikasi dan hashing tidak boleh hilang jika gagal sekali |
| Availability | 99% uptime di staging/production environment | Downtime terencana (maintenance) tidak dihitung |
| Maintainability | Kode mengikuti standar PSR-12 | Enforced via PHP CS Fixer atau Laravel Pint |
| Documentation | Seluruh API endpoint terdokumentasi di Postman/Swagger | Wajib sebelum handover ke client |
| Audit | Semua aksi kritis tercatat dengan timestamp dan IP address | Tidak boleh ada aksi tanpa jejak di sistem log |

---

## 8. ROADMAP & RESIKO

### 8.1. Roadmap Pengembangan

Roadmap ini sangat terbuka pada requirement client setelah observasi pertama.

**Table 65 - Roadmap Pengembangan**

| Tahap | Fokus | Deliverable | Prasyarat |
|---|---|---|---|
| Tahap 1 Core System (MVP) | Warga self-service: register, login, submit, tracking status; Approval dinamis berbasis Category+Flow (default: RT → RW notif-only → Kades/Sekdes → Kasi/Kaur); Download PDF on-demand; Deadline approval + reminder scheduler; CRUD citizens + families (KK) + citizen_socioeconomics + import Excel (maatwebsite/excel); Kelola struktur wilayah (hamlets/rws/rts); Kelola jabatan struktural (officials, termasuk Sekretaris Desa); Kelola organisasi non-struktural (BPD, BUMDES, LPM, Karang Taruna, PKK); Kelola peraturan desa; Halaman publik; Dashboard per role (9 role); Notifikasi in-app + email; Queue driver: database | Semua fitur MVP aktif: Fitur input, approval, tracking aktif; dashboard; manajemen user & data desa | Arsitektur dan Setup project selesai, database termigrasi |
| Tahap 2 Penguatan Integritas & Keamanan | Aset & Keuangan Desa (village_assets, village_finances, UC-11/12/13); Kelayakan Bantuan Sosial (citizen_aid_eligibility, citizen_aid_history, aid_programs); Redis + Laravel Horizon; Docker + Laravel Sail; Benchmarking query lengkap; Security hardening | Notifikasi in-app & email berjalan; enkripsi field aktif; deadline & reminder aktif; hasil benchmarking terdokumentasi (hash chain & dynamic form TIDAK termasuk — lihat Next Dev Paket 1 & 2) | Tahap 1 stabil |
| Next Dev — Paket 1 | Dynamic Tipe Surat: create tipe surat baru, WYSIWYG template editor, CRUD field requirement (letter_type_fields, letter_field_values) | Petugas Desa mandiri kelola tipe surat tanpa developer | Tahap 1 stabil |
| Next Dev — Paket 2 | Blockchain-inspired hashing (UC-07, letter_hashes, HashingService, LetterObserver) | Validasi integritas data surat | Tahap 1 stabil |
| Tahap 3 Pengembangan Lanjutan | WA Chatbot (WhatsApp Business API); Cetak surat mandiri untuk Warga; integrasi API eksternal (Dukcapil, sinkronisasi data.data_source); AI (opsional) | Multi-channel access, integrasi eksternal. | Tahap 2 stabil, validasi kebutuhan client |

### 8.2. Asumsi & Risiko

#### 8.2.1. Asumsi & Risiko Infrastruktur Teknis

**Table 66 - Asumsi & Risiko Infrastruktur Teknis**

| Asumsi | Risiko | Skenario Jika Salah | Mitigasi |
|---|---|---|---|
| Kantor desa memiliki akses internet yang stabil | SEDANG | Sistem tidak dapat diakses data tidak bisa diinput atau di-approve secara real-time | Desain UI yang toleran terhadap koneksi lambat; fitur draft offline-first untuk input (future) |
| Server deployment tersedia dengan spesifikasi minimum: 2 vCPU, 2GB RAM, 20GB SSD | TINGGI | Performa sistem degradasi; implementasi keamanan (HTTPS, fail2ban, firewall) tidak bisa diterapkan penuh | Dokumentasikan minimum server requirement sejak awal. Siapkan alternatif managed hosting |
| Queue worker (Supervisor/Horizon) dapat dikonfigurasi dan dijaga tetap berjalan di server | SEDANG | Notifikasi dan proses hashing (Next Dev) tidak berjalan secara async sistem terasa lambat atau fitur tidak berfungsi | Siapkan konfigurasi Supervisor sebagai bagian dari deployment script |
| PostgreSQL tersedia dan dapat dikonfigurasi di server deployment | RENDAH | Implementasi keamanan (HTTPS, fail2ban, firewall) tidak bisa diterapkan penuh | Dokumentasikan minimum requirement server sejak awal; siapkan alternatif shared hosting |
| Docker belum dipakai di Tahap 1, environment development manual | RENDAH | Environment berbeda antar device developer | Dokumentasikan versi PHP/PostgreSQL/extension yang digunakan; Docker masuk Tahap 2 |

#### 8.2.2. Asumsi & Risiko Operasional & Sosial

**Table 67 - Asumsi & Risiko Operasional & Sosial**

| Asumsi | Risiko | Skenario Jika Salah | Mitigasi |
|---|---|---|---|
| Admin desa memiliki kemampuan dasar menggunakan aplikasi web | SEDANG | Resistensi adopsi sistem tidak digunakan meskipun sudah dibangun | Rancang UI yang intuitif; sediakan dokumentasi pengguna dan sesi pelatihan |
| Data NIK/No KK yang diinput sudah tervalidasi secara manual oleh admin desa | RENDAH | Data NIK/No KK salah tersimpan dan terenkripsi sulit dikoreksi | Tambahkan validasi format NIK 16 digit dan format No KK di frontend dan backend |
| Kepala desa mendukung implementasi dan penggunaan sistem, termasuk perannya sebagai approver aktif (v5.0) | SEDANG | Resistensi dari level pimpinan menyebabkan sistem tidak dioperasikan, atau surat mandek karena Kades tidak terbiasa jadi approver aktif | Lakukan sosialisasi dan demo sistem sejak awal kepada pemangku kepentingan, khususnya soal perubahan peran dari monitoring-only menjadi approver aktif |

### 8.3. Pertanyaan Prioritas

Bagian ini mendokumentasikan pertanyaan-pertanyaan yang perlu dikonfirmasi sebelum atau selama fase pengembangan. Dokumen akan diperbarui setelah masing-masing pertanyaan terjawab.

#### 8.3.1. Validasi dengan Pihak Desa / Client

**Table 68 - Validasi Pihak Desa/Client**

| Pertanyaan | Status | Jawaban |
|---|---|---|
| Jenis surat apa saja yang perlu dikelola di fase pertama? (SKD, SKU, SKCK, dll.) | Belum dikonfirmasi | |
| Apakah infrastruktur server sudah tersedia, atau perlu disiapkan dari awal oleh tim? | Belum dikonfirmasi | |
| Apakah ada sistem eksisting (manual atau digital) yang perlu dipertimbangkan untuk migrasi data? | Belum dikonfirmasi | |
| Apakah desa manage jabatan BPD/BUMDES/LPM/Karang Taruna/PKK di app, atau statis? | Menunggu konfirmasi | — |
| Apakah history jabatan organisasi non-struktural ditampilkan ke publik? | Menunggu konfirmasi | — |
| Apakah jumlah anggota BPD fix atau dinamis? | Menunggu konfirmasi | — |
| Struktur BUMDES, LPM, Karang Taruna, PKK — fix atau dinamis? | Menunggu konfirmasi | — |
| Apakah Sekretaris Desa resmi ikut menjadi approver di step yang sama dengan Kepala Desa (saling menggantikan)? | Menunggu konfirmasi (BARU v5.0) | — |

#### 8.3.2. Keputusan Teknis Internal Tim

**Table 69 - Keputusan Teknis Tim Internal**

| Pertanyaan | Status | Jawaban |
|---|---|---|
| Queue driver Tahap 1: database (sudah diputuskan) | Belum dikonfirmasi | |
| Docker + Laravel Sail masuk Tahap 2 (sudah diputuskan) | Belum dikonfirmasi | |
| Apakah notifikasi email aktif di MVP atau in-app dulu? | Belum dikonfirmasi | |
| React via Rest API atau via Inertia. | Belum dikonfirmasi | |
| Apakah fitur rotasi jabatan organisasi non-struktural diaktifkan di UI MVP? | Menunggu konfirmasi desa | — |
| Apakah kolom `assigned_role` di `letter_types` dipertahankan sebagai cache atau dihapus (karena redundan dengan `flow_steps.approver_position`)? | Belum diputuskan (BARU v5.0) | Direkomendasikan dipertahankan sementara |
| Konsistensi ENUM `approval_settings.approval_level` (masih 'rt'/'rw'/'kadus'/'kasi' lama) terhadap `letter_approvals.approval_level` yang sudah berubah di v5.0 — perlu disamakan? | Belum diputuskan (BARU v5.0, catatan revisi dokumen) | — |

### 8.4. Known Technical Constraints

Bagian ini mendokumentasikan keterbatasan teknis yang sudah dapat diprediksi sebelum development dimulai, beserta solusi yang telah dirancang.

**Table 70 - Known Technical Constraints**

| Constraint | Dampak | Solusi |
|---|---|---|
| Kolom AES-256 tidak bisa di-index langsung | Query by NIK/No KK tidak bisa pakai index | Dual-column: encrypted + hash untuk indexing (nik_hash, no_kk_hash) |
| Queue worker harus selalu aktif | Hashing (Next Dev) & notifikasi tidak jalan jika worker mati | Supervisor (Tahap 1) → Laravel Horizon (Tahap 2) |
| APP_KEY tidak boleh berubah di production | Semua data terenkripsi tidak bisa didekripsi | Simpan APP_KEY di tempat aman; jangan pernah regenerate di prod |
| on_behalf_of nullable di MVP | Warga submit sendiri di MVP, kolom selalu NULL | Kolom tetap ada untuk future use case di mana petugas mungkin perlu input atas nama warga tertentu (post-observasi client) |
| Tabel Official harus selalu punya minimal 1 RT aktif per wilayah | Routing notifikasi dan gate approval bergantung pada RT aktif | Query selalu filter is_active=true AND ended_at IS NULL; fallback notifikasi ke semua petugas_desa aktif jika RT tidak ditemukan (broadcast) |
| Redis belum dipakai di Tahap 1 | Queue & cache belum optimal | Database queue cukup untuk traffic desa kecil, switch hanya ubah .env |
| Docker belum dipakai di Tahap 1 | Environment dev mungkin berbeda antar mesin | Dokumentasikan versi PHP/PostgreSQL, Docker masuk di Tahap 2 |
| Template surat di MVP diinject developer via seeder | Petugas Desa tidak bisa mandiri tambah tipe surat baru | Petugas contact developer → developer inject template → aktifkan di UC-21 |
| Tipe surat dengan template=NULL tidak bisa dipakai warga | Warga tidak bisa submit surat yang belum ada template | Guard di backend + badge "Draft" di admin page |
| Approval yang mandek tidak ada auto-resolve | Surat bisa stuck jika pejabat tidak action | Reminder via scheduler + badge overdue di dashboard |
| PDF on-demand: generate setiap klik | Slight latency saat download | Acceptable trade-off — tidak signifikan untuk traffic desa kecil |
| village_org_positions & village_org_members pending konfirmasi desa | Fitur rotasi jabatan organisasi belum bisa diaktifkan | Seed hardcode dulu; aktifkan/disable fitur di UI setelah konfirmasi |
| Blockchain-inspired hashing dikeluarkan dari MVP | Integritas data surat belum tervalidasi di MVP | Fitur dicatat lengkap di Section 3.4 untuk implementasi di Next Dev Paket 2 |
| Tidak ada DB-level lock untuk mencegah Kades & Sekdes approve bersamaan (BARU v5.0) | Kemungkinan kecil race condition di step yang sama | Disederhanakan sebagai app-layer check (first-action-wins), diterima sebagai trade-off untuk traffic desa kecil |
| Kolom `assigned_role` berpotensi redundan dengan `flow_steps.approver_position` (BARU v5.0) | Ada dua sumber informasi "siapa approver" untuk Kasi/Kaur | Dipertahankan sebagai cache/derived column untuk kompatibilitas mundur; source of truth resmi tetap flow_steps |
| `approval_settings.approval_level` ENUM belum diselaraskan dengan `letter_approvals.approval_level` v5.0 (catatan revisi) | Konfigurasi deadline berpotensi tidak sinkron dengan tahap approval yang benar-benar berjalan | Perlu ditinjau ulang oleh tim teknis — di luar cakupan instruksi Patch Guide v5.0 yang eksplisit, dicatat sebagai technical debt |

---

*Dokumen ini adalah hasil revisi kerapian TDD v5.0 Sistem Informasi Desa Cibenda, diselaraskan dengan Patch Guide v3.2→v4.2 dan Patch Guide v4.2→v5.0. Seluruh referensi diagram visual (use case, sequence, ERD, arsitektur, deployment, struktur folder) tetap disimpan di file terpisah dan diberi label "⚠ Diagram ada di file lain" sesuai instruksi.*
