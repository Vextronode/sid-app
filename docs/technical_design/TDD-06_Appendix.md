# TECHNICAL DESIGN DOCUMENT — APPENDIX
## SISTEM INFORMASI DESA - DESA CIBENDA
### Riwayat Versi & Detail Fitur Next Dev / Tahap 2

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | Appendix (di luar badan dokumen utama TDD-01 s/d TDD-05) |
| Tujuan | (A) Menyimpan riwayat perubahan versi v1–v5.0 secara lengkap tanpa menggemukkan badan dokumen utama; (B) menyimpan detail teknis fitur Next Dev/Tahap 2 yang belum diimplementasikan, sebagai referensi pengembangan lanjutan |
| Cara pakai | Bagian A murni historis — untuk audit/konteks "kenapa sistem jadi begini". Bagian B berisi skema/desain siap pakai kapan pun fitur terkait mulai dikerjakan — **silakan dipotong/dipindah ke dokumen tersendiri per fitur saat mulai development-nya.** |

---

# BAGIAN A: RIWAYAT VERSI

## A.1. Riwayat Perubahan (Table Versi Lengkap)

| Versi | Tanggal | Perubahan | Oleh |
|---|---|---|---|
| 1 | 16 April 2026 | Draft awal, disusun berdasarkan asumsi requirement awal | Handika Chandra Pratama |
| 2 | 25 April 2026 | Revisi arah aplikasi dan sistem | Handika Chandra Pratama |
| 2.1 | 09 Mei 2026 | Penyesuaian minor pada sedikit inkonsistensi | Handika Chandra Pratama |
| 3.1 | 19 Mei 2026 | Perluasan Scope, Fitur | Nadirah |
| 3.2 | 20 Mei 2026 | Revisi Diagram | Handika |
| 4.0 | Juni 2026 | Post-observasi client: 4-tahap approval hardcode (RT→RW→Kadus→Kasi), 8 role, struktur wilayah proper (hamlets/rws/rts), deadline approval + reminder, PDF on-demand. | Handika Chandra Pratama |
| 4.1 | Juni 2026 | Import Excel warga masuk Tahap 1, organisasi non-struktural desa (`village_org_positions` + `village_org_members`), peraturan desa, domisili warga, UI grouping manajemen jabatan. 22 UC aktif MVP (26 UC total termasuk non-MVP), 17 tabel MVP. | Handika Chandra Pratama |
| 4.2 | Juni 2026 | Role `sekretaris_desa` baru (ENUM jadi 9 nilai), Sekdes punya akun sistem dengan scope monitoring identik Kepala Desa, scope monitoring surat per role dikonfirmasi (Petugas Desa = semua, Kades/Sekdes = hanya status level desa — **masih monitoring-only di versi ini**), dynamic form digabung ke Next Dev satu paket dengan WYSIWYG + create tipe surat. | Handika Chandra Pratama |
| 5.0 | (patch diterapkan) | **Perombakan besar RBAC**: RT approve → RW notif-only → Kades/Sekdes approve (bukan lagi monitoring-only) → Staff final. Sistem Category+Flow approval dinamis menggantikan hardcode 4-tahap RT→RW→Kadus→Kasi. Restrukturisasi data warga: tabel `families`/KK terpisah dari `citizens`, `citizen_socioeconomics`, `residency_type` lokal/pendatang, self-reference orang tua (`father_id`/`mother_id`). | Handika Chandra Pratama |
| 5.0.1 | (revisi dokumen) | Revisi kerapian dokumen: koreksi judul tabel yang salah label, pemisahan section Next Dev jadi sub-section terpisah, update daftar sequence diagram, klarifikasi peran Kadus sebagai aktor non-approval. Tidak ada perubahan keputusan teknis/skema — murni penyelarasan dokumen. | — |
| 5.0.2 (pecahan ini) | (tanggal pemecahan dokumen) | **Pemecahan TDD menjadi 6 file** (TDD-01 s/d TDD-05 + Appendix ini) untuk penggunaan sebagai knowledge base AI. **Koreksi substantif**: status ENUM `approval_settings.approval_level` yang sebelumnya dicatat "belum diselaraskan/technical debt" dikoreksi menjadi "sudah diselaraskan" berdasarkan migration project yang berjalan (lihat Section A.2 di bawah). Riwayat versi v1–v5.0.1 dipindah ke Appendix ini; detail Next Dev/Tahap 2 dipindah ke Appendix ini. Badan dokumen utama (TDD-01–05) difokuskan pada state final v5.0, bebas dari jejak historis patch-per-patch. | — |

