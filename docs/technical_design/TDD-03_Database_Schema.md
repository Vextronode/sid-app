# TECHNICAL DESIGN DOCUMENT — BAGIAN 3
## SISTEM INFORMASI DESA - DESA CIBENDA
### Desain Database

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 3 dari 5 (+ Appendix) |
| Status | v5.3 — Surat dinamis, tanda tangan, identitas desa (diselaraskan ke migration 2026-10-16) |
| Cakupan | ERD, definisi tabel & atribut (29 tabel domain inti + 3 tabel operasional), indexing strategy, strategi enkripsi |
| Tabel Next Dev / Tahap 2 (letter_hashes, village_assets, dst) | Lihat `TDD-06_Appendix.md` |
| Dokumen terkait | `TDD-01_Overview_Scope_Roles.md`, `TDD-02_UseCase_Descriptions.md`, OpenAPI Spec v5.3, `SID-ARCH-BE-001` |

> **v5.3:** `letter_categories` di-drop beserta `letter_types.category_id`, `approval_flows.category_id`, dan `letter_types.verification_type`. Jenis surat kini membawa definisi isian, aksi data, slot tanda tangan, dokumen pendukung, dan kode klasifikasi. Tabel baru: `letter_attachments`, `user_signatures`, `letter_signatures`, `signature_blocks`, `official_position_types`, `news_categories`, `news_category_news`, `push_subscriptions`. `letters` mendapat snapshot & kolom fulfillment; `villages` mendapat kolom kop surat & tampilan publik; `officials.position` menjadi VARCHAR.

---

## 1. Entity Relationship Diagram (ERD)

⚠ Diagram tersedia di file terpisah (ERD v8 — Core [1/2] dan Pendukung [2/2], PlantUML) di `docs/diagram/code/erd/`.

ERD mencakup 29 tabel domain inti. Sumber kebenaran adalah migration di `apps/backend/database/migrations/` (termasuk migration perubahan bertanggal 2026-10-09 s.d. 2026-10-12).

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
| area_ha | DECIMAL(10,3) | NULL | Luas wilayah (hektare), diisi Petugas Desa |
| stamp_img | VARCHAR(255) | NULL | Path stempel desa pada private storage; satu desa memiliki satu stempel |
| logo | VARCHAR(255) | NULL | Path aset frontend (`/assets/...`, dari seeder) atau path unggahan di disk public (`village-media/{id}/...`) |
| hero_image | VARCHAR(255) | NULL | Foto beranda; aturan nilai sama dengan `logo` |
| hero_photo_credit | VARCHAR(100) | NULL | Kredit foto beranda |
| office_hours | VARCHAR(100) | NULL | Jam layanan kantor desa |
| map_url | VARCHAR(500) | NULL | Tautan peta |
| history | TEXT | NULL | Sejarah desa untuk profil publik |
| vision | TEXT | NULL | Visi desa |
| mission | TEXT | NULL | Misi desa |
| district | VARCHAR(100) | NULL | Kecamatan (kop surat) |
| regency | VARCHAR(100) | NULL | Kabupaten (kop surat) |
| province | VARCHAR(100) | NULL | Provinsi (kop surat) |
| postal_code | VARCHAR(10) | NULL | Kode pos |
| email | VARCHAR(150) | NULL | Email kantor desa |
| created_at | TIMESTAMP | NULL | Waktu dibuat |
| updated_at | TIMESTAMP | NULL | Waktu diperbarui |

Identitas desa (nama, kontak, logo, kop) dibaca frontend dan PDF dari tabel ini; tidak di-hardcode. Perubahan baris desa menggugurkan cache halaman publik.

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
| photo_img | VARCHAR(255) | NULL | Path foto profil akun di disk public (`user-photos/{village_id}/...`). Hanya dipakai dan dapat diubah selama role `warga` (oleh pemilik atau Petugas Desa); akun yang menjabat memakai `officials.photo_img` |
| password | VARCHAR(255) | NOT NULL | Hash Argon2id |
| must_change_password | BOOLEAN | DEFAULT false | Memaksa penggantian setelah reset password sementara |
| role | ENUM | NULL | `warga` \| `rt` \| `rw` \| `kadus` \| `kasi_pelayanan` \| `kaur_tu_umum` \| `staf_sid` \| `kepala_desa` \| `sekretaris_desa`. Nullable di migration; diisi saat registrasi atau assignment jabatan |
| village_id | UUID | FK → villages.id, NULL | NULL untuk akun lintas desa |
| citizen_id | UUID | FK → citizens.id, NULL | Link ke data kependudukan; NULL untuk akun teknis tanpa data kependudukan |
| is_active | BOOLEAN | NOT NULL | Status akun aktif/nonaktif; tidak ada default di migration, wajib diisi saat create |
| email_verified_at | TIMESTAMP | NULL | |
| remember_token | VARCHAR(100) | NULL | |
| created_at, updated_at | TIMESTAMP | | |

