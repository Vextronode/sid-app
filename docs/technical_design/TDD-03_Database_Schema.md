# TECHNICAL DESIGN DOCUMENT — BAGIAN 3
## SISTEM INFORMASI DESA - DESA CIBENDA
### Desain Database

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 3 dari 5 (+ Appendix) |
| Status | v5.0 — diselaraskan dengan kode/migration berjalan |
| Cakupan | ERD, definisi tabel & atribut (22 tabel MVP), indexing strategy, strategi enkripsi |
| Tabel Next Dev / Tahap 2 (letter_hashes, village_assets, dst) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-01_Overview_Scope_Roles.md`, `TDD-02_UseCase_Descriptions.md`, OpenAPI Spec v5.0, `SID-ARCH-BE-001` |

> **Koreksi dari revisi TDD sebelumnya:** Bagian ini mengoreksi status ENUM `approval_settings.approval_level` yang sebelumnya dicatat sebagai "technical debt, belum diselaraskan". Berdasarkan migration Laravel yang berjalan di project (`database/migrations/..._create_approval_settings_table.php`), kolom ini **sudah** menggunakan ENUM 5 nilai yang selaras dengan `letter_approvals.approval_level`. Lihat Section 2 di bawah dan riwayat koreksi di `TDD-06_Appendix.md`.

---

## 1. Entity Relationship Diagram (ERD)

⚠ Diagram tersedia di file diagram terpisah (ERD v7 — Core [1/2] dan Pendukung [2/2], format PlantUML).

ERD mencakup 5 entity baru sejak restrukturisasi v5.0: `letter_categories`, `approval_flows`, `flow_steps`, `families`, `citizen_socioeconomics`. Entity `letters` berubah signifikan (status generik, tambah `flow_id`/`current_step_order`/`rejected_at_step`). Entity `citizens` berubah signifikan (hapus `no_kk`, tambah 11 kolom baru termasuk 2 self-reference FK). Entity `letter_approvals` berubah ENUM `approval_level`. Relasi `officials` ke Kadus untuk approval dilepas (Kadus tetap ada sebagai jabatan struktural, tapi tidak lagi terhubung ke alur approval surat).

---

## 2. Definisi Tabel & Atribut

### 2.1. Wilayah

**Tabel: villages**

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

**Tabel: hamlets** (dusun)

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | Desa pemilik dusun |
| name | VARCHAR(100) | NOT NULL | Nama dusun |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Kode dusun |
| is_active | BOOLEAN | DEFAULT true | Status aktif |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

5 Dusun Desa Cibenda: Patrol, Sinargalih, Cibenda, Budiasih, Sucen — di-seed saat instalasi.

**Tabel: rws**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| hamlet_id | BIGINT | FK → hamlets.id, NOT NULL | Dusun yang menaungi |
| number | VARCHAR(5) | NOT NULL | Nomor RW |
| full_label | VARCHAR(20) | NOT NULL | Label lengkap: 'RW 001' |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

**Tabel: rts**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| rw_id | BIGINT | FK → rws.id, NOT NULL | RW yang menaungi |
| number | VARCHAR(5) | NOT NULL | Nomor RT |
| full_label | VARCHAR(30) | NOT NULL | Label lengkap: 'RT 001/RW 001' |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

Hierarki wilayah: `villages → hamlets → rws → rts`.

### 2.2. Pengguna & Jabatan Struktural

**Tabel: users**

Password menggunakan Argon2id. Seluruh role sistem disimpan di tabel ini.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, Auto Increment | Primary key |
| name | VARCHAR(100) | NOT NULL | Nama lengkap pengguna |
| email | VARCHAR(100) | UNIQUE | Email untuk login |
| password | VARCHAR(255) | NOT NULL | Hash Argon2id |
| role | ENUM | NOT NULL | `warga` \| `rt` \| `rw` \| `kadus` \| `kasi_pelayanan` \| `kaur_tu_umum` \| `petugas_desa` \| `kepala_desa` \| `sekretaris_desa` |
| village_id | BIGINT | FK → villages.id, NOT NULL | Scalable untuk multi desa |
| citizen_id | BIGINT | FK → citizens.id, NULL | Link ke data kependudukan; NULL untuk akun teknis tanpa data kependudukan |
| is_active | BOOLEAN | DEFAULT true | Status akun aktif/nonaktif |
| email_verified_at | TIMESTAMP | NULL | |
| remember_token | VARCHAR(100) | NULL | |
| created_at, updated_at | TIMESTAMP | | |

- `sekretaris_desa`: diberikan saat Petugas Desa assign jabatan Sekdes di `officials`. Scope dashboard identik `kepala_desa`. Saat rotasi jabatan Sekdes, `users.role` otomatis diupdate.
- `kadus`: tetap ada di ENUM untuk kompatibilitas akun (login/logout/lihat status), tidak lagi punya relevansi terhadap `flow_steps.approver_position`.

**Tabel: citizens**

Kolom `nik` dan `address` dienkripsi AES-256. Pencarian menggunakan `nik_hash` (SHA-256 dari NIK plaintext). Setiap warga tercatat (lokal maupun pendatang) **selalu** punya NIK terverifikasi — tidak ada kategori "warga Non-NIK".

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| nik | TEXT | NOT NULL | AES-256 encrypted |
| nik_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 dari NIK plaintext, untuk indexing |
| name | VARCHAR(100) | NOT NULL | |
| date_of_birth | DATE | NULL | |
| place_of_birth | VARCHAR(100) | NULL | |
| gender | ENUM('L','P') | NOT NULL | |
| address | TEXT | NOT NULL | AES-256 encrypted |
| rt_id | BIGINT | FK → rts.id, NULL | |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | |
| marital_status | ENUM | NULL | `belum_kawin` \| `kawin` \| `cerai_hidup` \| `cerai_mati` |
| occupation | VARCHAR(100) | NULL | |
| religion | ENUM | NULL | `islam` \| `kristen` \| `katolik` \| `hindu` \| `buddha` \| `konghucu` |
| last_education | ENUM | NULL | `tidak_sekolah` \| `sd` \| `smp` \| `sma` \| `diploma` \| `s1` \| `s2` \| `s3` |
| domicile_status | ENUM | NOT NULL, DEFAULT 'menetap' | `menetap` \| `merantau_dalam_negeri` \| `merantau_luar_negeri` \| `tki`. Murni informatif, tidak mempengaruhi hak akses |
| current_domicile | VARCHAR(150) | NULL | Alamat domisili saat ini jika tidak menetap |
| family_id | BIGINT | FK → families.id, NULL | NULL = belum/tidak tergabung KK manapun |
| family_role | ENUM | NULL | `kepala_keluarga` \| `istri` \| `suami` \| `anak` \| `famili_lain` |
| father_id | BIGINT | FK → citizens.id, NULL | Self-reference, untuk fitur pohon keluarga |
| mother_id | BIGINT | FK → citizens.id, NULL | Self-reference |
| father_name_text | VARCHAR(100) | NULL | Fallback teks bebas jika `father_id` NULL |
| mother_name_text | VARCHAR(100) | NULL | Fallback teks bebas jika `mother_id` NULL |
| blood_type | ENUM | NULL | `A` \| `B` \| `AB` \| `O` \| `tidak_tahu` |
| residency_type | ENUM | NOT NULL, DEFAULT 'lokal' | `lokal` \| `pendatang`. Pembeda murni kolom, **bukan** tabel/entitas terpisah |
| origin_region | VARCHAR(150) | NULL | Relevan jika `residency_type='pendatang'` |
| data_source | ENUM | NOT NULL, DEFAULT 'manual_input_desa' | `manual_input_desa` \| `import_excel` \| `dukcapil_sync` |
| last_verified_at | TIMESTAMP | NULL | Kapan terakhir dicocokkan dengan dokumen fisik |
| sync_status | ENUM | NULL | `synced` \| `pending` \| `conflict` |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

> Kolom `no_kk` **dihapus total** dari tabel ini, dipindah ke tabel `families.no_kk`.

**Tabel: families** (Kartu Keluarga)

Sengaja dibuat tipis — hanya berisi data yang sama untuk semua anggota keluarga.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| no_kk | TEXT | NOT NULL | AES-256 encrypted |
| no_kk_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256, pola sama seperti `nik`/`nik_hash` |
| family_address | TEXT | NOT NULL | AES-256 encrypted, alamat resmi sesuai dokumen KK |
| family_status | ENUM | NOT NULL, DEFAULT 'aktif' | `aktif` \| `pindah` \| `bubar` |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| rt_id | BIGINT | FK → rts.id, NULL | |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | |
| head_of_family_id | BIGINT | FK → citizens.id, NULL | Denormalisasi opsional untuk performa query |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

`head_of_family_id` pada prinsipnya bisa diturunkan dari `citizens.family_role = 'kepala_keluarga'`. Jika dipakai untuk mempercepat query, aplikasi wajib menjaga konsistensi manual antara kedua sumber data ini.

**Tabel: citizen_socioeconomics**

Relasi 1:1 dengan `citizens` (per individu, bukan per keluarga). Dipisah tabel karena sering kosong (belum semua warga disurvei), diinput petugas berbeda-beda, dan butuh jejak waktu survei.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| citizen_id | BIGINT | FK → citizens.id, UNIQUE NOT NULL | Relasi 1:1 |
| income_range | ENUM | NULL | `<1jt` \| `1-3jt` \| `3-5jt` \| `5-10jt` \| `>10jt` |
| house_ownership_status | ENUM | NULL | `milik_sendiri` \| `sewa` \| `menumpang` \| `dinas` |
| water_source | ENUM | NULL | `pdam` \| `sumur` \| `sungai` \| `lainnya` |
| electricity_source | ENUM | NULL | `pln` \| `non_pln` \| `tidak_ada` |
| dependents_count | INT | NULL | Jumlah tanggungan |
| productive_assets | JSON | NULL | Aset produktif |
| surveyed_at | TIMESTAMP | NULL | |
| surveyed_by | BIGINT | FK → users.id, NULL | Petugas yang melakukan survei |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

**Tabel: officials**

Rekam jejak jabatan struktural desa per periode. Digunakan untuk resolusi wilayah saat routing notifikasi dan approval. Saat rotasi jabatan: INSERT baru + UPDATE `ended_at` lama, data `citizens` tidak disentuh.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| citizens_id | BIGINT | FK → citizens.id, NOT NULL | Warga yang menjabat |
| user_id | BIGINT | FK → users.id, NULL | Akun sistem pejabat |
| position | ENUM | NOT NULL | `kepala_desa` \| `kasi_pelayanan` \| `kaur_tu_umum` \| `kadus` \| `petugas_desa` \| `rw` \| `rt` \| `sekdes` \| `kasi_kesejahteraan` \| `kasi_pemerintahan` \| `kaur_perencanaan` \| `kaur_keuangan` \| `staf_sipades` \| `staf_siskeudes` |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| rt_id | BIGINT | FK → rts.id, NULL | Diisi untuk jabatan RT |
| rw_id | BIGINT | FK → rws.id, NULL | Diisi untuk jabatan RW |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | Diisi untuk jabatan Kadus |
| signature_img | VARCHAR(255) | NULL | Path TTD (untuk generate PDF surat) |
| stamp_img | VARCHAR(255) | NULL | Path stempel desa |
| photo_img | VARCHAR(255) | NULL | Path foto (halaman publik) |
| phone_wa | VARCHAR(20) | NULL | Untuk fitur Hubungi Kami |
| started_at | DATE | NOT NULL | |
| ended_at | DATE | NULL | NULL = masih aktif |
| is_active | BOOLEAN | DEFAULT true | |
| notes | TEXT | NULL | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

- `user_id`: NULL untuk jabatan non-sistem (`kasi_kesejahteraan`, `kasi_pemerintahan`, `kaur_perencanaan`, `kaur_keuangan`, `staf_sipades`, `staf_siskeudes`). Sekdes punya akun — `user_id` NOT NULL dengan `users.role = 'sekretaris_desa'`.
- `kadus` tetap eksis di ENUM `position` untuk keperluan struktural non-approval, namun **tidak lagi direferensikan** oleh `flow_steps.approver_position`.

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
| kasi_kesejahteraan, kasi_pemerintahan, kaur_perencanaan, kaur_keuangan, staf_sipades, staf_siskeudes | — | NULL |

### 2.3. Klasifikasi & Pipeline Approval Surat (Config over Code)

**Tabel: letter_categories**

Gate awal klasifikasi surat, menentukan handler/modul yang menangani. Jarang berubah.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| code | ENUM | NOT NULL, UNIQUE | `approval_normal` \| `upload_mandiri` \| `dokumen_pendukung` \| `update_data` |
| name | VARCHAR(100) | NOT NULL | |
| description | TEXT | NULL | |
| handler_class | VARCHAR(150) | NOT NULL | Class handler yang menangani modul ini |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

| Code | Nama | Karakteristik |
|---|---|---|
| approval_normal | Approval Normal | Melalui rangkaian approval bertingkat; jumlah & urutan tahap ditentukan `approval_flows` |
| upload_mandiri | Upload Mandiri | TTD eksternal, tanpa approval berjenjang standar |
| dokumen_pendukung | Dokumen Pendukung | Bukan output surat final, sekadar syarat lampiran |
| update_data | Update Data Kependudukan | Bukan proses terbit surat, murni update `citizens`/`families` |

**Tabel: approval_flows**

Anak dari category, urutan step approval spesifik. Jumlah flow per category tidak ditentukan di depan — muncul organik dari pengelompokan surat yang alurnya identik.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| category_id | BIGINT | FK → letter_categories.id, NOT NULL | |
| name | VARCHAR(150) | NOT NULL | Contoh: 'RT-Kades/Sekdes-Staff (3 Tahap)' |
| description | TEXT | NULL | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

Untuk category `upload_mandiri`, `dokumen_pendukung`, `update_data` — tetap wajib punya row di `approval_flows` (misal flow "Direct — Tanpa Approval Bertingkat") demi konsistensi satu pola query di seluruh sistem, meski `flow_steps`-nya kosong/minimal.

**Tabel: flow_steps**

Urutan approver per flow.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | |
| step_order | INT | NOT NULL | Urutan step dalam flow |
| approver_position | ENUM | NOT NULL | `rt` \| `kepala_desa` \| `sekdes` \| `kasi_pelayanan` \| `kaur_tu_umum` |
| is_final | BOOLEAN | DEFAULT false | true jika step ini step terakhir |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

Constraint: `UNIQUE(flow_id, step_order)`

⚠ **Penting:** `rw` dan `kadus` **tidak pernah** muncul sebagai `approver_position` di tabel ini. RW ditangani sebagai side-effect notifikasi, bukan step approval formal. Kadus tidak lagi bagian dari alur approval surat.

**Tabel: letter_types**

Master data jenis surat, bersifat fleksibel dan dapat dikelola oleh admin desa.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Kode jenis surat (SKD, SKU, SKTM, dst) |
| name | VARCHAR(100) | NOT NULL | |
| description | TEXT | NULL | |
| template | TEXT | NULL | NULL = Draft |
| verification_type | ENUM | NOT NULL | `auto` \| `manual` \| `document` |
| requirements_info | TEXT | NULL | |
| assigned_role | ENUM | NULL | `kasi_pelayanan` \| `kaur_tu_umum` — lihat catatan di bawah |
| validity_days | INT | NULL | NULL = tidak expire |
| category_id | BIGINT | FK → letter_categories.id, NOT NULL | Gate awal jenis surat |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | Selalu diisi, termasuk category non-`approval_normal`, demi konsistensi query |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

- Status tipe surat: `template=NULL + is_active=false` = Draft; `template!='...' + is_active=true` = Aktif; `template!='...' + is_active=false` = Dinonaktifkan
- **Catatan `assigned_role`:** dipertahankan sebagai kolom derived/cache untuk kompatibilitas mundur & kemudahan query cepat. **Source of truth resmi soal approver adalah `flow_steps`** — Policy/otorisasi wajib validasi lewat `flow_steps`, bukan `assigned_role` langsung, untuk mencegah drift antara dua sumber data.

Penjelasan `verification_type`:
- **Auto**: sistem otomatis validasi jika NIK pemohon terdaftar di `citizens`
- **Manual**: sistem menampilkan checklist persyaratan, petugas konfirmasi verifikasi manual
- **Document**: dokumen pendukung dikelola melalui form seeder per tipe surat di MVP (kolom `supporting_document` sudah dihapus dari `letters`; field requirement dinamis = Next Dev Paket 1, lihat Appendix)

### 2.4. Surat & Approval

**Tabel: letters**

Tabel utama sistem. Kolom `applicant_nik` dienkripsi AES-256, `applicant_nik_hash` menyimpan SHA-256 untuk indexing dan pencarian.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| letter_type_id | BIGINT | FK → letter_types.id, NOT NULL | |
| submitted_by | BIGINT | FK → users.id, NOT NULL | User yang mengajukan |
| on_behalf_of | BIGINT | FK → citizens.id, NULL | Selalu NULL di MVP; dipersiapkan untuk future use case petugas input atas nama warga lain |
| citizen_id | BIGINT | FK → citizens.id, NULL | Diisi dari `auth()->user()->citizen_id` saat warga self-service submit |
| letter_number | VARCHAR(50) | UNIQUE, NULL | Diisi otomatis saat `status = 'approved'` (step `is_final=true`) |
| applicant_name | VARCHAR(100) | NOT NULL | |
| applicant_nik | TEXT | NOT NULL | AES-256 encrypted |
| applicant_nik_hash | VARCHAR(64) | NOT NULL | SHA-256, untuk indexing & pencarian |
| applicant_address | TEXT | NULL | AES-256 encrypted |
| purpose | TEXT | NOT NULL | Keperluan pengajuan |
| notes | TEXT | NULL | Catatan dari Petugas Desa |
| is_overdue | BOOLEAN | DEFAULT false | Di-set scheduler jika ada tahap melebihi deadline |
| expires_at | TIMESTAMP | NULL | Dihitung saat `status = 'approved'` + `validity_days`. NULL = tidak expire |
| status | ENUM | NOT NULL, DEFAULT 'pending' | `pending` \| `in_progress` \| `approved` \| `rejected` |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | **Snapshot** dari `letter_types.flow_id` saat submit, dikunci |
| current_step_order | INT | NOT NULL, DEFAULT 1 | Step yang sedang aktif/ditunggu, dicocokkan ke `flow_steps` |
| rejected_at_step | INT | NULL | Step tempat surat direject, untuk histori/laporan |
| submitted_at | TIMESTAMP | NOT NULL | |
| processed_at | TIMESTAMP | NULL | Waktu terakhir diproses (approver manapun di step manapun) |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

**Semantik `letters.status`:**
- `pending`: step 1 belum ada action
- `in_progress`: minimal 1 step approve, belum sampai step `is_final=true`
- `approved`: step `is_final=true` sudah di-approve → trigger `letter_number` + `expires_at`
- `rejected`: TERMINAL — ada satu step yang reject, `rejected_at_step` dicatat

**Query Pattern Generik** (menggantikan query hardcode per role):

```sql
SELECT l.* FROM letters l
JOIN flow_steps fs ON fs.flow_id = l.flow_id AND fs.step_order = l.current_step_order
WHERE fs.approver_position = ? AND l.status IN ('pending','in_progress')
```

Untuk RT (berbasis wilayah), tetap perlu JOIN tambahan ke `citizens.rt_id`. Untuk Kades/Sekdes/Kasi/Kaur (berbasis posisi), query generik di atas sudah cukup.

**Catatan `on_behalf_of` vs `citizen_id`:**
- `citizen_id`: referensi warga pemohon yang diambil dari akun login warga
- `on_behalf_of`: kolom tetap ada namun selalu NULL di MVP
- Pada MVP self-service, `submitted_by` + `citizen_id` sudah cukup mendeskripsikan pemohon

**Tabel: letter_approvals**

Record keputusan approval per surat per tahap. Satu surat dapat memiliki beberapa record approval sesuai jumlah step di flow-nya. Relasi one-to-many (`letters → letter_approvals`).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, NOT NULL | |
| approved_by | BIGINT | FK → users.id, NOT NULL | User yang memutuskan |
| approval_level | ENUM | NOT NULL | `rt` \| `kepala_desa` \| `sekdes` \| `kasi_pelayanan` \| `kaur_tu_umum`. `rw` dan `kadus` **tidak ada** di ENUM ini — keduanya tidak pernah membuat row di tabel ini |
| action | ENUM | NOT NULL | `approved` \| `rejected` |
| flow_step_id | BIGINT | FK → flow_steps.id, NULL | Referensi step spesifik yang dieksekusi, untuk audit trail granular |
| notes | TEXT | NULL | Wajib jika `rejected` |
| deadline_at | TIMESTAMP | NULL | Dihitung dari `approval_settings.deadline_hours` |
| reminded_at | TIMESTAMP | NULL | Waktu reminder terakhir dikirim |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NULL | |

**Tabel: letter_status_logs**

Audit trail lengkap setiap perubahan status surat. Tidak dapat dihapus atau diubah.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | BIGINT | FK → letters.id, NOT NULL | |
| actor_id | BIGINT | FK → users.id, NOT NULL | |
| old_status | ENUM | NULL | `pending` \| `in_progress` \| `approved` \| `rejected`. NULL untuk log pertama |
| new_status | ENUM | NOT NULL | Sama nilai seperti `old_status` |
| notes | TEXT | NULL | |
| ip_address | VARCHAR(45) | NULL | Mendukung IPv4 & IPv6 |
| user_agent | TEXT | NULL | |
| created_at | TIMESTAMP | NOT NULL | |

**Tabel: approval_settings**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| approval_level | ENUM | NOT NULL | `rt` \| `kepala_desa` \| `sekdes` \| `kasi_pelayanan` \| `kaur_tu_umum` |
| deadline_hours | INT | NOT NULL, DEFAULT 24 | Berapa jam pejabat punya waktu untuk action |
| reminder_hours | INT | NOT NULL, DEFAULT 12 | Berapa jam sebelum deadline, notif reminder dikirim |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

Constraint: `UNIQUE(village_id, approval_level)`

> **✅ Terselaraskan dengan `letter_approvals.approval_level`.** ENUM kolom ini (`rt`, `kepala_desa`, `sekdes`, `kasi_pelayanan`, `kaur_tu_umum`) sudah sinkron dengan ENUM `letter_approvals.approval_level` — dikonfirmasi dari migration `create_approval_settings_table.php` yang berjalan di project. Ini menggantikan catatan technical debt versi sebelumnya yang menyebut kolom ini "masih ENUM lama (`rt`/`rw`/`kadus`/`kasi`), belum diselaraskan" — catatan itu sudah tidak berlaku. Lihat `TDD-06_Appendix.md` untuk riwayat koreksi ini.

### 2.5. Organisasi Non-Struktural, Notifikasi, Konten Publik

**Tabel: village_org_positions**

Master jabatan per organisasi non-struktural.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| org_type | ENUM | NOT NULL | `bpd` \| `bumdes` \| `lpm` \| `karang_taruna` \| `pkk` |
| position_label | VARCHAR(100) | NOT NULL | |
| is_single_occupant | BOOLEAN | DEFAULT true | false = bisa diisi banyak orang |
| sort_order | INT | DEFAULT 0 | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

**Tabel: village_org_members**

History pemegang jabatan organisasi non-struktural.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| position_id | BIGINT | FK → village_org_positions.id, NOT NULL | |
| member_name | VARCHAR(150) | NOT NULL | |
| photo_img | VARCHAR(255) | NULL | |
| phone_wa | VARCHAR(20) | NULL | |
| started_at | DATE | NOT NULL | |
| ended_at | DATE | NULL | NULL = masih aktif |
| is_active | BOOLEAN | DEFAULT true | |
| notes | TEXT | NULL | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

**Tabel: village_regulations**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| regulation_number | VARCHAR(100) | NOT NULL | |
| title | VARCHAR(200) | NOT NULL | |
| content | TEXT | NOT NULL | |
| enacted_date | DATE | NULL | |
| created_by | BIGINT | FK → users.id, NOT NULL | |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

Tidak ada kolom `is_published` — semua peraturan yang disimpan langsung tampil di halaman publik.

**Tabel: notifications**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | |
| type | VARCHAR(255) | NOT NULL | Fully-qualified class name notifikasi Laravel |
| notifiable_type | VARCHAR(255) | NOT NULL | Tipe pemilik notifikasi (polymorphic, biasanya `App\Models\User`) |
| notifiable_id | BIGINT | NOT NULL | |
| data | JSON | NOT NULL | Payload konten notifikasi |
| read_at | TIMESTAMP | NULL | NULL = belum dibaca |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

**Tabel: news**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | BIGINT | FK → villages.id, NOT NULL | |
| author_id | BIGINT | FK → users.id, NOT NULL | |
| title | VARCHAR(200) | NOT NULL | |
| slug | VARCHAR(200) | UNIQUE, NOT NULL | |
| content | TEXT | NOT NULL | |
| thumbnail | VARCHAR(255) | NULL | |
| is_published | BOOLEAN | DEFAULT false | |
| published_at | TIMESTAMP | NULL | NULL jika masih draft |
| created_at, updated_at | TIMESTAMP | NOT NULL | |

---

## 3. Ringkasan Total Tabel MVP

Total 22 tabel MVP:

```
Wilayah (4): villages, hamlets, rws, rts
Pengguna & Jabatan Struktural (3): users, citizens, officials
Data Keluarga & Sosio-Ekonomi (2): families, citizen_socioeconomics
Organisasi Non-Struktural (2): village_org_positions, village_org_members
Klasifikasi & Alur Surat (3): letter_categories, approval_flows, flow_steps
Surat (4): letter_types, letters, letter_approvals, letter_status_logs
Konfigurasi (1): approval_settings
Konten & Komunikasi (3): notifications, news, village_regulations

