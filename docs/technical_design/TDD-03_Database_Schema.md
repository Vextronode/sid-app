# TECHNICAL DESIGN DOCUMENT — BAGIAN 3
## SISTEM INFORMASI DESA - DESA CIBENDA
### Desain Database

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 3 dari 5 (+ Appendix) |
| Status | v5.2 — Kependudukan, Stempel & Pekerjaan |
| Cakupan | ERD, definisi tabel & atribut (23 tabel domain inti + 2 tabel operasional), indexing strategy, strategi enkripsi |
| Tabel Next Dev / Tahap 2 (letter_hashes, village_assets, dst) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-01_Overview_Scope_Roles.md`, `TDD-02_UseCase_Descriptions.md`, OpenAPI Spec v5.2, `SID-ARCH-BE-001` |

> **v5.2 — Kependudukan, Stempel & Pekerjaan:** sosio-ekonomi dicatat per KK, pekerjaan menggunakan katalog per desa, dan PDF memakai TTD Kepala Desa aktif serta stempel desa.

---

## 1. Entity Relationship Diagram (ERD)

⚠ Diagram tersedia di file diagram terpisah (ERD v7 — Core [1/2] dan Pendukung [2/2], format PlantUML).

ERD mencakup 23 tabel domain inti. Perubahan v5.2 memindahkan sosio-ekonomi ke tingkat keluarga, menambahkan `occupations`, menambahkan stempel desa di `villages`, dan mengganti pekerjaan bebas pada warga menjadi FK `occupation_id`.

---

## 2. Definisi Tabel & Atribut

### 2.1. Wilayah

**Tabel: villages**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | Primary key |
| name | VARCHAR(100) | NOT NULL | Nama desa |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Kode desa resmi |
| head_name | VARCHAR(100) | NULL | Nama kepala desa |
| address | VARCHAR(255) | NULL | Alamat kantor desa |
| phone | VARCHAR(20) | NULL | Nomor telepon |
| stamp_img | VARCHAR(255) | NULL | Path stempel desa pada private storage; satu desa memiliki satu stempel |
| history | TEXT | NULL | Sejarah desa untuk profil publik |
| vision | TEXT | NULL | Visi desa |
| mission | TEXT | NULL | Misi desa |
| created_at | TIMESTAMP | NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NULL | Waktu diperbarui |

**Tabel: hamlets** (dusun)

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik dusun |
| name | VARCHAR(255) | NOT NULL | Nama dusun |
| code | VARCHAR(255) | NOT NULL | Kode dusun; unik dalam satu desa (`UNIQUE(village_id, code)`) |
| is_active | BOOLEAN | DEFAULT true | Status aktif |
| created_at, updated_at | TIMESTAMP | NULL | |

5 Dusun Desa Cibenda: Patrol, Sinargalih, Cibenda, Budiasih, Sucen — di-seed saat instalasi.

**Tabel: rws**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| hamlet_id | BIGINT | FK → hamlets.id, NOT NULL | Dusun yang menaungi |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik RW |
| number | VARCHAR(255) | NOT NULL | Nomor RW |
| full_label | VARCHAR(255) | NOT NULL | Label lengkap: 'RW 001' |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NULL | |

**Tabel: rts**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| rw_id | BIGINT | FK → rws.id, NOT NULL | RW yang menaungi |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik RT |
| number | VARCHAR(255) | NOT NULL | Nomor RT |
| full_label | VARCHAR(255) | NOT NULL | Label lengkap: 'RT 001/RW 001' |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NULL | |

Hierarki wilayah: `villages → hamlets → rws → rts`.

### 2.2. Pengguna & Jabatan Struktural

**Tabel: users**

Password menggunakan Argon2id. Seluruh role sistem disimpan di tabel ini.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | Primary key |
| name | VARCHAR(255) | NOT NULL | Nama lengkap pengguna |
| username | VARCHAR(30) | UNIQUE, NOT NULL | Identifier login; dibuat saat registrasi dan dapat diubah di profil |
| email | VARCHAR(255) | UNIQUE, NULL | Email opsional; bukan identifier login |
| password | VARCHAR(255) | NOT NULL | Hash Argon2id |
| must_change_password | BOOLEAN | DEFAULT false | Memaksa penggantian setelah reset password sementara |
| role | ENUM | NULL | `warga` \| `rt` \| `rw` \| `kadus` \| `kasi_pelayanan` \| `kaur_tu_umum` \| `petugas_desa` \| `kepala_desa` \| `sekretaris_desa`. Nullable di migration; diisi saat registrasi atau assignment jabatan |
| village_id | UUID | FK → villages.id, NULL | NULL untuk akun lintas desa |
| citizen_id | UUID | FK → citizens.id, NULL | Link ke data kependudukan; NULL untuk akun teknis tanpa data kependudukan |
| is_active | BOOLEAN | NOT NULL | Status akun aktif/nonaktif; tidak ada default di migration, wajib diisi saat create |
| email_verified_at | TIMESTAMP | NULL | |
| remember_token | VARCHAR(100) | NULL | |
| created_at, updated_at | TIMESTAMP | | |

- `sekretaris_desa`: diberikan saat Petugas Desa assign jabatan Sekdes di `officials`. Scope dashboard identik `kepala_desa`. Saat rotasi jabatan Sekdes, `users.role` otomatis diupdate.
- `kadus`: tetap ada di ENUM untuk kompatibilitas akun (login/logout/lihat status), tidak lagi punya relevansi terhadap `flow_steps.approver_position`.

**Tabel: citizens**

Kolom `nik` dienkripsi dengan cast Laravel `encrypted`; `address` disimpan sebagai teks biasa. Pencarian NIK menggunakan `nik_hash` (SHA-256 dari NIK plaintext). Setiap warga tercatat (lokal maupun pendatang) **selalu** punya NIK terverifikasi — tidak ada kategori "warga Non-NIK".

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| nik | TEXT | NOT NULL | AES-256 encrypted |
| nik_hash | VARCHAR(255) | UNIQUE, NOT NULL | SHA-256 dari NIK plaintext, untuk indexing |
| name | VARCHAR(100) | NOT NULL | |
| date_of_birth | DATE | NOT NULL | |
| place_of_birth | VARCHAR(100) | NULL | |
| gender | ENUM('L','P') | NOT NULL | |
| address | TEXT | NOT NULL | Alamat domisili (tidak memakai cast enkripsi pada model) |
| rt_id | BIGINT | FK → rts.id, NULL | |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | |
| marital_status | ENUM | NULL | `belum_kawin` \| `kawin` \| `cerai_hidup` \| `cerai_mati` |
| occupation_id | BIGINT | FK → occupations.id, NULL, ON DELETE RESTRICT | Pekerjaan baku desa; NULL = belum diisi. Kesamaan desa divalidasi di aplikasi, bukan FK |
| religion | ENUM | NULL | `islam` \| `kristen` \| `katolik` \| `hindu` \| `buddha` \| `konghucu` |
| last_education | ENUM | NULL | `tidak_sekolah` \| `sd` \| `smp` \| `sma` \| `diploma` \| `s1` \| `s2` \| `s3` |
| domicile_status | ENUM | NOT NULL, DEFAULT 'menetap' | `menetap` \| `merantau_dalam_negeri` \| `merantau_luar_negeri` \| `tki`. Murni informatif, tidak mempengaruhi hak akses |
| current_domicile | VARCHAR(150) | NULL | Alamat domisili saat ini jika tidak menetap |
| family_id | UUID | FK → families.id, NULL | NULL = belum/tidak tergabung KK manapun |
| family_role | ENUM | NULL | `kepala_keluarga` \| `istri` \| `suami` \| `anak` \| `famili_lain` |
| father_id | UUID | FK → citizens.id, NULL | Self-reference, untuk fitur pohon keluarga |
| mother_id | UUID | FK → citizens.id, NULL | Self-reference |
| father_name_text | VARCHAR(255) | NULL | Fallback teks bebas jika `father_id` NULL |
| mother_name_text | VARCHAR(255) | NULL | Fallback teks bebas jika `mother_id` NULL |
| blood_type | ENUM | NULL | `A` \| `B` \| `AB` \| `O` \| `tidak_tahu` |
| residency_type | ENUM | NOT NULL, DEFAULT 'lokal' | `lokal` \| `pendatang`. Pembeda murni kolom, **bukan** tabel/entitas terpisah |
| origin_region | VARCHAR(255) | NULL | Relevan jika `residency_type='pendatang'` |
| data_source | ENUM | NOT NULL, DEFAULT 'manual_input_desa' | `manual_input_desa` \| `import_excel` \| `dukcapil_sync` |
| last_verified_at | TIMESTAMP | NULL | Kapan terakhir dicocokkan dengan dokumen fisik |
| sync_status | ENUM | NULL | `synced` \| `pending` \| `conflict` |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NULL | |

> Kolom `no_kk` **dihapus total** dari tabel ini, dipindah ke tabel `families.no_kk`.

**Tabel: families** (Kartu Keluarga)

Sengaja dibuat tipis — hanya berisi data yang sama untuk semua anggota keluarga.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | Primary key |
| no_kk | TEXT | NOT NULL | AES-256 encrypted |
| no_kk_hash | VARCHAR(255) | UNIQUE, NOT NULL | SHA-256, pola sama seperti `nik`/`nik_hash` |
| family_address | TEXT | NOT NULL | AES-256 encrypted, alamat resmi sesuai dokumen KK |
| family_status | ENUM | NOT NULL, DEFAULT 'aktif' | `aktif` \| `pindah` \| `bubar` |
| village_id | UUID | FK → villages.id, NOT NULL | |
| rt_id | BIGINT | FK → rts.id, NULL | |
| rw_id | BIGINT | FK → rws.id, NULL | |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | |
| head_of_family_id | UUID | FK → citizens.id, NULL | Denormalisasi opsional untuk performa query |
| created_at, updated_at | TIMESTAMP | NULL | |

`head_of_family_id` pada prinsipnya bisa diturunkan dari `citizens.family_role = 'kepala_keluarga'`. Jika dipakai untuk mempercepat query, aplikasi wajib menjaga konsistensi manual antara kedua sumber data ini.

**Tabel: occupations**

Daftar pekerjaan baku per desa; bukan ENUM database agar dapat dikelola Petugas Desa. Nama unik tanpa membedakan huruf besar/kecil dalam satu desa, dijamin oleh unique index `LOWER(name)` dan validasi aplikasi.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik referensi pekerjaan |
| name | VARCHAR(100) | NOT NULL | Unik case-insensitive dalam desa |
| is_active | BOOLEAN | DEFAULT true | Pekerjaan nonaktif tidak tersedia untuk pemilihan baru |
| sort_order | UNSIGNED INT | DEFAULT 0 | Urutan tampilan |
| created_at, updated_at | TIMESTAMP | NULL | |

`citizens.occupation_id` mengacu ke pekerjaan yang sama desanya dengan warga; aturan kesamaan desa dijaga di aplikasi. FK `RESTRICT` melindungi data yang terpakai. Penghapusan melalui aplikasi menghasilkan HTTP 409 bila masih dipakai; saran respons adalah menonaktifkan pekerjaan. Seeder menyediakan `Tidak bekerja`, `Pelajar/Mahasiswa`, dan `Ibu rumah tangga` untuk tiap desa.

**Tabel: family_socioeconomics**

Relasi 1:1 opsional dengan `families`; tidak ada data penghasilan individu.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| family_id | UUID | FK → families.id, UNIQUE NOT NULL, ON DELETE CASCADE | Satu baris survei per KK |
| household_income_range | ENUM | NULL | `<1jt` \| `1-3jt` \| `3-5jt` \| `5-10jt` \| `>10jt`; pendapatan rumah tangga |
| house_ownership_status | ENUM | NULL | `milik_sendiri` \| `sewa` \| `menumpang` \| `dinas` |
| water_source | ENUM | NULL | `pdam` \| `sumur` \| `sungai` \| `lainnya` |
| electricity_source | ENUM | NULL | `pln` \| `non_pln` \| `tidak_ada` |
| dependents_count | INT | NULL | Jumlah tanggungan |
| productive_assets | JSON | NULL | Aset produktif |
| surveyed_at | TIMESTAMP | NULL | |
| surveyed_by | UUID | FK → users.id, NULL, ON DELETE SET NULL | Petugas yang melakukan survei |
| created_at, updated_at | TIMESTAMP | NULL | |

Baris belum ada sampai KK disurvei; survei ulang menimpa data sebelumnya. Tidak ada kolom `village_id` karena scope mengikuti `families.village_id`. Warga tanpa KK tidak memiliki record sosio-ekonomi melalui model ini. Definisi periode penghasilan belum ditetapkan. Data tidak dienkripsi; keputusan enkripsi belum final.

**Tabel: officials**

Rekam jejak jabatan struktural desa per periode. Digunakan untuk resolusi wilayah saat routing notifikasi dan approval. Saat rotasi jabatan: INSERT baru + UPDATE `ended_at` lama, data `citizens` tidak disentuh.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| citizen_id | UUID | FK → citizens.id, NOT NULL | Warga yang menjabat |
| user_id | UUID | FK → users.id, NULL | Akun sistem pejabat |
| position | ENUM | NOT NULL | `kepala_desa` \| `kasi_pelayanan` \| `kaur_tu_umum` \| `kadus` \| `petugas_desa` \| `rw` \| `rt` \| `sekdes` \| `kasi_kesejahteraan` \| `kasi_pemerintahan` \| `kaur_perencanaan` \| `kaur_keuangan` \| `staf_sipades` \| `staf_siskeudes` |
| village_id | UUID | FK → villages.id, NULL | |
| rt_id | BIGINT | FK → rts.id, NULL | Diisi untuk jabatan RT |
| rw_id | BIGINT | FK → rws.id, NULL | Diisi untuk jabatan RW |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | Diisi untuk jabatan Kadus |
| signature_img | VARCHAR(255) | NULL | Path TTD Kepala Desa pada private storage; upload/preview terproteksi |
| stamp_img | VARCHAR(255) | NULL | Kolom legacy; tidak dipakai PDF. Stempel PDF berasal dari `villages.stamp_img`; nasib kolom belum diputuskan |
| photo_img | VARCHAR(255) | NULL | Path foto (halaman publik) |
| phone_wa | VARCHAR(255) | NULL | Untuk fitur Hubungi Kami |
| started_at | DATE | NOT NULL | |
| ended_at | DATE | NULL | NULL = masih aktif |
| term_ends_at | DATE | NULL | Informasi akhir masa jabatan; tidak memicu demote otomatis |
| is_active | BOOLEAN | DEFAULT true | |
| notes | TEXT | NULL | |
| created_at, updated_at | TIMESTAMP | NULL | |

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
| created_at, updated_at | TIMESTAMP | NULL | |

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
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik flow; konfigurasi flow diisolasi per desa |
| category_id | BIGINT | FK → letter_categories.id, NOT NULL | |
| name | VARCHAR(150) | NOT NULL | Contoh: 'RT-Kades (2 Tahap)' |
| description | TEXT | NULL | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NULL | |

Untuk category `upload_mandiri`, `dokumen_pendukung`, `update_data` — tetap wajib punya row di `approval_flows` (misal flow "Direct — Tanpa Approval Bertingkat") demi konsistensi satu pola query di seluruh sistem, meski `flow_steps`-nya kosong/minimal.

**Tabel: flow_steps**

Urutan approver per flow.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | |
| step_order | INT | NOT NULL | Urutan step dalam flow |
| approver_position | ENUM | NOT NULL | DB enum memuat `rt`, `kepala_desa`, `sekdes`, `kasi_pelayanan`, `kaur_tu_umum`; flow baru hanya menerima `rt` dan `kepala_desa`, final harus `kepala_desa` |
| is_final | BOOLEAN | DEFAULT false | true jika step ini step terakhir |
| created_at, updated_at | TIMESTAMP | NULL | |

Constraint: `UNIQUE(flow_id, step_order)`

⚠ **Penting:** `rw` dan `kadus` **tidak pernah** muncul sebagai `approver_position` di tabel ini. RW ditangani sebagai side-effect notifikasi, bukan step approval formal. Kadus tidak lagi bagian dari alur approval surat.

**Tabel: letter_types**

Master data jenis surat, bersifat fleksibel dan dapat dikelola oleh admin desa.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik jenis surat |
| code | VARCHAR(20) | NOT NULL | Kode jenis surat; unik dalam satu desa (`UNIQUE(village_id, code)`) |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| template | TEXT | NULL | NULL = Draft |
| verification_type | ENUM | NOT NULL | `auto` \| `manual` \| `document` |
| requirement_info | TEXT | NOT NULL | Informasi persyaratan pengajuan |
| assigned_role | ENUM | NULL | Menentukan role Kasi/Kaur yang dapat mengakses surat selesai; NULL berarti keduanya |
| validity_days | UNSIGNED INT | NULL | NULL = tidak expire |
| category_id | BIGINT | FK → letter_categories.id, NOT NULL | Gate awal jenis surat |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | Selalu diisi, termasuk category non-`approval_normal`, demi konsistensi query |
| is_active | BOOLEAN | NOT NULL | Status aktif; tidak ada default di migration, wajib diisi saat create |
| created_at, updated_at | TIMESTAMP | NULL | |

Lookup dan perubahan flow maupun jenis surat dibatasi ke `village_id` milik akun Petugas Desa yang aktif. ID flow/jenis surat milik desa lain diperlakukan sebagai tidak ditemukan (HTTP 404). `village_id` ditentukan dari akun terautentikasi, bukan diterima dari payload konfigurasi.

Constraint tipe surat: `UNIQUE(village_id, code)`; kode yang sama dapat digunakan oleh desa berbeda.
Kolom `village_id` adalah scope internal konfigurasi dan tidak ditampilkan oleh `ApprovalFlowResource` maupun `LetterTypeResource` saat ini.

- Status tipe surat: `template=NULL + is_active=false` = Draft; `template!='...' + is_active=true` = Aktif; `template!='...' + is_active=false` = Dinonaktifkan
- **Catatan `assigned_role`:** menentukan akses Kasi/Kaur terhadap surat selesai; NULL memberi akses kepada kedua role. Kasi/Kaur bukan approver sehingga akses ini tidak diturunkan dari `flow_steps`.

Penjelasan `verification_type`:
- **Auto**: sistem otomatis validasi jika NIK pemohon terdaftar di `citizens`
- **Manual**: sistem menampilkan checklist persyaratan, petugas konfirmasi verifikasi manual
- **Document**: dokumen pendukung dikelola melalui form seeder per tipe surat di MVP (kolom `supporting_document` sudah dihapus dari `letters`; field requirement dinamis = Next Dev Paket 1, lihat Appendix)

### 2.4. Surat & Approval

**Tabel: letters**

Tabel utama sistem. Kolom `applicant_nik` dienkripsi AES-256, `applicant_nik_hash` menyimpan SHA-256 untuk indexing dan pencarian.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| letter_type_id | BIGINT | FK → letter_types.id, NOT NULL | |
| submitted_by | UUID | FK → users.id, NOT NULL | User yang mengajukan; dapat berperan sebagai warga atau pejabat |
| on_behalf_of | UUID | FK → citizens.id, NULL | Selalu NULL di MVP; dipersiapkan untuk future use case petugas input atas nama warga lain |
| citizen_id | UUID | FK → citizens.id, NULL | Diisi dari `auth()->user()->citizen_id` saat user submit untuk dirinya |
| letter_number | VARCHAR(50) | UNIQUE, NULL | Diisi otomatis saat `status = 'approved'` (step `is_final=true`) |
| applicant_name | VARCHAR(100) | NOT NULL | |
| applicant_nik | TEXT | NOT NULL | AES-256 encrypted |
| applicant_nik_hash | VARCHAR(64) | NOT NULL | SHA-256, untuk indexing & pencarian |
| applicant_address | TEXT | NULL | AES-256 encrypted |
| purpose | TEXT | NOT NULL | Keperluan pengajuan |
| payload | JSON | NULL | Data formulir tambahan untuk jenis surat |
| notes | TEXT | NULL | Catatan dari Petugas Desa |
| is_overdue | BOOLEAN | DEFAULT false | Saat daftar dimuat, true bila deadline approval pending pada step aktif terlewati; surat terminal dan step sebelumnya tidak dihitung |
| expires_at | TIMESTAMP | NULL | Dihitung saat `status = 'approved'` + `validity_days`. NULL = tidak expire |
| status | ENUM | NOT NULL, DEFAULT 'pending' | `pending` \| `in_progress` \| `approved` \| `rejected` |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | **Snapshot** dari `letter_types.flow_id` saat submit, dikunci |
| current_step_order | INT | NOT NULL, DEFAULT 1 | Step yang sedang aktif/ditunggu, dicocokkan ke `flow_steps` |
| rejected_at_step | INT | NULL | Step tempat surat direject, untuk histori/laporan |
| submitted_at | TIMESTAMP | NOT NULL | |
| processed_at | TIMESTAMP | NULL | Waktu terakhir diproses (approver manapun di step manapun) |
| created_at, updated_at | TIMESTAMP | NULL | |

**Semantik `letters.status`:**
- `pending`: surat baru tersimpan dan belum ada keputusan approver, termasuk ketika tahap awal dilewati karena pemohon sendiri satu-satunya approver eligible
- `in_progress`: minimal 1 step approve, belum sampai step `is_final=true`
- `approved`: step `is_final=true` sudah di-approve → trigger `letter_number` + `expires_at`
- `rejected`: TERMINAL — ada satu step yang reject, `rejected_at_step` dicatat

**Tabel: letter_number_counters**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, auto increment | Kunci internal |
| village_id | UUID | FK → villages.id | Desa penerbit |
| letter_type_id | BIGINT | FK → letter_types.id | Jenis surat |
| year | SMALLINT | NOT NULL | Tahun urutan nomor |
| last_number | UNSIGNED INT | DEFAULT 0 | Nilai sequence terakhir |
| created_at, updated_at | TIMESTAMP | NULL | |

Unique `(village_id, letter_type_id, year)` menjaga counter terpisah per desa, jenis surat, dan tahun.

**Query Pattern Generik** (menggantikan query hardcode per role):

```sql
SELECT l.* FROM letters l
JOIN flow_steps fs ON fs.flow_id = l.flow_id AND fs.step_order = l.current_step_order
WHERE fs.approver_position = ? AND l.status IN ('pending','in_progress')
```

Untuk RT (berbasis wilayah), tetap perlu JOIN tambahan ke `citizens.rt_id`. Tahap final berbasis posisi hanya untuk Kades/Sekdes. Kasi/Kaur tidak menjalankan keputusan flow.

**Catatan `on_behalf_of` vs `citizen_id`:**
- `citizen_id`: referensi citizen pemohon yang diambil dari akun login, baik akun warga maupun pejabat
- `on_behalf_of`: kolom tetap ada namun selalu NULL di MVP
- Pada MVP self-service, `submitted_by` + `citizen_id` sudah cukup mendeskripsikan pemohon

**Tabel: letter_approvals**

Record keputusan approval per surat per tahap. Satu surat dapat memiliki beberapa record approval sesuai jumlah step di flow-nya. Relasi one-to-many (`letters → letter_approvals`).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | UUID | FK → letters.id, NOT NULL | |
| approved_by | UUID | FK → users.id, NULL | NULL pada placeholder pending; diisi user yang memutuskan |
| approval_level | ENUM | NOT NULL | ENUM kompatibilitas 5 nilai; flow baru memakai step RT/Kepala Desa. Aktor Sekdes tercatat sebagai `sekdes` bila ia memutuskan step `kepala_desa` |
| action | ENUM | NULL | `approved` \| `rejected`; NULL selama placeholder menunggu keputusan |
| flow_step_id | BIGINT | FK → flow_steps.id, NULL | Referensi step spesifik yang dieksekusi, untuk audit trail granular |
| notes | TEXT | NULL | Wajib jika `rejected` |
| deadline_at | TIMESTAMP | NULL | Dihitung dari `approval_settings.deadline_hours` |
| reminded_at | TIMESTAMP | NULL | Waktu reminder terakhir dikirim |
| created_at | TIMESTAMP | NULL | |
| updated_at | TIMESTAMP | NULL | |

**Tabel: letter_status_logs**

Audit trail lengkap setiap perubahan status surat. Tidak dapat dihapus atau diubah.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| letter_id | UUID | FK → letters.id, NOT NULL | |
| actor_id | UUID | FK → users.id, NOT NULL | |
| old_status | ENUM | NULL | `pending` \| `in_progress` \| `approved` \| `rejected`. NULL untuk log pertama |
| new_status | ENUM | NOT NULL | Sama nilai seperti `old_status` |
| reason | TEXT | NULL | Alasan/catatan perubahan status; nilai aktif `Tahap RT dilewati: pemohon adalah pejabat pada tahap tersebut` dicatat saat tahap RT dilewati |
| ip_address | VARCHAR(45) | NULL | Mendukung IPv4 & IPv6 |
| user_agent | TEXT | NULL | |
| created_at | TIMESTAMP | NULL | |

**Tabel: approval_settings**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| approval_level | ENUM | NOT NULL | `rt` \| `kepala_desa` \| `sekdes` \| `kasi_pelayanan` \| `kaur_tu_umum` |
| deadline_hours | UNSIGNED INT | NOT NULL, DEFAULT 24 | Berapa jam pejabat punya waktu untuk action |
| reminder_hours | UNSIGNED INT | NOT NULL, DEFAULT 12 | Konfigurasi target reminder; **Status: Belum diimplementasi (Planned)** — tidak ada task/job pengiriman reminder aktif |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NULL | |

Constraint: `UNIQUE(village_id, approval_level)`

> ENUM kolom tetap berisi lima nilai untuk kompatibilitas skema. Service/repository dan seeder hanya memakai tahap aktif (`rt`, `kepala_desa`). Nilai `sekdes`/Kasi/Kaur tetap di enum DB, tetapi tidak ditampilkan, di-seed, atau dapat diubah lewat endpoint settings.

### 2.5. Organisasi Non-Struktural, Notifikasi, Konten Publik

**Tabel: village_org_positions**

Master jabatan per organisasi non-struktural.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| org_type | ENUM | NOT NULL | `bpd` \| `bumdes` \| `lpm` \| `karang_taruna` \| `pkk` |
| position_label | VARCHAR(100) | NOT NULL | |
| is_single_occupant | BOOLEAN | DEFAULT true | false = bisa diisi banyak orang |
| sort_order | INT | DEFAULT 0 | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at, updated_at | TIMESTAMP | NULL | |

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
| created_at, updated_at | TIMESTAMP | NULL | |

**Tabel: village_regulations**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| regulation_number | VARCHAR(100) | NOT NULL | |
| title | VARCHAR(200) | NOT NULL | |
| content | TEXT | NOT NULL | |
| enacted_date | DATE | NULL | |
| created_by | UUID | FK → users.id, NOT NULL | |
| created_at, updated_at | TIMESTAMP | NULL | |

Tidak ada kolom `is_published` — semua peraturan yang disimpan langsung tampil di halaman publik.

**Tabel: notifications**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | UUID | PK | |
| type | VARCHAR(255) | NOT NULL | Fully-qualified class name notifikasi Laravel |
| notifiable_type | VARCHAR(255) | NOT NULL | Tipe pemilik notifikasi (polymorphic, biasanya `App\Models\User`) |
| notifiable_id | UUID | NOT NULL | |
| data | TEXT | NOT NULL | Payload konten notifikasi (JSON string disimpan sebagai TEXT) |
| read_at | TIMESTAMP | NULL | NULL = belum dibaca |
| created_at, updated_at | TIMESTAMP | NULL | |

**Tabel: news**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| author_id | UUID | FK → users.id, NOT NULL | |
| title | VARCHAR(200) | NOT NULL | |
| slug | VARCHAR(200) | UNIQUE, NOT NULL | |
| content | TEXT | NOT NULL | |
| thumbnail | VARCHAR(255) | NULL | |
| is_published | BOOLEAN | DEFAULT false | |
| published_at | TIMESTAMP | NULL | NULL jika masih draft |
| created_at, updated_at | TIMESTAMP | NULL | |

---

**Tabel operasional: activity_log**

Dibuat oleh package `spatie/laravel-activitylog`; bukan bagian dari 23 tabel domain inti. Migration aplikasi menambahkan `event` dan `batch_uuid` ke skema package.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | |
| log_name | VARCHAR(255) | NULL | Kategori log |
| description | TEXT | NOT NULL | Ringkasan aktivitas |
| subject_type, subject_id | VARCHAR(255), VARCHAR(36) | NULL | Model terdampak; di-index |
| causer_type, causer_id | VARCHAR(255), VARCHAR(36) | NULL | Aktor; NULL untuk aktivitas CLI |
| properties | JSON | NULL | Detail perubahan |
| event | VARCHAR(255) | NULL | Event model |
| batch_uuid | UUID | NULL | ID batch aktivitas |
| created_at, updated_at | TIMESTAMP | NULL | |

## 3. Ringkasan Tabel

Ada 23 tabel domain inti MVP. `letter_number_counters` dan `activity_log` adalah dua tabel operasional tambahan, sehingga terdapat 25 tabel aplikasi non-framework.

```
Wilayah (4): villages, hamlets, rws, rts
Pengguna & Jabatan Struktural (3): users, citizens, officials
Data Keluarga & Sosio-Ekonomi (2): families, family_socioeconomics
Organisasi Non-Struktural (2): village_org_positions, village_org_members
Klasifikasi & Alur Surat (3): letter_categories, approval_flows, flow_steps
Surat (4): letter_types, letters, letter_approvals, letter_status_logs
Konfigurasi (1): approval_settings
Konten & Komunikasi (3): notifications, news, village_regulations
Referensi (1): occupations