- `sekretaris_desa`: diberikan saat Petugas Desa assign jabatan Sekdes di `officials`. Scope dashboard identik `kepala_desa`. Saat rotasi jabatan Sekdes, `users.role` otomatis diupdate.
- `kadus`: tetap ada di ENUM untuk kompatibilitas akun (login/logout/lihat status), tidak lagi punya relevansi terhadap `flow_steps.approver_position`.
- `staf_sid`: staf pemegang aplikasi desa (dulu `petugas_desa`), hanya satu aktif per desa dan diganti lewat rotasi. Label tampilannya "Staf {nama aplikasi}" dari `config('sid.app_name')` (env `SID_APP_NAME`), sehingga nama aplikasi dapat diganti tanpa mengubah data.

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
| user_id | UUID | FK → users.id, NULL | Akun sistem pejabat; NULL untuk jabatan tanpa akun |
| position | VARCHAR(50) | NOT NULL | Nilai enum aplikasi `OfficialPosition` (jabatan berakun: `kepala_desa`, `sekdes`, `rt`, `rw`, `kadus`, `kasi_pelayanan`, `kaur_tu_umum`, `staf_sid`) atau `code` dari `official_position_types` desa (jabatan tanpa akun). Divalidasi rule `ValidOfficialPosition`, bukan ENUM DB |
| village_id | UUID | FK → villages.id, NULL | |
| rt_id | BIGINT | FK → rts.id, NULL | Diisi untuk jabatan RT |
| rw_id | BIGINT | FK → rws.id, NULL | Diisi untuk jabatan RW |
| hamlet_id | BIGINT | FK → hamlets.id, NULL | Diisi untuk jabatan Kadus |
| signature_img | VARCHAR(255) | NULL | Path TTD Kepala Desa pada private storage; upload/preview terproteksi |
| stamp_img | VARCHAR(255) | NULL | Kolom legacy; tidak dipakai PDF. Stempel PDF berasal dari `villages.stamp_img`; nasib kolom belum diputuskan |
| photo_img | VARCHAR(255) | NULL | Path foto di disk public (`official-photos/{village_id}/...`); wajib diunggah saat promote/rotate/store, tampil di Profil Desa publik |
| phone_wa | VARCHAR(255) | NULL | Untuk fitur Hubungi Kami |
| started_at | DATE | NOT NULL | |
| ended_at | DATE | NULL | NULL = masih aktif |
| term_ends_at | DATE | NULL | Informasi akhir masa jabatan; tidak memicu demote otomatis |
| is_active | BOOLEAN | DEFAULT true | |
| notes | TEXT | NULL | |
| created_at, updated_at | TIMESTAMP | NULL | |

- `user_id`: NULL untuk jabatan tanpa akun (jenis dari `official_position_types`). Sekdes punya akun — `user_id` NOT NULL dengan `users.role = 'sekretaris_desa'`.
- `kadus` tetap jabatan struktural non-approval dan **tidak** direferensikan `flow_steps.approver_position`.
- Index tambahan (migration performa): `idx_officials_user`, `idx_officials_citizen`, `idx_officials_village_position (village_id, position, is_active)`, `idx_officials_rt`.

**Pemetaan officials.position → users.role:**

| officials.position | users.role | user_id |
|---|---|---|
| kepala_desa | kepala_desa | NOT NULL |
| kasi_pelayanan | kasi_pelayanan | NOT NULL |
| kaur_tu_umum | kaur_tu_umum | NOT NULL |
| kadus | kadus | NOT NULL |
| staf_sid | staf_sid | NOT NULL |
| rw | rw | NOT NULL |
| rt | rt | NOT NULL |
| sekdes | sekretaris_desa | NOT NULL |
| `code` jenis jabatan tanpa akun (seed: kasi_kesejahteraan, kasi_pemerintahan, kaur_perencanaan, kaur_keuangan, staf_sipades, staf_siskeudes) | — (role akun tidak berubah) | NULL |

**Tabel: official_position_types**