## A.2. Riwayat Koreksi Spesifik: `approval_settings.approval_level`

Ini catatan khusus karena poin ini sempat jadi sumber ambiguitas antar dokumen (TDD vs OpenAPI Spec) dan layak didokumentasikan proses koreksinya.

**Kronologi:**

1. **Versi TDD sebelum pecahan ini** (v5.0 dan v5.0.1) mencatat kolom `approval_settings.approval_level` sebagai:
   > *"Peninggalan skema v4.2 yang belum eksplisit di-patch ulang oleh Patch Guide v5.0 — Patch Guide v5.0 tidak menyebutkan perubahan pada `approval_settings`... dicatat sebagai potensi technical debt, bukan diubah sepihak."*

   ENUM yang tercatat di TDD versi ini: `ENUM('rt','rw','kadus','kasi')` — 4 nilai, peninggalan v4.2.

2. **OpenAPI Spec v5.0** (dibuat pada periode rencana migrasi v4→v5 sudah matang, tapi TDD belum dipatch penuh) sudah lebih dulu mengasumsikan ENUM baru 5 nilai (`rt`, `kepala_desa`, `sekdes`, `kasi_pelayanan`, `kaur_tu_umum`), dengan catatan eksplisit di dalamnya sendiri: *"mengikuti rekomendasi Rencana Migrasi Fase 6.1, BUKAN keputusan final TDD."*

3. **Migration Laravel yang benar-benar dijalankan di project** (`database/migrations/..._create_approval_settings_table.php`) mengonfirmasi ENUM sudah dibuat dengan 5 nilai baru sejak awal:
   ```php
   $table->enum('approval_level', [
       'rt',
       'kepala_desa',
       'sekdes',
       'kasi_pelayanan',
       'kaur_tu_umum',
   ]);
   ```

4. **Kesimpulan:** OpenAPI Spec benar, TDD (sebelum pecahan ini) yang outdated di poin spesifik ini. Kode/migration adalah sumber kebenaran tertinggi. TDD-03 dan TDD-05 pada pecahan dokumen ini sudah dikoreksi untuk mencerminkan hal ini.

**Pelajaran untuk pengelolaan dokumen ke depan:** ketika sebuah keputusan teknis dieksekusi langsung di kode tanpa "menunggu" TDD dipatch dulu (sah-sah saja terjadi di kerja nyata), status di TDD berisiko basi. Rekomendasi: setiap kali ada migration yang menyentuh kolom/tabel yang punya catatan "technical debt" atau "belum diputuskan" di TDD, jadikan itu trigger untuk cek & update baris status terkait di TDD — tidak perlu revisi besar, cukup update baris status seperti pola di atas.

---

# BAGIAN B: DETAIL FITUR NEXT DEV / TAHAP 2 (BELUM DIIMPLEMENTASI)

> Seluruh fitur di bagian ini **tidak ada di MVP** dan belum dikerjakan. Detail disimpan di sini sebagai referensi siap pakai — silakan dipindahkan ke dokumen tersendiri (misal `NextDev_Paket1_DynamicSurat.md`, `NextDev_Paket2_Blockchain.md`, `Tahap2_AsetKeuangan.md`) begitu masing-masing mulai masuk sprint pengembangan.

## B.1. Next Dev — Paket 2: Blockchain-Inspired Hashing

**Status:** Next Dev Paket 2. Tabel `letter_hashes`, `LetterObserver`, `GenerateLetterHashJob`, dan `HashingService` **tidak diimplementasikan** di Tahap 1/MVP.