Total: 4 + 3 + 2 + 2 + 3 + 4 + 1 + 3 = 22 tabel
```

Tabel yang di-hold (bukan bagian dari 22 tabel MVP — detail lengkap di `TDD-06_Appendix.md`): `village_assets`, `village_finances`, `letter_hashes`, `letter_type_fields`, `letter_field_values`, `citizen_aid_eligibility`, `citizen_aid_history`, `aid_programs`.

---

## 4. Indexing Strategy

Strategi indexing dirancang berdasarkan pola query yang paling sering digunakan.

**Index Tabel `letters`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_letters_status | status | B-Tree | Filter surat by status, dipakai di semua list view & dashboard |
| idx_letters_village | village_id | B-Tree | Filter surat per desa |
| idx_letters_submitted_at | submitted_at DESC | B-Tree | Sorting list surat terbaru |
| idx_letters_overdue | is_overdue | B-Tree | Filter surat overdue untuk scheduler & dashboard |
| idx_letters_nik_hash | applicant_nik_hash | B-Tree | Pencarian surat berdasarkan NIK pemohon |
| idx_letters_citizen | citizen_id | B-Tree | Join letters ↔ citizens |
| idx_letters_on_behalf | on_behalf_of | B-Tree | Query surat berdasarkan warga yang diwakilkan |
| idx_letters_village_status | (village_id, status) | Composite | Dashboard: surat desa X dengan status Y |
| idx_letters_village_date | (village_id, submitted_at DESC) | Composite | Laporan periode per desa |
| idx_letters_flow_step | (flow_id, current_step_order) | Composite | Query dashboard generik per role, **paling kritis** |

**Index Tabel `letter_status_logs`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_logs_letter | letter_id | B-Tree | Ambil semua log untuk 1 surat |
| idx_logs_created | created_at DESC | B-Tree | Sorting log terbaru |

**Index Tabel `citizens`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_citizens_nik_hash | nik_hash | B-Tree UNIQUE | Auto-fill & validasi NIK, paling sering dipanggil |
| idx_citizens_village | village_id | B-Tree | Filter warga per desa |
| idx_citizens_name | name | B-Tree | Pencarian warga berdasarkan nama |
| idx_citizens_rt | rt_id | B-Tree | Filter warga per RT (resolve wilayah) |
| idx_citizens_hamlet | hamlet_id | B-Tree | Filter warga per dusun |
| idx_citizens_family | family_id | B-Tree | Ambil semua anggota dalam satu KK |
| idx_citizens_residency | residency_type | B-Tree | Filter warga lokal vs pendatang |
| idx_citizens_father | father_id | B-Tree | Fitur pohon keluarga |
| idx_citizens_mother | mother_id | B-Tree | Fitur pohon keluarga |

**Index Tabel `notifications`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_notif_notifiable | (notifiable_type, notifiable_id) | Composite | Query semua notifikasi milik 1 user, dijalankan tiap halaman dimuat |
| idx_notif_read_at | read_at | B-Tree | Filter notifikasi belum dibaca |

**Index Tabel `officials`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_officials_village | village_id | B-Tree | Filter jabatan per desa |
| idx_officials_position | position | B-Tree | Query RT/RW aktif |
| idx_officials_active | is_active | B-Tree | Filter jabatan aktif |
| idx_officials_resolve | (village_id, position, is_active) | Composite | Resolve jabatan aktif per posisi per desa |
| idx_officials_user | user_id | B-Tree | Lookup user → jabatan (authorization check) |
| idx_officials_rt | rt_id | B-Tree | Resolve pejabat RT per wilayah |
| idx_officials_rw | rw_id | B-Tree | Resolve pejabat RW per wilayah |
| idx_officials_hamlet | hamlet_id | B-Tree | Resolve Kadus per dusun (struktural, non-approval) |

**Index tabel wilayah pendukung**

| Tabel | Index | Kolom | Alasan |
|---|---|---|---|
| rts | idx_rts_rw | rw_id | Semua RT dalam satu RW |
| rts | idx_rts_active | is_active | Filter RT aktif |
| rws | idx_rws_hamlet | hamlet_id | Semua RW dalam satu dusun |
| hamlets | idx_hamlets_village | village_id | Semua dusun dalam satu desa |

**Index Tabel `letter_approvals`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_approvals_letter | letter_id | B-Tree | Semua approval untuk 1 surat |
| idx_approvals_deadline | deadline_at | B-Tree | Scheduler cek deadline terlewat |
| idx_approvals_level | (letter_id, approval_level) | Composite | Cek apakah sudah ada approval tahap tertentu |

**Index Tabel pipeline dinamis**

| Tabel | Index | Kolom | Alasan |
|---|---|---|---|
| letter_categories | idx_categories_code | code | B-Tree UNIQUE — lookup handler berdasarkan kode |
| approval_flows | idx_flows_category | category_id | Ambil semua flow dalam satu category |
| flow_steps | idx_flowsteps_flow_order | (flow_id, step_order) | Composite UNIQUE — query step aktif, **paling kritis**, dipanggil di setiap pengecekan gate |
| flow_steps | idx_flowsteps_position | approver_position | Resolve semua flow yang punya step approver tertentu |

**Index Tabel `families` & `citizen_socioeconomics`**

| Tabel | Index | Kolom | Alasan |
|---|---|---|---|
| families | idx_families_nokk_hash | no_kk_hash | B-Tree UNIQUE — pencarian KK berdasarkan No KK |
| families | idx_families_village | village_id | Filter KK per desa |
| families | idx_families_rt | rt_id | Filter KK per RT |
| citizen_socioeconomics | idx_socioeco_citizen | citizen_id | B-Tree UNIQUE — relasi 1:1 dengan citizens |

---

## 5. Strategi Enkripsi Field

Sistem mengelola data kependudukan warga (NIK, alamat) yang termasuk kategori data pribadi sangat sensitif sesuai UU PDP No. 27/2022. Untuk memastikan data tetap tidak terbaca meskipun terjadi kebocoran database, diterapkan enkripsi field-level menggunakan AES-256.

**Algoritma & Implementasi**

| Aspek | Detail |
|---|---|
| Algoritma | AES-256-CBC |
| Implementasi | Laravel built-in Encryption (`Illuminate\Contracts\Encryption\Encrypter`) |
| Key Source | `APP_KEY` di file `.env` (32-byte random key) |
| Laravel Mechanism | `$casts` property di Eloquent Model |
| Password Hashing | Argon2id (bukan enkripsi, one-way hash) |

**Field yang Dienkripsi**

| Tabel | Kolom | Alasan |
|---|---|---|
| citizens | nik | Data pribadi sangat sensitif (UU PDP) |
| citizens | address | Data pribadi sensitif |
| families | no_kk | Data pribadi sangat sensitif, sepadan NIK |
| families | family_address | Data pribadi sensitif |
| letters | applicant_nik | NIK pemohon dalam permohonan surat |
| letters | applicant_address | Alamat pemohon dalam permohonan surat |
| users | password | Hash Argon2id (one-way hash, bukan enkripsi) |

**Strategi Dual-Column**

Kolom terenkripsi tidak dapat di-index secara langsung karena setiap proses enkripsi menghasilkan ciphertext berbeda meski plaintext sama. Untuk tetap mendukung pencarian:

| Kolom | Isi | Fungsi |
|---|---|---|
| nik / applicant_nik | AES-256 ciphertext | Penyimpanan aman, hanya bisa dibaca via Eloquent |
| nik_hash / applicant_nik_hash | SHA-256 dari NIK plaintext | Indexing & pencarian, tidak bisa di-reverse |
| no_kk (families) | AES-256 ciphertext | Penyimpanan aman No KK, pola sama dengan NIK |
| no_kk_hash (families) | SHA-256 dari No KK plaintext | Indexing & pencarian No KK, tidak bisa di-reverse |

**Urutan Proses saat Surat Baru Dibuat**

1. Terima NIK dari request (plaintext)
2. Generate SHA-256 dari NIK plaintext → simpan ke `applicant_nik_hash` (untuk indexing)
3. Enkripsi NIK dengan AES-256 → simpan ke `applicant_nik`
4. Simpan semua dalam satu `DB::transaction()`

**Key Management**

| Aspek | Kebijakan |
|---|---|
| Penyimpanan key | `APP_KEY` di `.env`, tidak pernah di-commit ke repository |
| Backup key | Disimpan terpisah dari server (password manager / vault) |
| Rotasi key | Tidak boleh diregenerate di production — semua data terenkripsi tidak dapat didekripsi jika key berubah |
| Environment | Key production berbeda dari key development/staging |