Jenis jabatan desa **tanpa akun** yang dikelola Petugas Desa. Jabatan berakun tetap di enum aplikasi dan tidak disimpan di sini.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | |
| village_id | UUID | FK → villages.id, NOT NULL, ON DELETE CASCADE | |
| code | VARCHAR(50) | NOT NULL, `UNIQUE(village_id, code)` | Dibuat dari label (slug `_`) saat create; tidak dapat diubah karena disimpan di `officials.position`; tidak boleh bentrok dengan jabatan berakun |
| label | VARCHAR(100) | NOT NULL | Nama tampilan |
| is_single_occupant | BOOLEAN | DEFAULT true | true = hanya satu pemegang aktif per desa |
| sort_order | INT | DEFAULT 0 | Urutan di Profil Desa publik |
| is_active | BOOLEAN | DEFAULT true | Nonaktif ditolak (409) selama masih dijabat |
| created_at, updated_at | TIMESTAMP | NULL | |

Hapus ditolak (409) bila pernah dipakai pejabat mana pun (termasuk riwayat). Seeder `OfficialPositionTypeSeeder` mengisi 6 jenis default per desa.

### 2.3. Pipeline Approval Surat (Config over Code)

> Tabel `letter_categories` **sudah di-drop** (migration `2026_10_10_090000_replace_letter_categories_with_type_properties`). Flow yang tidak pernah dipakai dan tidak memiliki step dihapus pada migration yang sama. Perilaku per jenis surat kini diturunkan dari kolom `letter_types` (S2.3 di bawah).

**Tabel: approval_flows**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik flow |
| name | VARCHAR(150) | NOT NULL | Seed: `RT-Kades/Sekdes (2 Tahap)` |
| description | TEXT | NULL | |
| is_active | BOOLEAN | DEFAULT true | Hanya flow aktif yang dikembalikan `GET /approval-flows` |
| created_at, updated_at | TIMESTAMP | NULL | |

Flow diset developer lewat `ApprovalFlowSeeder` (satu flow per desa); API hanya membaca.

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

Master data jenis surat. Struktur (template, isian, slot TTD, aksi data, flow) diisi developer lewat `LetterTypeSeeder`; Petugas Desa hanya mengubah `validity_days`, `assigned_role`, `is_active`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | Desa pemilik jenis surat |
| code | VARCHAR(20) | NOT NULL, `UNIQUE(village_id, code)` | Seed: A01–A10 |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| template | TEXT | NULL | HTML ber-placeholder; NULL = Draft |
| requirement_info | TEXT | NULL | Informasi persyaratan (seed: NULL) |
| assigned_role | ENUM | NULL | `kasi_pelayanan` \| `kaur_tu_umum`; NULL = keduanya. Menentukan akses surat selesai & Terapkan |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | |
| validity_days | UNSIGNED INT | NULL | NULL = tidak expire |
| is_active | BOOLEAN | NOT NULL | Tanpa default di migration |
| produces_letter | BOOLEAN | DEFAULT true | Penanda menerbitkan surat; belum dipakai logika backend |
| data_action | VARCHAR(30) | DEFAULT 'none' | `none` \| `update_citizen` \| `create_citizen` (enum aplikasi `LetterDataAction`) |
| form_fields | JSON | NULL | Daftar isian `{name, label, type, required, placeholder?, options?, accept?}`; type: text, textarea, date, number, nik, select, file. NULL = isian bebas (teks); array = hanya isian terdaftar |
| data_fields | JSON | NULL | Kolom `citizens` yang boleh diubah lewat Terapkan: `{column, label, source?, value?, value_label?}` |
| data_subject_field | VARCHAR(100) | NULL | Nama isian NIK subjek bila yang diubah bukan pemohon (seed A07: `nik_almarhum`) |
| signature_slots | JSON | NULL | `{key, label, signer: applicant\|other}`; belum dipakai jenis surat seed |
| supporting_template | TEXT | NULL | Template dokumen pendukung; belum dipakai jenis surat seed |
| classification_code | VARCHAR(10) | DEFAULT '470' | Kode klasifikasi pada nomor surat (seed A03: `510`) |
| created_at, updated_at | TIMESTAMP | NULL | |