### Latar Belakang & Justifikasi

Sistem administrasi digital rentan terhadap manipulasi data langsung pada level database, baik melalui celah keamanan maupun penyalahgunaan akses oleh pihak internal. Teknologi blockchain telah terbukti mengatasi permasalahan ini melalui mekanisme hash chain, namun implementasi blockchain penuh memerlukan infrastruktur jaringan yang kompleks dan biaya operasional yang tidak feasible untuk sistem administrasi tingkat desa.

Sistem ini mengadopsi konsep inti blockchain (mekanisme hash chain berbasis SHA-256) dan mengimplementasikannya pada level database relasional — disebut *blockchain-inspired data integrity validation*.

**Justifikasi Blockchain-Inspired Hashing**

| Pertanyaan Umum | Jawaban / Justifikasi |
|---|---|
| Mengapa tidak pakai blockchain asli? | Blockchain memerlukan konsensus jaringan (nodes), smart contract, dan gas fee. Tujuannya integritas data, bukan desentralisasi. Pendekatan ini lebih feasible untuk infrastruktur desa. |
| Apa bedanya dengan enkripsi biasa? | SHA-256 adalah one-way hash function — tujuannya bukan menyembunyikan data, tapi menghasilkan fingerprint unik yang tidak bisa dipalsukan tanpa terdeteksi. |
| Seberapa aman SHA-256? | Standar industri yang digunakan Bitcoin dan TLS. Belum ada collision attack yang berhasil secara praktis. |
| Limitasi yang harus diakui | Efektif mendeteksi direct DB manipulation. Tidak efektif jika attacker punya akses kode (bisa regenerate hash). Tidak setara full blockchain jaringan. |

### Mekanisme Pembuatan Hash

1. Data surat diterima dalam bentuk plaintext
2. Ambil field kritis: `id`, NIK plaintext, `letter_type_id`, `submitted_at`, dan `prev_hash` dari block terakhir
3. Generate SHA-256 hash dari kombinasi field tersebut
4. Enkripsi NIK dengan AES-256 (setelah hash digenerate)
5. Simpan hash ke tabel `letter_hashes` dengan referensi `prev_hash` membentuk chain
6. Seluruh proses dijalankan dalam satu `DB::transaction()` untuk konsistensi

### Mekanisme Validasi Integritas

1. Ambil data surat dari database
2. Decrypt kolom terenkripsi untuk mendapatkan nilai plaintext
3. Generate ulang SHA-256 hash dari field kritis yang sama
4. Bandingkan hash yang baru digenerate dengan hash tersimpan di `letter_hashes`
5. VALID: hash cocok, data tidak pernah dimodifikasi. TIDAK VALID: hash berbeda, data telah dimodifikasi setelah surat disimpan

### Chain Mechanism

Setiap block hash menyimpan referensi ke hash block sebelumnya (`prev_hash`), membentuk rantai yang tidak dapat dimanipulasi sebagian:

- Block 1 → hash1 (`prev_hash = NULL`)
- Block 2 → hash2 (`prev_hash = hash1`)
- Block 3 → hash3 (`prev_hash = hash2`)
- Jika data pada Block 1 diubah → hash1 berubah → chain Block 2 dan 3 ikut rusak

### Skema Tabel: letter_hashes

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, UNIQUE | Satu hash per surat |
| hash_value | VARCHAR(64) | NOT NULL | SHA-256 hash dari data surat (64 hex chars) |
| prev_hash | VARCHAR(64) | NULL | Hash block sebelumnya, NULL jika block pertama |
| block_index | BIGINT | NOT NULL | Urutan block dalam chain (sequential) |
| is_valid | BOOLEAN | DEFAULT true | Hasil validasi integritas terakhir |
| created_at | TIMESTAMP | NOT NULL | Waktu hash dibuat |

### Use Case Terkait: UC-07 — Validasi Integritas Data Surat