Total domain inti: 4 + 3 + 2 + 2 + 3 + 4 + 1 + 3 + 1 = 23 tabel
Operasional: `letter_number_counters`, `activity_log` (2 tabel)
Total aplikasi non-framework: 25 tabel
```

Tabel yang di-hold (bukan bagian dari 23 tabel MVP — detail lengkap di `TDD-06_Appendix.md`): `village_assets`, `village_finances`, `letter_hashes`, `letter_type_fields`, `letter_field_values`, `citizen_aid_eligibility`, `citizen_aid_history`, `aid_programs`.

---

## 4. Indexing Strategy

Strategi indexing dirancang berdasarkan pola query yang paling sering digunakan.

**Index Tabel `letters`**

| Index | Kolom | Tipe | Status | Alasan |
|---|---|---|---|---|
| idx_letters_status | status | B-Tree | ✅ Aktif | Filter surat by status, dipakai di semua list view & dashboard |
| idx_letters_village_status | (village_id, status) | Composite | ✅ Aktif | Dashboard: surat desa X dengan status Y |
| idx_letters_flow_step | (flow_id, current_step_order) | Composite | ✅ Aktif | Query dashboard generik per role, **paling kritis** |
| idx_letters_overdue | is_overdue | B-Tree | ✅ Aktif | Filter surat overdue pada daftar/dashboard |
| (auto) | applicant_nik_hash | B-Tree | ✅ Aktif | Pencarian surat berdasarkan NIK pemohon (nama index auto-generated oleh Laravel `->index()`) |
| idx_letters_village | village_id | B-Tree | 📋 Planned | Filter surat per desa (belum di migration) |
| idx_letters_submitted_at | submitted_at DESC | B-Tree | 📋 Planned | Sorting list surat terbaru |
| idx_letters_citizen | citizen_id | B-Tree | 📋 Planned | Join letters ↔ citizens |
| idx_letters_on_behalf | on_behalf_of | B-Tree | 📋 Planned | Query surat berdasarkan warga yang diwakilkan |
| idx_letters_village_date | (village_id, submitted_at DESC) | Composite | 📋 Planned | Laporan periode per desa |

**Index Tabel `letter_status_logs`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_logs_letter | letter_id | B-Tree | Ambil semua log untuk 1 surat |
| idx_logs_created | created_at DESC | B-Tree | Sorting log terbaru |

**Index Tabel `citizens`**

| Index | Kolom | Tipe | Status | Alasan |
|---|---|---|---|---|
| idx_citizens_nik_hash | nik_hash | B-Tree UNIQUE | ✅ Aktif (auto dari `->unique()`) | Auto-fill & validasi NIK, paling sering dipanggil |
| idx_citizens_village | village_id | B-Tree | 📋 Planned | Filter warga per desa |
| idx_citizens_name | name | B-Tree | 📋 Planned | Pencarian warga berdasarkan nama |
| idx_citizens_rt | rt_id | B-Tree | 📋 Planned | Filter warga per RT (resolve wilayah) |
| idx_citizens_hamlet | hamlet_id | B-Tree | 📋 Planned | Filter warga per dusun |
| idx_citizens_family | family_id | B-Tree | 📋 Planned | Ambil semua anggota dalam satu KK |
| idx_citizens_residency | residency_type | B-Tree | 📋 Planned | Filter warga lokal vs pendatang |
| idx_citizens_father | father_id | B-Tree | 📋 Planned | Fitur pohon keluarga |
| idx_citizens_mother | mother_id | B-Tree | 📋 Planned | Fitur pohon keluarga |

**Index Tabel `notifications`**

| Index | Kolom | Tipe | Status | Alasan |
|---|---|---|---|---|
| idx_notif_notifiable | (notifiable_type, notifiable_id) | Composite | ✅ Aktif (auto dari `uuidMorphs()`) | Query semua notifikasi milik 1 user, dijalankan tiap halaman dimuat |
| idx_notif_read_at | read_at | B-Tree | 📋 Planned | Filter notifikasi belum dibaca (belum di migration) |

**Index Tabel `officials`**

| Index | Kolom | Tipe | Status | Alasan |
|---|---|---|---|---|
| idx_officials_term | (is_active, term_ends_at) | Composite | ✅ Aktif (migration) | Filter jabatan aktif dengan masa akhir jabatan |
| idx_officials_village | village_id | B-Tree | 📋 Planned | Filter jabatan per desa |
| idx_officials_position | position | B-Tree | 📋 Planned | Query RT/RW aktif |
| idx_officials_active | is_active | B-Tree | 📋 Planned | Filter jabatan aktif |
| idx_officials_resolve | (village_id, position, is_active) | Composite | 📋 Planned | Resolve jabatan aktif per posisi per desa |
| idx_officials_user | user_id | B-Tree | 📋 Planned | Lookup user → jabatan (authorization check) |
| idx_officials_rt | rt_id | B-Tree | 📋 Planned | Resolve pejabat RT per wilayah |
| idx_officials_rw | rw_id | B-Tree | 📋 Planned | Resolve pejabat RW per wilayah |
| idx_officials_hamlet | hamlet_id | B-Tree | 📋 Planned | Resolve Kadus per dusun (struktural, non-approval) |

**Index tabel wilayah pendukung**

| Tabel | Index | Kolom | Status | Alasan |
|---|---|---|---|---|
| rws | idx_rws_village | village_id | ✅ Aktif (migration) | Filter RW per desa |
| rws | idx_rws_hamlet | hamlet_id | 📋 Planned | Semua RW dalam satu dusun (belum di migration) |
| rts | idx_rts_village | village_id | ✅ Aktif (migration) | Filter RT per desa |
| rts | idx_rts_rw | rw_id | 📋 Planned | Semua RT dalam satu RW (belum di migration, FK auto-index di beberapa engine) |
| rts | idx_rts_active | is_active | 📋 Planned | Filter RT aktif (belum di migration) |
| hamlets | idx_hamlets_village | village_id | 📋 Planned | Semua dusun dalam satu desa (belum di migration, FK auto-index di beberapa engine) |

**Index Tabel `letter_approvals`**

| Index | Kolom | Tipe | Alasan |
|---|---|---|---|
| idx_approvals_letter | letter_id | B-Tree | Semua approval untuk 1 surat |
| idx_approvals_deadline | deadline_at | B-Tree | Lookup approval melewati deadline; pengiriman reminder otomatis berstatus Planned |
| idx_approvals_level | (letter_id, approval_level) | Composite | Cek apakah sudah ada approval tahap tertentu |

**Index Tabel pipeline dinamis**

| Tabel | Index | Kolom | Status | Alasan |
|---|---|---|---|---|
| letter_categories | (auto) | code | ✅ Aktif (auto dari `->unique()`) | B-Tree UNIQUE — lookup handler berdasarkan kode |
| approval_flows | idx_flows_category | category_id | 📋 Planned | Ambil semua flow dalam satu category (belum di migration) |
| flow_steps | (auto unique) | (flow_id, step_order) | ✅ Aktif (`->unique()`) | Composite UNIQUE — query step aktif, **paling kritis**, dipanggil di setiap pengecekan gate |
| flow_steps | idx_flowsteps_position | approver_position | ✅ Aktif | Resolve semua flow yang punya step approver tertentu |

**Index Tabel `families` & `family_socioeconomics`**

| Tabel | Index | Kolom | Status | Alasan |
|---|---|---|---|---|
| families | idx_families_nokk_hash | no_kk_hash | ✅ Aktif (auto dari `->unique()`) | B-Tree UNIQUE — pencarian KK berdasarkan No KK |
| families | idx_families_village | village_id | 📋 Planned | Filter KK per desa |
| families | idx_families_rt | rt_id | 📋 Planned | Filter KK per RT |
| family_socioeconomics | (auto unique) | family_id | ✅ Aktif (auto dari `->unique()`) | B-Tree UNIQUE — relasi 1:1 dengan families |

**Index Tabel `occupations`**

| Tabel | Index | Kolom | Status | Alasan |
|---|---|---|---|---|
| occupations | occupations_village_name_ci_unique | (village_id, LOWER(name)) | ✅ Aktif | Unik case-insensitive; menjaga race antarrekuest di PostgreSQL dan SQLite |

---

Data `family_socioeconomics` belum menggunakan cast enkripsi; keputusan enkripsi sosio-ekonomi belum final.

## 5. Strategi Enkripsi Field

Sistem mengelola data kependudukan warga (NIK, alamat) yang termasuk kategori data pribadi sangat sensitif sesuai UU PDP No. 27/2022. Untuk memastikan data tetap tidak terbaca meskipun terjadi kebocoran database, diterapkan enkripsi field-level menggunakan cast enkripsi Laravel hanya pada kolom yang tercantum di bawah.

**Algoritma & Implementasi**

| Aspek | Detail |
|---|---|
| Algoritma | Cipher aplikasi (`AES-256-CBC`, `config/app.php`) |
| Implementasi | Laravel built-in Encryption (`Illuminate\Contracts\Encryption\Encrypter`) |
| Key Source | `APP_KEY` di file `.env` (32-byte random key) |
| Laravel Mechanism | `$casts` property di Eloquent Model |
| Password Hashing | Argon2id (bukan enkripsi, one-way hash) |

**Field yang Dienkripsi**

| Tabel | Kolom | Alasan |
|---|---|---|
| citizens | nik | Data pribadi sangat sensitif (UU PDP) |
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