- Kolom `category_id` dan `verification_type` **sudah di-drop**.
- Status: `template=NULL` = Draft; ber-template + `is_active=true` = Aktif; ber-template + `is_active=false` = Dinonaktifkan.
- Lookup dan perubahan dibatasi ke `village_id` akun login; milik desa lain → 404. `village_id` tidak ditampilkan resource.
- Perubahan jenis surat menggugurkan cache halaman publik desa.

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
| purpose | TEXT | NULL | Kolom legacy; pengajuan baru selalu NULL (keperluan menjadi isian `payload` bila dibutuhkan) |
| payload | JSON | NULL | Isian form sesuai `letter_types.form_fields` |
| notes | TEXT | NULL | Kolom legacy; pengajuan baru selalu NULL |
| is_overdue | BOOLEAN | DEFAULT false | Saat daftar dimuat, true bila deadline approval pending pada step aktif terlewati; surat terminal dan step sebelumnya tidak dihitung |
| expires_at | TIMESTAMP | NULL | Dihitung saat `status = 'approved'` + `validity_days`. NULL = tidak expire |
| status | ENUM | NOT NULL, DEFAULT 'pending' | `pending` \| `in_progress` \| `approved` \| `rejected` |
| flow_id | BIGINT | FK → approval_flows.id, NOT NULL | **Snapshot** dari `letter_types.flow_id` saat submit, dikunci |
| current_step_order | INT | NOT NULL, DEFAULT 1 | Step aktif, dicocokkan ke `flow_steps`; **0 = menunggu tanda tangan pihak terkait** |
| rejected_at_step | INT | NULL | Step tempat surat direject, untuk histori/laporan |
| submitted_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| processed_at | TIMESTAMP | NULL | Waktu terakhir diproses (approver manapun di step manapun) |
| snapshot | JSON | NULL | Konteks render yang dibekukan saat final approve: `captured_at`, `template`, `supporting_template`, `submitted_at`, `issued_at`, `form_fields`, `applicant{gender, birth_place_date, resident_phrase}`, `village{name, address, phone, district, regency, province, postal_code, email, stamp_img}`, `signer{official_id, village_id, name, signature_img}` |
| signed_by_official_id | BIGINT | FK → officials.id, NULL, ON DELETE SET NULL | Kepala Desa yang TTD-nya dibekukan (juga bila Sekdes yang menyetujui) |
| fulfilled_at | TIMESTAMP | NULL | Waktu perubahan data kependudukan diterapkan |
| fulfilled_by | UUID | FK → users.id, NULL, ON DELETE SET NULL | Aktor Terapkan |
| fulfillment | JSON | NULL | Hasil Terapkan `{action, citizen_id, changes{kolom:{old,new}}}`; NIK disamarkan |
| created_at, updated_at | TIMESTAMP | NULL | |

> FK `signed_by_official_id` dan `fulfilled_by` hanya dipasang pada driver selain SQLite (test).

**Semantik `letters.status`:**
- `pending`: surat baru tersimpan dan belum ada keputusan approver, termasuk saat menunggu tanda tangan (`current_step_order = 0`), saat ditahan karena RT kosong, atau ketika tahap awal dilewati karena pemohon sendiri satu-satunya approver eligible
- `in_progress`: minimal 1 step approve, belum sampai step `is_final=true`
- `approved`: step `is_final=true` sudah di-approve → trigger `letter_number` + `expires_at`
- `rejected`: TERMINAL — ada satu step yang reject, `rejected_at_step` dicatat

**Tabel: letter_number_counters**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, auto increment | Kunci internal |
| village_id | UUID | FK → villages.id | Desa penerbit |
| letter_type_id | BIGINT | FK → letter_types.id, NULL | Hanya terisi pada baris lama (format nomor per jenis surat); baris baru NULL |
| classification_code | VARCHAR(10) | NULL | Kode klasifikasi (baris baru) |
| year | SMALLINT | NOT NULL | Tahun urutan nomor |
| last_number | UNSIGNED INT | DEFAULT 0 | Nilai sequence terakhir |
| created_at, updated_at | TIMESTAMP | NULL | |

Unique `uq_letter_counters_classification (village_id, classification_code, year)`; unique lama `(village_id, letter_type_id, year)` sudah di-drop. Format nomor: `{classification_code}/{NNN}/Des/{bulan Romawi}/{tahun}`, mis. `470/001/Des/X/2026`.

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
| reason | TEXT | NULL | Catatan keputusan approver, atau alasan sistem: `Permohonan surat dibuat`, `Menunggu tanda tangan pihak terkait`, `Surat ditahan: tahap RT belum memiliki pejabat aktif`, `Tahap RT dilewati: pemohon adalah pejabat pada tahap tersebut`, `Perubahan data kependudukan diterapkan` |
| ip_address | VARCHAR(45) | NULL | Diisi otomatis dari `request()->ip()` oleh hook model saat create |
| user_agent | TEXT | NULL | Diisi otomatis dari user agent request |
| created_at, updated_at | TIMESTAMP | NULL | |