| Field | Keterangan |
|---|---|
| Use Case ID | UC-07 |
| Nama | Validasi Integritas Data Surat |
| Aktor | Kepala Desa |
| Pre-condition | Kepala Desa sudah login, surat dan hash-nya sudah tersimpan di `letter_hashes` |
| Post-condition | Sistem menampilkan hasil validasi integritas data surat |

Main Flow:
1. Kepala Desa membuka detail surat
2. Kepala Desa menekan tombol "Validasi Integritas"
3. Sistem memanggil `HashingService::validateIntegrity(letterId)`
4. Service mengambil data surat dari DB dan mendekripsi NIK (AES-256)
5. Service meng-generate ulang SHA-256 hash dari field kritis (id, NIK, type_id, submitted_at, prev_hash)
6. Service membandingkan hash baru dengan hash tersimpan di `letter_hashes`
7. Hasil: VALID (data otentik) atau TIDAK VALID (terdeteksi modifikasi, sistem tandai `is_valid = false`)

### Implementasi Laravel (Rencana)

- Laravel Observer auto-trigger saat model `Letter` dibuat
- Laravel Background Job (`GenerateLetterHash`) dijalankan via Queue agar tidak memblokir response
- `HashingService` — service class yang mengelola logika hash dan validasi

### Urutan Proses (Terintegrasi dengan Alur Submit Surat)

Urutan ini penting untuk konsistensi dengan mekanisme hashing saat fitur ini dikerjakan:

1. Terima NIK dari request (plaintext)
2. Generate SHA-256 dari NIK plaintext → simpan ke `applicant_nik_hash` (untuk indexing — **ini sudah berjalan di MVP**)
3. Generate SHA-256 hash surat (untuk `letter_hashes`) menggunakan NIK plaintext **sebelum** dienkripsi — **ini bagian yang belum diimplementasikan**
4. Enkripsi NIK dengan AES-256 → simpan ke `applicant_nik`
5. Simpan semua dalam satu `DB::transaction()`

---

## B.2. Next Dev — Paket 1: Dynamic Tipe Surat (Create + WYSIWYG + Field Requirement)

**Status:** Next Dev Paket 1. Digabung jadi satu paket karena ketiga kebutuhan (create tipe surat baru, WYSIWYG template editor, edit field requirement) butuh infrastruktur tabel yang sama persis — memisahnya hanya akan membangun setengah infrastruktur yang harus dilengkapi nanti.

### Scope Next Dev Paket 1

- Petugas Desa bisa create tipe surat baru (tidak lagi developer-only)
- WYSIWYG template editor menggantikan seeder developer untuk `letter_types.template`
- Petugas Desa bisa CRUD field requirement per tipe surat (dokumen, checklist, field teks), termasuk untuk tipe surat yang sudah ada dan sudah dipakai warga

### Skema Tabel: letter_type_fields

Skema form dinamis per tipe surat.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_type_id | BIGINT | FK → letter_types.id, NOT NULL | Tipe surat pemilik field |
| label | VARCHAR(150) | NOT NULL | Label field yang tampil ke warga |
| field_key | VARCHAR(100) | NOT NULL | Identifier snake_case, unik per letter_type |
| field_type | ENUM | NOT NULL | `text` \| `textarea` \| `number` \| `date` \| `select` \| `image` \| `document` \| `checkbox` |
| options | JSON | NULL | Hanya untuk `field_type = 'select'` |
| is_required | BOOLEAN | DEFAULT true | Wajib diisi warga |
| hint_text | VARCHAR(255) | NULL | Teks bantuan untuk warga |
| validation_rules | JSON | NULL | Contoh: `{"max_size_kb":2048,"allowed_ext":["pdf"]}` |
| sort_order | INT | DEFAULT 0 | Urutan tampil di form |
| is_active | BOOLEAN | DEFAULT true | Soft delete flag |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

### Skema Tabel: letter_field_values

Jawaban warga per pengajuan.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, NOT NULL | Surat yang mengandung jawaban ini |
| field_id | BIGINT | FK → letter_type_fields.id, NOT NULL | Field yang dijawab |
| field_key | VARCHAR(100) | NOT NULL | Denormalized — untuk histori jika field di-soft-delete |
| value_text | TEXT | NULL | Untuk: text, textarea, number, date, select, checkbox |
| value_file | VARCHAR(255) | NULL | Untuk: image, document (path storage) |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

### Constraint Edit/Delete Field (Rencana)

| Aksi | Field belum dipakai warga | Field sudah dipakai warga |
|---|---|---|
| Edit label, hint_text, is_required, sort_order | Bebas | Bebas |
| Edit field_type | Bebas | Dilarang — soft-delete + buat baru |
| Edit field_key | Bebas | Dilarang — data lama pakai key lama |
| Edit validation_rules | Bebas | Hanya boleh memperlunak, tidak memperketat |
| Edit options (tambah pilihan) | Bebas | Boleh |
| Edit options (rename/hapus yang sudah dipilih) | Bebas | Dilarang |
| Delete | Hard delete | Soft delete (`is_active = false`) |

Cek "sudah dipakai": `LetterFieldValue::where('field_id', $fieldId)->exists()`

### Status Tabel `letter_types`: MVP vs Next Dev Paket 1

| Kolom | MVP (Saat Ini) | Next Dev Paket 1 (Rencana) |
|---|---|---|
| `template` | Diisi developer via seeder, NULL = Draft | Petugas Desa bisa buat/edit via WYSIWYG |
| `validity_days` | Petugas Desa bisa edit | Tetap bisa edit |
| `assigned_role` | Petugas Desa bisa edit | Tetap bisa edit |
| `is_active` | Petugas Desa bisa toggle | Tetap bisa toggle |
| Buat tipe surat baru | Developer-only | Petugas Desa bisa |
| Field requirement (dokumen/checklist) | Fix, developer-only via seeder | Petugas Desa CRUD bebas (dengan constraint di atas) |

### Use Case Terkait: UC-21 (Versi Lengkap — Rencana)

Saat ini UC-21 di MVP hanya versi sederhana (edit `validity_days`, `assigned_role`, `category_id`, `flow_id`, toggle `is_active` — lihat `TDD-02_UseCase_Descriptions.md`). Versi lengkap Next Dev akan menambah kemampuan create tipe surat baru dari nol beserta WYSIWYG editor dan field requirement dinamis.

---

## B.3. Tahap 2: Aset Desa & Keuangan Desa

**Status:** Tahap 2. Tabel `village_assets` / `village_finances` **tidak ada** di MVP Tahap 1.

### UC-11: Kelola Aset Desa

| Field | Keterangan |
|---|---|
| Use Case ID | UC-11 |
| Nama | Kelola Aset Desa (CRUD) |
| Aktor | Petugas Desa (CRUD) / Kepala Desa (Read only) |
| Pre-condition | Petugas Desa/Kepala Desa sudah login |
| Post-condition | Data aset berhasil dibuat/diupdate/dihapus di `village_assets` |

**Main Flow - Tambah Aset:**
1. Petugas membuka menu "Aset Desa" → "Tambah Aset Baru"
2. Petugas mengisi form: kode aset (unik per desa), nama aset, kategori (Tanah, Bangunan, Kendaraan, Peralatan, dll), lokasi, nilai (Rp), kondisi (Baik/Rusak Ringan/Rusak Berat), tanggal perolehan, keterangan
3. Sistem memvalidasi kode aset unik dalam lingkup desa
4. Sistem menyimpan data, mencatat `created_by`
5. Konfirmasi sukses

**Main Flow - Edit/Hapus Aset:** Edit field yang diperlukan; hapus dengan konfirmasi (soft/hard delete).

**Main Flow - Lihat & Filter:** Filter berdasarkan kondisi, kategori, lokasi; tampilkan daftar aset beserta total nilai aset.

Alternative Flow: Kode aset sudah terdaftar → error "Kode aset sudah digunakan"

### UC-12: Catat Transaksi Keuangan Desa