**Tabel: letter_attachments**

Berkas surat di disk privat `private_uploads` (`letter-attachments/{village_id}/{letter_id}/`).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK | |
| letter_id | UUID | FK → letters.id, ON DELETE CASCADE | |
| kind | VARCHAR(30) | DEFAULT 'attachment' | `field` (isian bertipe file), `wet_signature` (foto dokumen ber-TTD basah), `attachment` (lampiran umum) |
| field | VARCHAR(100) | NULL | Nama isian atau `slot_key` |
| original_name | VARCHAR(255) | NOT NULL | |
| path | VARCHAR(255) | NOT NULL | |
| mime_type | VARCHAR(100) | NOT NULL | |
| size | UNSIGNED INT | NOT NULL | Byte |
| uploaded_by | UUID | FK → users.id, NULL, ON DELETE SET NULL | |
| created_at, updated_at | TIMESTAMP | NULL | |

Index `idx_attachments_letter_kind (letter_id, kind)`.

**Tabel: user_signatures**

Tanda tangan pribadi per akun (warga maupun pejabat), terpisah dari TTD jabatan di `officials.signature_img`. Berkas dienkripsi di disk privat `user-signatures/{user_id}/{uuid}.enc`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK | |
| user_id | UUID | FK → users.id, ON DELETE CASCADE | |
| path | VARCHAR(255) | NOT NULL | |
| mime_type | VARCHAR(50) | NOT NULL | |
| revoked_at | TIMESTAMP | NULL | Diisi saat Petugas Desa mereset; NULL = aktif |
| revoked_by | UUID | FK → users.id, NULL, ON DELETE SET NULL | |
| revoke_reason | TEXT | NULL | |
| created_at, updated_at | TIMESTAMP | NULL | |

Index `idx_user_signatures_active (user_id, revoked_at)`. Hanya satu TTD aktif per akun (dijaga service); baris lama dipertahankan agar dokumen lama tetap dapat dirender.

**Tabel: letter_signatures**

Satu baris per percobaan mengisi slot tanda tangan surat; baris terbaru per `(letter_id, slot_key)` adalah keadaan slot.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK | |
| letter_id | UUID | FK → letters.id, ON DELETE CASCADE | |
| slot_key | VARCHAR(50) | NOT NULL | Sesuai `letter_types.signature_slots[].key` |
| slot_label | VARCHAR(100) | NOT NULL | |
| signer_type | VARCHAR(20) | NOT NULL | `applicant` \| `other` |
| method | VARCHAR(20) | NOT NULL | `digital` \| `wet` |
| status | VARCHAR(20) | DEFAULT 'pending' | `pending` \| `signed` \| `rejected` \| `expired` \| `cancelled` |
| requested_by | UUID | FK → users.id, ON DELETE CASCADE | Pemohon |
| target_nik_hash | VARCHAR(64) | NULL | SHA-256 NIK yang diminta (TTD digital pihak lain) |
| signer_user_id | UUID | FK → users.id, NULL, ON DELETE SET NULL | |
| signer_name | VARCHAR(100) | NULL | |
| user_signature_id | BIGINT | FK → user_signatures.id, NULL, ON DELETE SET NULL | TTD digital yang dibubuhkan |
| attachment_id | BIGINT | FK → letter_attachments.id, NULL, ON DELETE SET NULL | Foto TTD basah |
| expires_at | TIMESTAMP | NULL | Batas permintaan (`LETTER_SIGNATURE_REQUEST_TTL_DAYS`, default 7 hari) |
| responded_at | TIMESTAMP | NULL | |
| response_notes | TEXT | NULL | Catatan penolakan |
| created_at, updated_at | TIMESTAMP | NULL | |

Index: `idx_letter_signatures_slot (letter_id, slot_key)`, `idx_letter_signatures_target (target_nik_hash, status)`, `idx_letter_signatures_pair (requested_by, target_nik_hash, status)` (pembatasan penolakan berulang).

**Tabel: signature_blocks**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK | |
| user_id | UUID | FK → users.id, ON DELETE CASCADE | Pemilik NIK yang memblokir |
| blocked_user_id | UUID | FK → users.id, ON DELETE CASCADE | Pemohon yang diblokir |
| created_at, updated_at | TIMESTAMP | NULL | |

Unique `uq_signature_blocks_pair (user_id, blocked_user_id)`.

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

Slot jabatan tetap per organisasi non-struktural: setiap organisasi punya tepat tiga baris (Ketua, Wakil Ketua, Anggota), dibuat otomatis oleh `VillageOrgPositionRepository::ensureSlots()` (saat daftar dibuka atau lewat `VillageOrgPositionSeeder`) dan tidak dapat dibuat/diubah/dihapus lewat API.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| village_id | UUID | FK → villages.id, NOT NULL | |
| org_type | ENUM | NOT NULL | `bpd` \| `bumdes` \| `lpm` \| `karang_taruna` \| `pkk`. UI mengelola `bpd`, `lpm`, `karang_taruna`, `pkk` |
| slot | ENUM | NOT NULL | `ketua` \| `wakil_ketua` \| `anggota` |
| position_label | VARCHAR(100) | NOT NULL | Diisi dari slot: Ketua / Wakil Ketua / Anggota |
| is_single_occupant | BOOLEAN | DEFAULT true | true untuk `ketua` dan `wakil_ketua` (rotasi), false untuk `anggota` |
| sort_order | INT | DEFAULT 0 | 0, 1, 2 sesuai slot |
| is_active | BOOLEAN | DEFAULT true | false = rotasi dimatikan untuk slot tsb |
| created_at, updated_at | TIMESTAMP | NULL | |

Index: `UNIQUE (village_id, org_type, slot)`.

**Tabel: village_org_members**

History pemegang jabatan organisasi non-struktural.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK, AUTO INCREMENT | Primary key |
| position_id | BIGINT | FK → village_org_positions.id, NOT NULL | |
| member_name | VARCHAR(150) | NOT NULL | |
| photo_img | VARCHAR(255) | NULL | Path foto di disk public (`org-member-photos/{village_id}/...`), diatur lewat endpoint foto anggota. Promosi/turun jabatan menyalin path ke baris baru, sehingga satu berkas dapat dipakai beberapa baris; berkas hanya dihapus bila tidak dipakai baris lain |
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
| thumbnail | VARCHAR(255) | NULL | Path di disk public |
| is_published | BOOLEAN | DEFAULT false | |
| published_at | TIMESTAMP | NULL | NULL jika masih draft |
| created_at, updated_at | TIMESTAMP | NULL | |
| deleted_at | TIMESTAMP | NULL | Soft delete |

Index `idx_news_village_published (village_id, is_published, published_at)`.

**Tabel: news_categories**

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK | |
| village_id | UUID | FK → villages.id, ON DELETE CASCADE | |
| name | VARCHAR(50) | NOT NULL | |
| slug | VARCHAR(60) | NOT NULL, `UNIQUE(village_id, slug)` | Dibuat dari nama; nama yang slug-nya bentrok ditolak |
| created_at, updated_at | TIMESTAMP | NULL | |

Seeder `NewsCategorySeeder`: Umum, Pengumuman, Infrastruktur, Pendidikan, Kesehatan, Lingkungan, Budaya, Kegiatan Warga.

**Tabel: news_category_news** (pivot)

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| news_id | BIGINT | FK → news.id, ON DELETE CASCADE | |
| news_category_id | BIGINT | FK → news_categories.id, ON DELETE RESTRICT | Kategori yang pernah dipakai (termasuk oleh berita soft-deleted) tidak dapat dihapus |

PK `(news_id, news_category_id)`. Satu berita wajib 1–2 kategori (dijaga Form Request).

---

**Tabel operasional: push_subscriptions**

Dibuat migration package `laravel-notification-channels/webpush` (dimodifikasi untuk UUID).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| id | BIGINT | PK | |
| subscribable_type, subscribable_id | VARCHAR, UUID | `uuidMorphs`, index `push_subscriptions_subscribable_morph_idx` | Pemilik (User) |
| endpoint | VARCHAR(1024) ASCII | UNIQUE | Endpoint layanan push browser |
| public_key | VARCHAR(255) | NULL | `keys.p256dh` |
| auth_token | VARCHAR(255) | NULL | `keys.auth` |
| content_encoding | VARCHAR(255) | NULL | `aesgcm` \| `aes128gcm` |
| created_at, updated_at | TIMESTAMP | NULL | |

---

**Tabel operasional: activity_log**

Dibuat oleh package `spatie/laravel-activitylog`; bukan bagian dari 29 tabel domain inti. Migration aplikasi menambahkan `event` dan `batch_uuid` ke skema package.

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