| Field | Keterangan |
|---|---|
| Use Case ID | UC-12 |
| Nama | Catat Transaksi Keuangan Desa |
| Aktor | Petugas Desa |
| Post-condition | Transaksi tersimpan di `village_finances`, dashboard keuangan diperbarui |

Main Flow:
1. Petugas membuka menu "Keuangan Desa" → "Catat Transaksi Baru"
2. Petugas memilih tipe: Pemasukan atau Pengeluaran
3. Petugas mengisi form: tanggal transaksi, kategori (Dana Desa/PAD/Operasional/Infrastruktur/dll), nominal (Rp), keterangan
4. Sistem menyimpan transaksi, mencatat `recorded_by`
5. Sistem memperbarui ringkasan dashboard keuangan
6. Konfirmasi sukses

Edit/Hapus Transaksi: pola sama seperti aset.

Alternative Flow: Nominal diisi 0 atau negatif → error "Nominal harus lebih dari 0"

### UC-13: Lihat Laporan Keuangan & Rekap Aset

| Field | Keterangan |
|---|---|
| Use Case ID | UC-13 |
| Nama | Lihat Laporan Keuangan & Rekap Aset |
| Aktor | Petugas Desa, Kepala Desa |

**Main Flow - Laporan Keuangan:** Filter periode (bulan & tahun) → tabel daftar transaksi, ringkasan total pemasukan/pengeluaran/saldo periode, grafik sederhana (opsional) → cetak/export PDF/Excel.

**Main Flow - Rekap Aset:** Filter kondisi/kategori → tabel daftar aset, ringkasan total aset/nilai/jumlah per kondisi → cetak/export.

### Skema Tabel: village_assets

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| asset_code | VARCHAR(50) | NOT NULL | Unik dalam lingkup satu desa |
| name | VARCHAR(150) | NOT NULL | |
| category | VARCHAR(100) | NULL | Tanah, Bangunan, Kendaraan, Peralatan, dll |
| location | TEXT | NULL | |
| value | DECIMAL(15,2) | NULL | Nilai aset dalam Rupiah |
| condition | ENUM | NOT NULL | `baik` / `rusak_ringan` / `rusak_berat` |
| acquisition_date | DATE | NULL | |
| notes | TEXT | NULL | |
| created_by | BIGINT | FK → users.id, NOT NULL | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

### Skema Tabel: village_finances

Bukan full accounting system, hanya pencatatan sederhana untuk kebutuhan pelaporan desa.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| transaction_date | DATE | NOT NULL | |
| type | ENUM | NOT NULL | `pemasukan` / `pengeluaran` |
| category | VARCHAR(100) | NULL | Dana Desa, PAD, Operasional, Infrastruktur, dll |
| amount | DECIMAL(15,2) | NOT NULL | Nominal dalam Rupiah |
| description | TEXT | NULL | |
| recorded_by | BIGINT | FK → users.id, NOT NULL | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

### Rencana Indexing (Tahap 2)

**village_assets:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_assets_village | village_id | B-Tree | List semua aset per desa |
| idx_assets_condition | condition | B-Tree | Filter aset berdasarkan kondisi |
| idx_assets_category | category | B-Tree | Filter aset berdasarkan kategori |
| idx_assets_village_condition | (village_id, condition) | Composite | Dashboard rekap aset per kondisi per desa |

**village_finances:**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_finances_village_date | (village_id, transaction_date DESC) | Composite | Laporan keuangan per periode, query utama |
| idx_finances_type | type | B-Tree | Filter pemasukan/pengeluaran |
| idx_finances_village_type | (village_id, type) | Composite | Agregasi SUM per tipe per desa |

---

## B.4. Next Dev / Tahap 2: Kelayakan Bantuan Sosial

**Status:** Dikeluarkan dari MVP, sejajar dengan Aset & Keuangan Desa. Belum ada use case terkait bansos/DTKS yang dirumuskan (siapa input skor, siapa approve masuk program, dll — perlu dirumuskan dulu sebelum implementasi).