Ada **29 tabel domain inti** dan **3 tabel operasional** (`letter_number_counters`, `activity_log`, `push_subscriptions`), total **32 tabel aplikasi non-framework**. Tabel framework Laravel (`cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `sessions`, `password_reset_tokens`, `personal_access_tokens`) tidak dihitung.

```
Wilayah (4): villages, hamlets, rws, rts
Pengguna & Jabatan (4): users, citizens, officials, official_position_types
Data Keluarga & Sosio-Ekonomi (2): families, family_socioeconomics
Organisasi Non-Struktural (2): village_org_positions, village_org_members
Alur Approval (2): approval_flows, flow_steps
Surat (6): letter_types, letters, letter_approvals, letter_status_logs,
           letter_attachments, letter_signatures
Tanda Tangan Akun (2): user_signatures, signature_blocks
Konfigurasi (1): approval_settings
Konten & Komunikasi (5): notifications, news, news_categories,
                         news_category_news, village_regulations
Referensi (1): occupations

Total domain inti: 4 + 4 + 2 + 2 + 2 + 6 + 2 + 1 + 5 + 1 = 29 tabel
Operasional: letter_number_counters, activity_log, push_subscriptions (3 tabel)
Total aplikasi non-framework: 32 tabel
Di-drop: letter_categories (v5.3)
```

Tabel yang di-hold (detail di `TDD-06_Appendix.md`): `village_assets`, `village_finances`, `letter_hashes`, `letter_type_fields`, `letter_field_values`, `citizen_aid_eligibility`, `citizen_aid_history`, `aid_programs`. Kebutuhan "isian form dinamis" kini dipenuhi kolom JSON `letter_types.form_fields` + `letters.payload`, bukan tabel `letter_type_fields`/`letter_field_values`.

---

## 4. Indexing Strategy

Status: ✅ Aktif = ada di migration; 📋 Planned = rencana, belum di migration. Migration `2026_10_11_090600_add_performance_indexes` menambahkan index untuk kolom FK yang dipakai filter scope wilayah, pengurutan, dan eager-load (PostgreSQL tidak membuat index FK otomatis).

**Index Tabel `letters`**

| Index | Kolom | Status | Alasan |
|---|---|---|---|
| idx_letters_status | status | ✅ Aktif | Filter status |
| idx_letters_village_status | (village_id, status) | ✅ Aktif | Ringkasan surat desa per status |
| idx_letters_flow_step | (flow_id, current_step_order) | ✅ Aktif | Resolve step aktif, paling kritis |
| idx_letters_overdue | is_overdue | ✅ Aktif | Filter overdue |
| (auto) | applicant_nik_hash | ✅ Aktif | Pencarian NIK pemohon |
| (auto unique) | letter_number | ✅ Aktif | Nomor surat unik |
| idx_letters_submitter_created | (submitted_by, created_at) | ✅ Aktif (performa) | Daftar "surat saya" terbaru |
| idx_letters_citizen | citizen_id | ✅ Aktif (performa) | Join ke citizens (scope wilayah) |
| idx_letters_type | letter_type_id | ✅ Aktif (performa) | Filter/agregasi per jenis surat |
| idx_letters_village_submitted | (village_id, submitted_at) | ✅ Aktif (performa) | Laporan & ringkasan per periode |
| idx_letters_village_created | (village_id, created_at) | ✅ Aktif (performa) | Daftar terbaru per desa |
| idx_letters_on_behalf | on_behalf_of | 📋 Planned | Kolom selalu NULL di MVP |

**Index Tabel `letter_status_logs`**

| Index | Kolom | Status |
|---|---|---|
| idx_logs_letter | letter_id | ✅ Aktif |
| idx_logs_created | created_at | ✅ Aktif |

**Index Tabel `letter_approvals`**

| Index | Kolom | Status | Alasan |
|---|---|---|---|
| idx_approvals_letter | letter_id | ✅ Aktif | Semua approval satu surat |
| idx_approvals_deadline | deadline_at | ✅ Aktif | Lookup deadline (reminder otomatis belum ada) |
| idx_approvals_level | (letter_id, approval_level) | ✅ Aktif | Cek keputusan level tertentu |
| idx_approvals_flow_step | flow_step_id | ✅ Aktif (performa) | Cocokkan approval pending ke step |

**Index tabel surat baru**

| Tabel | Index | Kolom | Status |
|---|---|---|---|
| letter_attachments | idx_attachments_letter_kind | (letter_id, kind) | ✅ Aktif |
| letter_signatures | idx_letter_signatures_slot | (letter_id, slot_key) | ✅ Aktif |
| letter_signatures | idx_letter_signatures_target | (target_nik_hash, status) | ✅ Aktif |
| letter_signatures | idx_letter_signatures_pair | (requested_by, target_nik_hash, status) | ✅ Aktif |
| user_signatures | idx_user_signatures_active | (user_id, revoked_at) | ✅ Aktif |
| signature_blocks | uq_signature_blocks_pair | (user_id, blocked_user_id) UNIQUE | ✅ Aktif |
| letter_number_counters | uq_letter_counters_classification | (village_id, classification_code, year) UNIQUE | ✅ Aktif |

**Index Tabel `citizens`**

| Index | Kolom | Status | Alasan |
|---|---|---|---|
| (auto unique) | nik_hash | ✅ Aktif | Validasi & pencarian NIK |
| idx_citizens_village_active | (village_id, is_active) | ✅ Aktif (performa) | Daftar & jumlah warga aktif per desa |
| idx_citizens_rt | rt_id | ✅ Aktif (performa) | Scope RT, filter daftar warga |
| idx_citizens_hamlet | hamlet_id | ✅ Aktif (performa) | Scope Kadus |
| idx_citizens_family | family_id | ✅ Aktif (performa) | Anggota KK |
| idx_citizens_name | name | 📋 Planned | Pencarian nama (saat ini `LOWER(name) LIKE`) |
| idx_citizens_residency | residency_type | 📋 Planned | |
| idx_citizens_father / idx_citizens_mother | father_id / mother_id | 📋 Planned | Pohon keluarga |

**Index Tabel `officials`**

| Index | Kolom | Status |
|---|---|---|
| idx_officials_term | (is_active, term_ends_at) | ✅ Aktif |
| idx_officials_user | user_id | ✅ Aktif (performa) |
| idx_officials_citizen | citizen_id | ✅ Aktif (performa) |
| idx_officials_village_position | (village_id, position, is_active) | ✅ Aktif (performa) |
| idx_officials_rt | rt_id | ✅ Aktif (performa) |
| idx_officials_rw / idx_officials_hamlet | rw_id / hamlet_id | 📋 Planned |

**Index tabel wilayah, akun, keluarga, konten**

| Tabel | Index | Kolom | Status |
|---|---|---|---|
| rws | idx_rws_village | village_id | ✅ Aktif |
| rws | idx_rws_hamlet | hamlet_id | ✅ Aktif (performa) |
| rts | idx_rts_village | village_id | ✅ Aktif |
| rts | idx_rts_rw | rw_id | ✅ Aktif (performa) |
| rts | idx_rts_active | is_active | 📋 Planned |
| hamlets | (unique) | (village_id, code) | ✅ Aktif |
| users | idx_users_village | village_id | ✅ Aktif (performa) |
| users | idx_users_citizen | citizen_id | ✅ Aktif (performa) |
| families | (auto unique) | no_kk_hash | ✅ Aktif |
| families | idx_families_village | village_id | ✅ Aktif (performa) |
| families | idx_families_rt | rt_id | ✅ Aktif (performa) |
| family_socioeconomics | (auto unique) | family_id | ✅ Aktif |
| occupations | occupations_village_name_ci_unique | (village_id, LOWER(name)) | ✅ Aktif |
| official_position_types | (unique) | (village_id, code) | ✅ Aktif |
| news | (unique) | slug | ✅ Aktif |
| news | idx_news_village_published | (village_id, is_published, published_at) | ✅ Aktif (performa) |
| news_categories | (unique) | (village_id, slug) | ✅ Aktif |
| notifications | (auto) | (notifiable_type, notifiable_id) | ✅ Aktif |
| notifications | idx_notif_read_at | read_at | 📋 Planned |
| push_subscriptions | morph index + unique endpoint | subscribable, endpoint | ✅ Aktif |

**Index pipeline**

| Tabel | Index | Kolom | Status |
|---|---|---|---|
| flow_steps | (auto unique) | (flow_id, step_order) | ✅ Aktif |
| flow_steps | idx_flowsteps_position | approver_position | ✅ Aktif |
| letter_types | (unique) | (village_id, code) | ✅ Aktif |

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
| (berkas) user_signatures | isi file TTD | `Crypt::encryptString` sebelum ditulis ke disk privat (`.enc`) |
| letter_signatures | target_nik_hash | SHA-256 NIK target permintaan TTD (NIK plaintext tidak disimpan) |

Berkas privat lain (stempel desa, TTD jabatan Kades, lampiran surat) disimpan tidak terenkripsi di disk `private_uploads` (`storage/app/private`) dan hanya dilayani lewat endpoint terautentikasi. `letters.snapshot` menyimpan path gambar dan nama, bukan NIK.

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