Skema berikut dicatat untuk referensi, **belum ada UC maupun keputusan alur bisnis**:

```
citizen_aid_eligibility:
  id BIGINT PK
  citizen_id FK -> citizens.id
  dtks_score DECIMAL(5,2)
  poverty_decile INT
  assessment_period VARCHAR(20)
  created_at TIMESTAMP

citizen_aid_history:
  id BIGINT PK
  citizen_id FK -> citizens.id
  program_id FK -> aid_programs.id
  status ENUM('diajukan','disetujui','ditolak','aktif','selesai')
  period VARCHAR(20)
  created_at TIMESTAMP
  updated_at TIMESTAMP

aid_programs:
  id BIGINT PK
  name VARCHAR(100)
  description TEXT
  is_active BOOLEAN
```

---

## B.5. Tabel yang Di-hold (Ringkasan)

| Tabel | Di-hold ke | Detail Lengkap |
|---|---|---|
| village_assets | Tahap 2 | Section B.3 |
| village_finances | Tahap 2 | Section B.3 |
| letter_hashes | Next Dev Paket 2 (Blockchain) | Section B.1 |
| letter_type_fields | Next Dev Paket 1 (Dynamic Form) | Section B.2 |
| letter_field_values | Next Dev Paket 1 (Dynamic Form) | Section B.2 |
| citizen_aid_eligibility | Next Dev / Tahap 2 (Kelayakan Bansos) | Section B.4 |
| citizen_aid_history | Next Dev / Tahap 2 (Kelayakan Bansos) | Section B.4 |
| aid_programs | Next Dev / Tahap 2 (Kelayakan Bansos) | Section B.4 |

## B.6. Query Benchmark Terkait Fitur Next Dev/Tahap 2

Query berikut relevan untuk fitur di atas — dipisah dari benchmark MVP karena tabelnya belum ada di database MVP:

| # | Query | Deskripsi | Relevansi |
|---|---|---|---|
| Q-13 | `SELECT * FROM village_assets WHERE village_id = ? AND condition = ?` | Filter aset by kondisi | Laporan rekap aset per kondisi (Tahap 2) |
| Q-14 | `SELECT condition, COUNT(*), SUM(value) FROM village_assets WHERE village_id = ? GROUP BY condition` | Agregasi rekap aset | Widget rekap aset di dashboard (Tahap 2) |
| Q-15 | `SELECT * FROM village_finances WHERE village_id = ? AND transaction_date BETWEEN ? AND ?` | Laporan keuangan per periode | Laporan keuangan bulanan (Tahap 2) |
| Q-16 | `SELECT type, SUM(amount) FROM village_finances WHERE village_id = ? AND transaction_date BETWEEN ? AND ? GROUP BY type` | Rekap pemasukan & pengeluaran | Widget ringkasan keuangan (Tahap 2) |

---

## B.7. Metodologi Benchmarking Query (Umum — Berlaku Lintas Tahap)

Metodologi ini berlaku untuk seluruh query benchmark, baik yang sudah relevan di MVP maupun yang baru relevan saat fitur Tahap 2/Next Dev dikerjakan:

1. Generate data dummy menggunakan Laravel Seeders & Factories
   - Target: 10.000–50.000 records di tabel `letters`
   - Proporsional: `citizens` (~5.000), `families` (~1.500), `village_assets` (~500), `village_finances` (~2.000)
2. Jalankan setiap query tanpa index → catat execution time & query plan
3. Tambahkan index sesuai strategi masing-masing (lihat `TDD-03_Database_Schema.md` Section 4 untuk tabel MVP, atau Section B.3 di atas untuk Tahap 2)
4. Jalankan query yang sama, bandingkan hasil
5. Gunakan `EXPLAIN ANALYZE` (PostgreSQL) untuk melihat detail query execution plan
6. Dokumentasikan sebagai tabel perbandingan (template kolom: Query | Tanpa Index (ms) | Seq Scan/Index? | Dengan Index (ms) | Index Scan/Type | Improvement)
