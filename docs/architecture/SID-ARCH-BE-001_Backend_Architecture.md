# ARSITEKTUR BACKEND
## SIDUTama (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-BE-001 |
| Status | Berlaku (Aktif) - Versi 1.3 — v5.3 Surat dinamis, tanda tangan, identitas desa |
| Audiens | Backend Developer, Reviewer, Tech Lead, QA Coordinator |
| Sifat Dokumen | Keputusan struktural & alasan di baliknya, diselaraskan ke source `apps/backend` per 2026-10-16. Aturan penulisan kode ada di `DEV-CODE-001`. Skema tabel lengkap ada di `TDD-03_Database_Schema.md`. |
| Dokumen Induk | `SID-ARCH-SYS-001` (System Architecture) |

> Bila dokumen ini berbeda dengan source, source yang berlaku. Hal yang pernah didokumentasikan tetapi belum ada di source dicatat di `docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md`.

---

## 1. Tech Stack

| Layer | Teknologi (dari `composer.json`/config) | Catatan |
|---|---|---|
| Runtime | PHP ^8.3 | Image Docker `sid-api` menjalankan PHP-FPM |
| Framework | Laravel ^13.8 (REST API murni) | Satu-satunya view adalah template PDF (`resources/views/pdf/templates/{wet,digital}.blade.php`) |
| Autentikasi | Laravel Sanctum ^4 (SPA cookie-based) | `EnsureFrontendRequestsAreStateful` di depan grup API |
| Otorisasi | Middleware `role:` (`EnsureUserHasRole`) + Laravel Policy | Tanpa package RBAC pihak ketiga |
| Database | PostgreSQL (`DB_CONNECTION=pgsql`); stack Docker memakai `postgres:18.6` atau Neon | SQLite dipakai test |
| ORM | Eloquent | Enkripsi field via `$casts` |
| Queue | Driver `database` (dev) / `sync` (stack Docker expo) | Hanya kanal Web Push yang diantrekan |
| Cache & Session | Driver `database` | Cache dipakai halaman publik (`PublicPageCache`) |
| PDF | `barryvdh/laravel-dompdf` ^3.1 | On-demand; surat approved dari snapshot (S6) |
| Import Excel | `maatwebsite/excel` ^4 | Import warga |
| Audit Trail | `spatie/laravel-activitylog` ^4.12 + `letter_status_logs` | S8 |
| Web Push | `laravel-notification-channels/webpush` ^13 | VAPID; tabel `push_subscriptions` |
| Hashing password | Argon2id (`HASH_DRIVER=argon2id`) | |
| Lint/format | Laravel Pint | |
| Test | PHPUnit ^12.5 | Feature + Unit |

Laravel Telescope **tidak** terpasang (lihat audit docs).

### Inventaris komponen (source)

| Lapisan | Komponen |
|---|---|
| Controller API (`app/Http/Controllers/Api`) | ApprovalFlow, ApprovalSetting, Citizen, CurrentUser, Dashboard, Family, FamilySocioeconomic, Hamlet, KadesApproval, LetterAttachment, Letter, LetterDownload, LetterFulfillment, LetterSignature, LetterType, NewsCategory, News, Notification, Occupation, Official, OfficialPositionType, Profile, PublicPage, PushSubscription, Regulation, RtApproval, Rt, Rw, SignatureRequest, User, VillageOrgMember, VillageOrgPosition, VillageProfile |
| Service domain surat | `LetterService`, `LetterFlowService`, `RtApprovalService`, `KadesApprovalService`, `LetterNumberGenerator`, `LetterSnapshotService`, `PdfService`, `LetterAttachmentService`, `LetterSignatureService`, `LetterFulfillmentService`, `LetterTypeService`, `ApprovalFlowService`, `ApprovalSettingService` |
| Service domain lain | `CitizenService`, `FamilyService`, `FamilySocioeconomicService`, `OccupationService`, `OfficialService`, `OfficialAssignmentService`, `OfficialPositionTypeService`, `UserService`, `ProfileService`, `Auth\AuthService`, `Auth\UsernameGenerator`, `HamletService`, `RtService`, `RwService`, `NewsService`, `NewsCategoryService`, `RegulationService`, `VillageProfileService`, `PublicPageService`, `DashboardService`, `NotificationService`, `PushSubscriptionService`, `VillageOrgPositionService`, `VillageOrgMemberService` |
| Support | `LetterFormSchema` (aturan validasi dari `form_fields`), `LetterValueFormatter` (format nilai isian di PDF), `OfficialPositionCatalog` (label jabatan), `PublicPageCache`, `VillageImageOptimizer` |
| Policy | `LetterPolicy` (view, create, download, fulfill, delete), `OfficialPolicy`, `RegionPolicy` |
| Middleware | `account.active`, `password.changed`, `role`, `verified` |
| Rule | `ValidOfficialPosition` |
| Notifikasi | `LetterStatusNotification` (kanal database + WebPush) |
| Console | `staf-sid:first`, `letters:backfill-snapshots` |
| Enum | `UserRole` (9), `OfficialPosition` (8 jabatan berakun), `LetterStatus`, `LetterDataAction`, `LetterFlowLogReason`, `ApprovalLevel`, `AssignedRole`, enum kependudukan |

---

## 2. Pola Arsitektur & Alur Data

```
Controller → Form Request → Service → Repository → Eloquent Model → DB
                               │
                               ├─ Policy (otorisasi per resource)
                               ├─ Support (LetterFormSchema, PublicPageCache, ...)
                               └─ Notification (database sinkron + WebPush via queue)
```

- **Controller** hanya urusan HTTP; memanggil `$this->authorize()` bila ada Policy.
- **Form Request** validasi input. `StoreLetterRequest` membangun aturan secara dinamis dari `letter_types.form_fields` milik desa pemohon (`LetterFormSchema`).
- **Service** satu-satunya tempat `DB::transaction()`, aturan bisnis, dan pengiriman notifikasi. Keputusan approval mengunci baris surat (`lockForUpdate`) lalu memeriksa ulang status/step.
- **Repository** membungkus query yang dipakai lintas service (scope daftar surat, resolve pejabat, counter nomor surat).
- **Tidak ada Event/Listener/Job aplikasi.** Notifikasi dikirim langsung dari service; `LetterStatusNotification` memakai `afterCommit()` sehingga baru terkirim setelah transaksi commit.
- `Model::preventLazyLoading()` aktif: gagal keras di test, hanya dicatat (warning) di lingkungan lain.

### Penanganan error & bahasa pesan

Locale aplikasi `id` (`APP_LOCALE`, `APP_FALLBACK_LOCALE`; `APP_FAKER_LOCALE=id_ID`), lihat `docs/SETUP.md`. Request `api/*` atau yang mengharapkan JSON selalu dirender sebagai JSON (`bootstrap/app.php`, `withExceptions`).

- **Validasi (422):** pesan dari `lang/id/validation.php`, dengan nama field diterjemahkan lewat `attributes` (mis. `date_of_birth` → "tanggal lahir"), jadi pesan tidak menyebut nama kolom mentah. `message` berisi pesan error pertama, ditambah "(dan :count kesalahan lainnya)" bila ada lebih dari satu (`lang/id.json`); `errors` memuat semua pesan per field. Pesan kustom di `messages()` Form Request tetap dipakai.
- **Exception domain** (`RegionHasActiveCitizensException`, `RegionContainsCitizensException`, `OccupationInUseException`) dirender dengan pesan dan status code miliknya sendiri.
- **Exception bawaan framework** diganti pesan Indonesia oleh `App\Support\ApiExceptionMessages`:

| Status | Pesan |
|---|---|
| 401 | Sesi Anda telah berakhir. Silakan masuk kembali. |
| 403 | Anda tidak memiliki akses untuk aksi ini. |
| 404 | Data tidak ditemukan. |
| 405 | Metode permintaan tidak didukung. |
| 413 | Ukuran data yang dikirim terlalu besar. |
| 419 | Sesi keamanan kedaluwarsa. Muat ulang halaman lalu coba lagi. |
| 429 | Terlalu banyak percobaan. Silakan coba lagi nanti. |
| 500 (dan 5xx lain) | Terjadi kesalahan pada server. Silakan coba lagi beberapa saat. |
| 503 | Layanan sedang tidak tersedia. Silakan coba lagi beberapa saat. |

  Penggantian hanya terjadi bila pesannya kosong atau masih pesan bawaan Inggris ("Unauthenticated.", "This action is unauthorized.", "No query results for model ...", "CSRF token mismatch.", dst.). Pesan kustom dari `abort()` atau Policy (mis. `abort(404, 'Data pejabat tidak ditemukan.')`) tetap dipakai apa adanya. Untuk 5xx: dengan `APP_DEBUG=false` pesan selalu diganti; dengan `APP_DEBUG=true` error tak terduga dirender bawaan Laravel (detail debug) dan pesan kustom 5xx tidak diganti.

---

## 3. Domain Surat: Jenis Surat Data-Driven & Pipeline Approval

### 3.1 Jenis surat (`letter_types`) diset developer lewat seeder

Konfigurasi tiap jenis surat adalah data, bukan kode:

| Kolom | Fungsi |
|---|---|
| `template` | HTML dengan placeholder `{{ nama }}`; NULL = draft |
| `category` | `persuratan` (Persuratan Desa, Axx) / `pelayanan` (Layanan Kependudukan, Fxx); mengelompokkan pilihan jenis surat saat pengajuan (Persuratan di atas). Tidak dapat diubah Staf SIDUTama |
| `form_fields` (JSON) | Definisi isian: `name`, `label`, `type` (text, textarea, date, time, number, nik, select, file, occupation, repeater, family_members, family_member — satu anggota KK, village_area — Dusun -> RW -> RT dari `GET /village-areas`, disimpan dengan label siap cetak), `required`, `options`, `accept`, `visible_when`, `from_nik` (nama/No. KK/pekerjaan/alamat diisi dari NIK warga desa lewat `from_nik_value`: `name`, `family_number`, `occupation`, `address`, `marital_status`, `gender`, `place_of_birth`, `date_of_birth`, `mother_name`/`mother_nik`, `father_name`/`father_nik`), `default` (nilai bawaan bila tidak dijawab, juga nilai awal di form), `self_when` (isian NIK milik pemohon sendiri bila syaratnya terpenuhi; diisi NIK pemohon saat pengajuan). Isian `family_member` dapat dibatasi `gender`, `roles` (hubungan dalam KK, mis. hanya anak/cucu/famili lain), dan `older_than` ({field, years}: minimal sekian tahun lebih tua dari anggota/tanggal acuan, mis. ibu minimal 10 tahun lebih tua dari anaknya). Pilihan SHDK ber-`role_of` (acuan pemilik hubungan: isian family_member, kolom baris repeater, NIK warga desa, isian jenis kelamin L/P, atau `family_head`) menolak Suami bagi perempuan dan Istri bagi laki-laki; di form, pilihan yang tidak cocok disembunyikan bila jenis kelaminnya diketahui (dipakai F01, F04, F09). Isian `same_value` ([a, b]) diisi sistem saat pengajuan (`ya` bila kedua isian sama, mis. No. KK suami = istri) dan tidak ditanyakan. Hubungan dalam KK (`citizens.family_role`, `FamilyRole`) memakai 11 SHDK resmi Disdukcapil. Isian tanggal dengan `date_order` ([{after|before, label}]) tidak boleh sebelum/sesudah acuannya: isian tanggal lain, atau `birth:<isian>` = tanggal lahir orang di isian itu (anggota KK, warga desa ber-NIK, pemohon sendiri, atau tanggal lahir yang diketik; alternatif dipisah `|`), mis. perkawinan/kelahiran anak/kematian tidak sebelum orang yang bersangkutan lahir, putusan cerai tidak sebelum akta perkawinan; acuan yang tidak diketahui dilewati. Isian NIK saksi (`witness`) ditolak bila NIK-nya milik pemohon atau sama dengan isian di `not_same_as` (saksi lainnya, pihak dalam surat seperti suami/istri); `GET /profile/nik-lookup` mengembalikan `is_self` agar form langsung memperingatkan. Divalidasi di server; isian tak dikenal ditolak. `visible_when` (`FieldCondition`) menyembunyikan isian menurut jawaban lain: tidak wajib, di-`exclude` dari validasi, dibuang sebelum disimpan (`LetterFormSchema::visiblePayload`). Template boleh memakai blok `{{#if isian=a|b}}…{{/if}}` (`TemplateConditionals`). Isian berulang: `repeater` (baris dengan sub-isian `fields`, `min`/`max`, sub-isian bersyarat per baris) dan `family_members` (anggota KK pemohon dari `GET /profile/family-members`, divalidasi terhadap KK pemohon, disimpan sebagai baris siap cetak); dicetak lewat `{{#each isian}}…{{/each}}` (`TemplateLoops`) |
| `classification_code` | Kode klasifikasi nomor surat (default `470`) |
| `data_action`, `data_fields`, `data_subject_field`, `data_instructions`, `data_options` | Aksi data pasca-approve (kolom `data_fields` boleh ber-`when` = hanya diusulkan bila syaratnya cocok dengan jawaban form, mis. F07 Kawin vs Kawin Belum Tercatat): `none`, `update_citizen`, `create_citizen` (S3.6; `data_options.family`: `join` = masuk KK desa ber-No. KK dari isian, `create` = KK baru dengan No. KK diisi Kasi dan warga sebagai kepala keluarga, tanpa opsi = KK pemohon; RT dari isian wilayah menurunkan dusun dan alamat), `deactivate_members` (nonaktifkan anggota KK pilihan pemohon, `data_subject_field` = isian family_members; `data_options.new_head` = isian family_member yang menjadi kepala keluarga baru), `update_members` (ubah kolom tiap anggota KK, satu baris repeater per anggota; pekerjaan "Lainnya" dipilih dari katalog saat Terapkan), `restructure_family` (F09, `data_options.restructure`: KK baru dari baris anggota + pasangan dari KK lain dengan No. KK diisi Kasi, ganti kepala keluarga dengan SHDK baru kepala lama, atau anggota masuk ke KK lain di desa; anggota yang pindah KK ikut wilayah & alamat KK tujuannya; KK baru karena membentuk keluarga baru (`new_family.married`) sekalian mengubah status kawin kepala keluarga dan suami/istri menjadi Kawin; `data_options.new_head` = kepala baru KK lama), `adopt_child` (F10, `data_options.adopt` {nik, role}: anak angkat warga desa dipindah ke KK pemohon dengan wilayah/alamatnya dan SHDK pilihan pemohon, data ayah/ibu kandung tetap, kepala KK asal yang punya akun diberi tahu lewat `FamilyMemberMovedNotification` setelah commit; anak yang belum terdata berjalan sebagai `create_citizen` ke KK pemohon dengan NIK diisi Kasi), `update_citizens` (ubah kolom warga desa ber-NIK isian `data_options.subjects`, nilai boleh diterjemahkan lewat `map` di `data_fields`; yang tidak terdata dilewati), `manual` (Kasi/Kaur mengubah data sendiri lalu Tandai selesai, petunjuk di `data_instructions`). Sebelum Terapkan, `POST /letters/{id}/fulfillment/preview` menjalankan Terapkan di transaksi yang dibatalkan dan mengembalikan daftar perubahan per warga (lama -> baru, nilai mudah dibaca) untuk pop up konfirmasi; pilihan koreksi berlabel per kolom dikirim di `fields[].options`. Di frontend, setelah Kasi/Kaur menerima hasil instansi, Terapkan langsung dimulai (pop up perubahan) kecuali masih ada NIK/No. KK baru yang harus diisi |
| `supporting_template` | Template dokumen pendukung (mis. surat pernyataan) |
| `documents` (JSON) | Dokumen yang terbit bersama dokumen utama `[{key, title, template, when?}]`; `when` dievaluasi `FieldCondition` terhadap jawaban form, daftar dihitung `LetterDocuments`, diunduh/dipratinjau lewat `?document={key}`, dan dibekukan di snapshot |
| `produces_letter` | Penanda; saat ini hanya dikirim ke frontend |
| `requires_result_upload`, `result_upload_hint` | Formulir pelayanan bersambung setelah terbit: pemohon mengunggah hasil dari instansi (`POST /letters/{id}/results`), Kasi/Kaur memverifikasi (`PATCH /letters/{id}/results/{result}`); `LetterResultService`, tahap `Letter::resultStage()`. Terapkan menunggu hasil diterima |
| `issues_letter_number`, `signed_by_village_head` | `false` untuk formulir instansi luar (Layanan Kependudukan): tanpa nomor surat desa dan tanpa pengesahan TTD + stempel Kepala Desa, render tidak butuh Kepala Desa aktif. Penanda tangan yang tercantum di formulir tetap ditempeli TTD-nya saat surat final (lihat 3.4) |
| `assigned_role` | Kasi/Kaur yang mengakses surat selesai dan menjalankan Terapkan; mengikuti `category` (Persuratan Desa = Kaur TU & Umum, Layanan Kependudukan = Kasi Pemerintahan, `LetterTypeCategory::handlerRole`); NULL = keduanya (hanya lewat seeder) |
| `validity_days`, `is_active`, `category` | Satu-satunya yang dapat diubah Staf SIDUTama (`PUT /letter-types/{id}`); mengubah `category` memindahkan kelompok jenis surat di pilihan pengajuan dan mengganti `assigned_role` sesuai kategorinya |

Seeder membuat 11 surat keterangan desa (A01–A11, `LetterTypeSeeder`; A01–A10 kategori Persuratan Desa untuk Kaur TU & Umum, A11 Ahli Waris kategori Layanan Kependudukan untuk Kasi Pemerintahan, tetap bernomor dan ber-TTD Kepala Desa tanpa unggah hasil) dan formulir Layanan Kependudukan (`ServiceLetterTypeSeeder`: F01 Surat Pernyataan Tidak Memiliki Dokumen Kependudukan / F-1.04 + F-1.02 (perubahan KK: menumpang dalam KK, lampiran KK lama) + F-1.01 susunan KK pemohon ditambah orang tersebut (`family_roster.append`, SHDK dari isian; isian pilihan seperti pendidikan dan golongan darah dicetak dengan labelnya), aksi `create_citizen` (masuk KK pemohon dengan hubungan dari isian, NIK diisi Kasi dari dokumen terbitan); F02 Perubahan Elemen Data / F-1.06 + F-1.02, dan F-1.05 bila perkawinan/perceraian belum tercatat, aksi `update_members`; F03 Pindah Keluar / F-1.03 (SKP atau SKPLN untuk anggota KK; SKTT untuk orang asing yang diajukan warga sebagai perantara, semua bagian formulir selalu tercetak), F-1.02 bila ada anggota KK yang tetap tinggal (ditambah centang penggantian kepala keluarga bila kepala keluarga ikut pindah), dan F-1.01 susunan KK yang tinggal bila kepala keluarga ikut pindah (`family_roster` dengan `exclude` = isian family_members anggota yang pindah, `head` = kepala baru di baris pertama), aksi `deactivate_members` untuk anggota yang pindah (tanpa anggota terdata, Terapkan hanya menandai selesai; bila kepala keluarga ikut pindah dan ada yang tinggal, isian `kepala_baru` wajib dan anggota itu ditetapkan sebagai kepala keluarga lewat `data_options.new_head`); F04 Pindah Datang / F-1.02 atas nama pendatang (diajukan warga sebagai perantara, satu pendatang per pengajuan) + satu surat pernyataan Pendatang sesuai tempat tinggal (numpang KK / rumah sendiri / rumah orang lain), dan F-1.01 bila membuat KK baru (mendatar; tata letak dari Excel aslinya di `database/seeders/templates/f1_01_biodata_keluarga.html`, kotak per karakter lewat `{{ isian[n] }}`), aksi `create_citizen` (numpang KK: masuk KK yang ditumpangi; rumah sendiri/orang lain: KK baru ber-No. KK dari KK terbitan, pendatang kepala keluarga; status kependudukan pendatang); F05 Pelaporan Kelahiran / F-2.01 (kotak per karakter, bagian kelahiran) + F-1.02 (perubahan KK karena peristiwa penting; lampiran KK lama dan bukti kelahiran) + F-1.01 susunan KK pemohon ditambah anak di baris terakhir (`family_roster.append` dengan `role_value` Anak, isian `typed` boleh `a|b` untuk ayah anggota KK atau yang diketik, dan `fixed` Belum Kawin / Tidak/Belum Sekolah / Belum/Tidak Bekerja; agama mengikuti ibu, NIK anak kosong), F-2.03 bila tanpa surat keterangan lahir, F-2.04 bila perkawinan orang tua belum tercatat (`perkawinan_ortu`; penyata ibu bayi, pasangan ayah dari KK atau diketik; akta "anak dari ayah dan ibu yang perkawinannya belum tercatat", Permendagri 108/2019; F-1.02 melampirkan buku nikah bila tercatat atau SPTJM bila belum; pengakuan anak lewat F08), aksi `create_citizen` (anak masuk KK pemohon, NIK diisi Kasi dari KK baru; nama ayah dari anggota KK atau yang diketik); F06 Pelaporan Kematian / F-2.01 bagian kematian + F-1.02 yang selalu terbit karena almarhum dihapus dari KK (IV.A KK, lampiran KK lama dan surat keterangan kematian; almarhum kepala keluarga = KK baru karena penggantian kepala keluarga, selain itu perubahan KK karena peristiwa penting), dan F-1.01 (susunan KK baru dari isian `family_roster`) bila almarhum kepala keluarga, aksi `deactivate_members` untuk almarhum (isian family_member tunggal) dan, bila almarhum kepala keluarga, penetapan kepala keluarga baru (`data_options.new_head`). F07 Pelaporan Perkawinan/Perceraian / F-1.06 status perkawinan (utama; pemohon, dan pasangan bila satu KK) + F-1.02 (perubahan KK karena peristiwa penting, lampiran KK lama dan buku nikah atau akta cerai) selalu terbit; formulir lain menurut `agama_perkawinan` dan status pencatatan: Islam yang sudah tercatat (buku nikah KUA / akta cerai Pengadilan Agama) cukup perubahan KK dengan No. buku nikah atau No. akta cerai wajib; selain Islam yang sah tetapi kutipan aktanya belum terbit (`akta_capil_terbit = tidak`) ditambah F-2.01 bagian perkawinan atau perceraian (subjek akta kesatu suami, kedua istri; isian pemuka agama, orang tua, status sebelum kawin, akta perkawinan, nomor putusan, panitera, dan saksi hanya untuk jalur ini); kutipan akta sudah terbit = perubahan KK saja; F-1.05 bila belum tercatat, F-2.04 bila perlu SPTJM kebenaran pasangan suami istri (hanya perkawinan belum tercatat), aksi `update_citizens` (status kawin suami dan istri yang warga desa menjadi Kawin / Cerai Hidup). Apakah pasangan satu KK (`pasangan_satu_kk`) diisi sistem dari No. KK suami dan istri. Pemohon salah satu pasangan; perannya (`peran_pemohon`) diturunkan dari jenis kelamin pemohon lewat `from_applicant` (ditimpa sebelum validasi di `StoreLetterRequest`, tidak ditanyakan di form): isian NIK suami/istri ber-`self_when` diisi NIK pemohon sehingga nama dan No. KK-nya diambil dari data pemohon, pasangannya diisi lewat NIK (warga desa otomatis, selain itu diketik). F08 Pengakuan Anak / F-2.01 bagian pengakuan anak (subjek akta = anak yang dipilih dari KK pemohon: Anak/Cucu/Famili Lain, ibu kandung perempuan dari KK minimal 10 tahun lebih tua, ayah biologis lewat NIK atau pemohon laki-laki sendiri (`pemohon_ayah`, data ayah dari akunnya), penetapan pengadilan opsional) + F-2.10 (data anak dan aktanya terisi), aksi `update_citizen` pada anak (`data_subject_field` = `anak_nik`): nama ayah dan tautan `father_id` ke data ayah bila warga desa (`data_fields.citizen_by_nik`), KK anak tidak berubah. F09 Perubahan Susunan KK / F-1.02 (KK baru keluarga baru/pisah, ganti kepala, atau menumpang) + F-1.01 susunan KK hasil (isian `family_roster` ber-`restructure`), dan surat pernyataan tidak keberatan numpang KK dari kepala KK tujuan; pasangan dari KK lain (`village_citizen`) dan kepala KK tujuan (`family_head_of`, NIK diisi sistem dari No. KK tujuan ber-`village_family`) diminta persetujuan lewat mekanisme saksi; KK baru wajib tepat satu kepala keluarga (`one_head` pada repeater), anggota tidak dobel, aksi `restructure_family` (membentuk keluarga baru juga mencatat kepala keluarga dan pasangannya Kawin, sehingga pasangan yang sudah punya buku nikah cukup mengajukan F09; perkawinan yang belum tercatat (nikah siri/adat) juga cukup F09, tanpa No. buku nikah, dengan F-1.05 SPTJM (suami, istri, dua saksi) dan status Kawin Belum Tercatat di F-1.01 dan saat Terapkan, Permendagri 108/2019 Pasal 10 ayat (2); F07 untuk mencatatkan perkawinan agar terbit akta). Formulir Disdukcapil (F-1.01, F-1.02, F-2.01, F-2.03, F-2.04, F-2.10) dibangun dari Excel aslinya ke `database/seeders/templates/*.html` dan diisi `sheetForm()` (F-1.02 lewat `registrationForm()`, pilihan ditandai "V" seperti di Excel; induk ikut tercentang otomatis: I.A BARU bila salah satu sub KK baru tercentang, IV.A KK bila sub perubahan data KK atau penggantian kepala keluarga tercentang, kecuali induknya ditulis sendiri seperti di F09); PDF memakai DejaVu Sans tersemat (font subsetting aktif di `config/dompdf.php`), memori render dinaikkan ke 512M; kategori `pelayanan`, Kasi Pemerintahan, tanpa nomor & TTD Kepala Desa, wajib unggah hasil dari Disdukcapil; semua aksi datanya otomatis lewat Terapkan) per desa. Semua layanan Fxx diakhiri isian "Siapa yang akan mengurus formulir ini ke Disdukcapil?" (`pengurusan`, bawaan `sendiri`); bila `diwakilkan`, terbit F-1.07 Surat Kuasa dalam Pelayanan Administrasi Kependudukan (dokumen `f1_07`): pemberi kuasa = pemohon (data dan TTD akunnya), penerima kuasa lewat NIK (`nik_penerima_kuasa`, warga desa: nama, pekerjaan, dan alamat dari data penduduk dan pemilik akun diminta persetujuannya seperti saksi; bukan warga desa: diketik, TTD basah), alasan diwakilkan teks bebas (`alasan_kuasa`); tanggal terbit dipecah lewat `{{ issued_day_name }}`, `{{ issued_day }}`, `{{ issued_month }}`, `{{ issued_year }}` (`ServiceLetterTypeSeeder::withPowerOfAttorney`). Tiap layanan juga mendefinisikan `carry_documents` {forms, attachments}: formulir yang terbit dari pengajuan (bersyarat ditulis "bila ...") dan dokumen yang dibawa ke Disdukcapil; F-1.07 dan KTP-el pemberi/penerima kuasa ditambahkan otomatis, dan daftar ini tampil di bawah deskripsi saat jenis surat dipilih (menggantikan teks `requirement_info` untuk Fxx). Kolom formulir Excel yang datanya sudah ada di sistem diisi otomatis: kode wilayah F-2.01 (`{{ village_area_code }}`, 8 digit dari kode desa Kemendagri 10 digit: provinsi, kabupaten, kecamatan, 2 digit terakhir desa), golongan darah serta NIK ayah/ibu tiap anggota di F-1.01 susunan KK (F06, F09) dan email akun pemohon (`{{ applicant_email }}`), data orang tua almarhum yang tertaut di data penduduk (NIK, tempat & tanggal lahir, kewarganegaraan) di F-2.01 kematian (kolom anggota `nik_ayah`, `tempat_lahir_ayah`, `lahir_ayah_tgl/bln/thn`, `kwn_ayah`, dan untuk ibu, di `LetterFormSchema::MEMBER_KEYS`), status perkawinan suami dan istri sebelum kawin di F-2.01 perkawinan (`status_kawin_suami/istri`, dari data penduduk bila warga desa, selain itu dipilih), dan tanggal melapor F-2.01 perkawinan/perceraian = tanggal terbit (`{{ issued_tgl/bln/thn }}`; kotak `sheetForm` boleh bersyarat `[placeholder, syarat]`). Dokumen & keterangan tambahan warga (gelar, No. akta lahir/perkawinan/perceraian dan tanggalnya, kelainan fisik & mental, penyandang cacat) disimpan di `citizens` (aturan bersama `App\Support\CitizenDocumentRules` untuk tambah/ubah warga, impor Excel, dan Terapkan; nomor akta dan `disability` dienkripsi dan disamarkan di Log Aktivitas) dan tercetak di F-1.01 susunan KK (F06, F09); akta "Ada" bila nomornya tercatat. Isian layanan yang melengkapinya: F09 membentuk keluarga baru wajib No. Buku Nikah dan Tanggal Perkawinan (`data_options.restructure.new_family.married.certificate/date`; tercetak "Kawin" + akta di baris kepala keluarga dan suami/istri, disimpan saat Terapkan); F04/F06/F09 punya data tambahan (F04: gelar & kelainan pendatang lewat `data_fields`; F06 bila almarhum kepala keluarga dan F09: repeater `data_tambahan` = `data_options.member_details` berisi anggota, gelar, No. akta lahir, akta cerai, kelainan & cacat, yang menimpa nilai cetak F-1.01 dan disimpan ke data warga setelah aksi utama Terapkan; hanya kolom yang diisi) serta Telepon/HP keluarga (F06/F09, hanya tercetak); F07 menambah Istri yang ke- dan Jumlah Anak (tercetak) dan menyimpan No. buku nikah/akta perkawinan, tanggal perkawinan, No. akta cerai, dan tanggal putusan perceraian (`data_fields.source` boleh `a|b` = isian pertama yang terisi); F05 menyimpan No. akta lahir anak bila diisi Kasi saat Terapkan. Isian bisa diberi keterangan singkat (`help`). F10 Pelaporan Pengangkatan Anak / F-2.01 bagian pengangkatan anak (kotak jenis Pengangkatan Anak, anak angkat dan aktanya, orang tua kandung, orang tua angkat = pemohon menurut jenis kelaminnya lewat `from_applicant` + pasangan lewat NIK, penetapan pengadilan) + F-1.02 (perubahan KK karena peristiwa penting; lampiran KK lama dan bukti peristiwa penting = penetapan pengadilan yang dibawa ke Disdukcapil) + F-1.01 susunan KK orang tua angkat ditambah anak angkat (`family_roster.append`: dari data penduduk bila NIK terdaftar, selain itu dari isian `typed`); hanya untuk pengangkatan anak yang sudah mendapat penetapan pengadilan (nomor, tanggal, dan nama pengadilan wajib diisi; tanpa unggahan berkas, sesuai formulir); tanpa persetujuan KK asal (dasarnya penetapan pengadilan). Isian NIK anak `adoptee` menolak NIK pemohon dan kepala keluarga yang KK-nya masih beranggota lain; isian NIK `typed_when_empty` menampilkan isian pasangannya untuk diketik bila NIK dikosongkan (anak belum punya NIK, orang tua tunggal). Isian NIK pihak dalam surat (bukan saksi) boleh memakai `not_same_as` (satu NIK satu identitas: NIK yang sama di isian lain yang tampil ditolak, baik warga desa maupun bukan), `not_applicant` (bukan NIK pemohon), dan `nik_gender` (L/P: NIK warga desa harus berjenis kelamin sesuai, mis. ayah laki-laki); `not_same_as` juga menerima isian family_member (dibandingkan dengan NIK anggota itu), `nik_gender` boleh nama isian jenis kelamin (mis. `jenis_kelamin_almarhum`), dan `not_village_citizen` menolak NIK yang sudah terdaftar sebagai warga desa. Isian NIK `include_inactive` juga menemukan warga nonaktif saat pencarian (`GET /profile/nik-lookup?include_inactive=1`) dan pengisian `from_nik`; dipakai NIK almarhum di A07 Penguburan dan A11 Ahli Waris (`LetterTypeSeeder::deceasedFields`): NIK di urutan pertama, nama, tempat & tanggal lahir, jenis kelamin, alamat (dan pekerjaan di A11) diambil dari data penduduk bila terdaftar, diketik bila tidak terdaftar atau NIK dikosongkan (`typed_when_empty`); tanggal meninggal dan tempat pemakaman tetap diketik. Pola yang sama (`LetterTypeSeeder::lookupPersonFields`, NIK wajib) dipakai anak di A05 Tidak Mampu dan pasangan di A08 Kelahiran. Tanggal lahir anak di A05 dan A08 tidak boleh sebelum tanggal lahir pemohon (acuan `date_order` `birth:applicant`), dan di A08 juga tidak sebelum tanggal lahir pasangan (dari data penduduk bila warga desa, selain itu yang diketik). Isian tanggal peristiwa boleh ber-`report_deadline` ({days, event, when}): batas waktu pelaporan UU 23/2006 jo. UU 24/2013 (kelahiran F05 60 hari, kematian F06 30 hari, perkawinan dan perceraian yang dicatatkan ke Disdukcapil F07 60 hari, pengangkatan anak F10 30 hari sejak penetapan); hanya peringatan di form, server tidak menolak. Opsi validasi isian lain: tanggal `past` (tidak sesudah hari ini, helper `pastDate` di `DefinesLetterTypes`; semua tanggal lahir orang, tanggal meninggal, dan tanggal pemakaman di Persuratan Desa, serta semua tanggal di Layanan Kependudukan kecuali Masa Berlaku ITAS/ITAP dan Rencana Tanggal Pindah F03; input tanggal di form dibatasi `max` hari ini), angka `integer` + `min_value` (penghasilan A03/A10: rupiah bulat minimal 1), jenis kelamin `opposite_applicant_gender` dan NIK `nik_gender: opposite_applicant` (pasangan A08 berlawanan jenis dengan pemohon). A07/A11: tanggal meninggal tidak sebelum tanggal lahir almarhum (acuan `birth:nik_almarhum` juga membaca warga nonaktif bila isian NIK-nya `include_inactive`), dan tanggal pemakaman A07 tidak sebelum tanggal meninggal. Isian `prefill_from_applicant` (kolom data penduduk pemohon) hanya memberi nilai awal di form yang tetap bisa diubah: A03 Bidang Usaha = isian pekerjaan (katalog + Lainnya, teks Lainnya hanya tercetak) berawal pekerjaan pemohon, A04 Alamat Domisili = isian `village_area` (Dusun/RW/RT, dicetak "Dusun X RT 001/RW 013") berawal RT pemohon, A06 Nama yang Benar berawal nama pemohon, A08 alamat anak berawal alamat pemohon. Penerapan: semua isian orang di Persuratan Desa (`personFields`: jenis kelamin sesuai isian, bukan pemohon; A08 anak belum terdata dan bukan pasangan), F02 SPTJM (suami L, istri P, berbeda), F03 orang asing bukan pemohon, F04 (pendatang belum warga desa dan bukan perantara, berbeda dari kepala KK/pemilik/orang tuanya, ibu P, ayah L), F05 (ayah diketik L dan bukan ibu/pemohon; saksi dan penolong bukan ayah/ibu bayi), F06 (saksi bukan almarhum), F07 (pasangan sesuai perannya, orang tua suami/istri sesuai jenis kelamin, berbeda satu sama lain, bukan pemohon), F08 (ayah biologis L, bukan pemohon/anak/ibu; saksi bukan mereka), F10 (anak, ayah/ibu kandung, ayah/ibu angkat; saksi bukan mereka). Di log `letter_fulfilled`, nomor akta dan jenis cacat disamarkan. Helper isian/template bersama ada di `Database\Seeders\Concerns\DefinesLetterTypes`. A07 (Penguburan) memakai `update_citizen` untuk menonaktifkan data almarhum; A08 (Kelahiran) memakai `create_citizen` untuk menambah anak. A11 (Ahli Waris) hanya menerbitkan surat dan berlaku tanpa batas (`validity_days` null); blok identitasnya memuat pekerjaan pemohon lewat placeholder `{{ applicant_occupation }}`. Belum ada jenis surat bawaan yang memakai `signature_slots` atau `supporting_template`.

> `letter_categories`, `letter_types.category_id`, `approval_flows.category_id`, dan `letter_types.verification_type` sudah di-drop (migration `2026_10_10_090000` dan `2026_10_11_090400`). Perilaku per "kategori" kini diturunkan dari kolom-kolom di atas.

### 3.2 Pipeline approval: `approval_flows` → `flow_steps`

- Satu flow default per desa (`ApprovalFlowSeeder`): step 1 `rt`, step 2 `kepala_desa` (final). Flow hanya dapat **dibaca** lewat API; tidak ada endpoint tulis.
- `letters.status` generik (`pending | in_progress | approved | rejected`); posisi dibaca dari `current_step_order` di-JOIN ke `flow_steps`.
- `letters.flow_id` adalah snapshot saat submit.
- `current_step_order = 0` berarti surat masih menunggu tanda tangan dan belum masuk approver mana pun.
- RW dan Kadus **bukan approver**; menerima FYI setelah RT approve. Kasi/Kaur bukan approver; menerima notifikasi setelah final approve.
- Resolve approver: RT berbasis wilayah (`letters.rt_id`), Kades/Sekdes berbasis posisi dalam desa. `letters.rt_id`/`rw_id`/`hamlet_id` diisi otomatis dari wilayah pemohon saat surat dibuat (`Letter::booted`), sehingga daftar dan akses RT/RW/Kadus tetap di wilayah lama walau pemohon pindah.
- **Tahap dilewati / ditahan** (`LetterFlowService::resolveFromOrder`):
  - non-final dengan pejabat aktif tetapi semuanya pemohon → dilewati (log `RtStageSkippedForOfficialApplicant`); surat langsung berstatus `in_progress` di tahap Kades/Sekdes, sama seperti sesudah disetujui RT;
  - non-final tanpa pejabat aktif (RT kosong) → surat **ditahan** di step itu, log `HeldForVacantApprover`, Staf SIDUTama dinotifikasi (`approver_vacant`); saat RT ditetapkan (promote), RT baru dinotifikasi tentang surat yang menunggu;
  - final tanpa approver eligible selain pemohon (mis. Kades mengajukan saat Sekdes kosong) → tidak pernah dilewati: surat **ditahan** di tahap final (`LetterFlowService::holdForVacantStep`, log `HeldForVacantFinalApprover`, Staf dinotifikasi `approver_vacant`), baik saat diajukan maupun saat RT menyetujui; Kades/Sekdes yang kemudian ditetapkan langsung dapat memutusnya.
- **Per role pemohon:** warga, RW, Kadus, Kasi, Kaur, Staf → RT setempat lalu Kades/Sekdes; RT → tahap RT dilewati bila ia satu-satunya RT aktif (RT aktif lain di RT yang sama memutuskan bila ada); Kades/Sekdes → semua tahap non-final (RT) dilewati (`LetterFlowService::isVillageHeadApplicant`, log `RtStageSkippedForVillageHeadApplicant`), lalu saling menyetujui di tahap final: surat Kades hanya oleh Sekdes, surat Sekdes hanya oleh Kades; pasangan kosong → ditahan (`HeldForVacantFinalApprover`).
- **Setelah terbit (Terapkan & verifikasi hasil):** hanya Kasi/Kaur sesuai `assigned_role` (NULL = keduanya); Staf SIDUTama bukan cadangan (mengubah data lewat Data Penduduk). Surat milik sendiri boleh diterapkan/diverifikasi sendiri, termasuk koreksi nilai (hak jabatan); status log diberi akhiran "oleh pemohon sendiri" (`Letter::isApplicant`). Notifikasi `letter_needs_fulfillment`/`letter_ready_for_print`/`letter_result_submitted` dikirim lewat `OfficialService::notifyLetterHandlers`; bila jabatan yang ditugaskan kosong, Staf menerima `handler_vacant` untuk mengisinya. `LetterResource` mengirim `can_fulfill` dan `can_review_result`.

### 3.3 First-Action-Wins Kades/Sekdes

Keputusan dijalankan di dalam transaksi: `SELECT ... FOR UPDATE` pada surat, cek ulang status aktif dan step `kepala_desa`; request kedua mendapat 409. `approval_level` mencatat `kepala_desa` atau `sekretaris_desa` sesuai jabatan aktor.

### 3.4 Final approve: nomor surat & snapshot

1. `LetterNumberGenerator`: `{classification_code}/{NNN}/Des/{bulan Romawi}/{tahun}` (mis. `470/001/Des/X/2026`). Counter `letter_number_counters` per desa + kode klasifikasi + tahun (unique `uq_letter_counters_classification`); baris lama per jenis surat tetap sebagai riwayat.
2. `expires_at` dari `validity_days`, `processed_at`.
3. `LetterSnapshotService::captureOnFinalApproval()` membekukan konteks render ke `letters.snapshot` dan `signed_by_official_id` (Kepala Desa aktif saat itu, juga bila Sekdes yang menyetujui). Bila belum ada Kades aktif, snapshot ditunda sampai unduhan pertama. Untuk formulir Layanan Kependudukan, snapshot juga membekukan `service_officials`: nama dan NIK Kepala Desa serta Ketua RT/RW wilayah tiap isian `village_area` (placeholder `{{ pejabat_kepala_desa_nama }}`, `{{ pejabat_rt_<area>_nama }}`, `{{ pejabat_rt_<area>_nik }}`, juga `rw`). Tidak ada gambar TTD: ruang tanda tangan dibiarkan kosong untuk TTD basah. Command `letters:backfill-snapshots` (dijalankan migration `2026_10_11_090300`) membekukan surat approved lama.
4. Notifikasi: pemohon `letter_approved_final`; Kasi/Kaur sesuai `assigned_role` mendapat `letter_needs_fulfillment` (bila ada `data_action`) atau `letter_ready_for_print`.

### 3.5 Saksi & persetujuan pada surat

Tidak ada TTD digital (TTD akun, TTD jabatan, stempel digital, dan reset TTD sudah dihapus). Surat terbit tanpa tanda tangan, dicetak lalu ditandatangani dan distempel basah di kantor desa. Yang tersisa hanya persetujuan saksi:

- **Saksi** (isian NIK ber-`witness` di `form_fields`, `letter_signatures.signer_type = witness`, satu baris per percobaan, baris terbaru = keadaan slot): warga desa ber-akun diminta persetujuannya per surat (`consent`, `pending` -> `signed`; menerima dengan kata sandi); warga desa tanpa akun `rt_check` (nama & No. KK dari data penduduk, diverifikasi RT); NIK di luar data penduduk `manual`. Persetujuan pasangan/kepala KK tujuan F09 memakai mekanisme yang sama.
- Pemilik NIK menyetujui (dengan konfirmasi password) atau menolak; boleh sekaligus memblokir pemohon (`signature_blocks`).
- Anti-penyalahgunaan: jawaban seragam walau NIK tidak punya akun; pembatasan `max_rejections`=3 penolakan dalam `rejection_window_hours`=24 per pasangan pemohon–NIK; permintaan kedaluwarsa `request_ttl_days`=3 (`config/letters.php`). Saksi yang menolak/kedaluwarsa diganti pemohon lewat `POST /letters/{id}/signatures/{nik_isian}` (JSON `nik`, opsional `name`/`family_number`).
- Selama ada saksi yang menunggu, `current_step_order = 0` (log "Menunggu persetujuan saksi"). Begitu semua saksi terisi, `LetterService::beginApprovalIfSigned()` memindahkan surat ke step approval pertama.

### 3.6 Terapkan perubahan data (fulfillment)

`LetterFulfillmentService` (otorisasi `LetterPolicy::fulfill`: surat approved, `data_action` ≠ `none`, Kasi/Kaur sesuai `assigned_role`):
- `GET` menyajikan nilai sekarang vs usulan per kolom `data_fields`;
- `POST` (lock surat, sekali saja) menerapkan nilai akhir (koreksi Kasi/Kaur atau usulan warga) dengan aturan validasi yang sama seperti form data warga Staf SIDUTama. `update_citizen` dapat menonaktifkan warga sekaligus akun login-nya; `create_citizen` mewarisi RT/dusun/KK/alamat pemohon. Hasil disimpan di `letters.fulfillment`, plus status log, activity log `citizen` (`letter_fulfilled`), dan notifikasi ke pemohon.
- Hanya kolom yang didefinisikan jenis surat yang boleh disentuh; tidak ada jalur edit bebas data warga dari surat.

### 3.7 Lampiran

`letter_attachments` (kind `field` | `result` | `attachment`) di disk `private_uploads` folder `letter-attachments/{village_id}/{letter_id}/`. Dibuka lewat `GET /letters/{letter}/attachments/{attachment}` (LetterPolicy::view). Folder dihapus saat surat dihapus atau pengajuan gagal.

### 3.8 Isolasi per desa

`letter_types`, `approval_flows`, `approval_settings`, `occupations`, `official_position_types`, `news_categories`, dll. ber-`village_id`. Service mengambil desa dari akun login; ID milik desa lain diperlakukan 404. API publik memilih desa lewat `village_code` (opsional bila hanya satu desa).

---

## 4. RBAC & Otorisasi

### 4.1 Peran

`users.role` 9 nilai: `warga, rt, rw, kadus, kasi_pemerintahan, kaur_tu_umum, staf_sid, kepala_desa, sekretaris_desa`. Tier navigasi di SYS/FE hanyalah label. Superadmin belum ada.

### 4.2 Jabatan

- **Jabatan berakun** (enum `OfficialPosition`): kepala_desa, sekretaris_desa, rt, rw, kadus, kasi_pemerintahan, kaur_tu_umum, staf_sid — menentukan `users.role`.
- **Jabatan tanpa akun**: jenis dikelola Staf SIDUTama di `official_position_types` (kode dibuat dari label, tidak dapat diubah; seeder: Kasi Kesejahteraan, Kasi Pelayanan, Kaur Perencanaan, Kaur Keuangan, Staf SIPADES, Staf SISKEUDES). `officials.position` kini VARCHAR(50) berisi nilai enum atau `code` jenis jabatan (`ValidOfficialPosition`).
- Penetapan via `OfficialAssignmentService` (promote/demote/rotate, transaksional, activity log `official`). Foto pejabat wajib saat penetapan/rotasi (disk public). Calon dicari lewat NIK (`POST /officials/candidates/lookup`).

### 4.3 Lapisan otorisasi

1. Middleware grup: `auth:sanctum`, `account.active`, `password.changed`, lalu `role:` per grup endpoint.
2. Policy/Service untuk konteks resource (wilayah RT, desa, step aktif, assigned_role, pemohon).
3. Re-validasi di dalam transaksi untuk aksi keputusan.

Scope ringkas: Staf SIDUTama = operator penuh di desanya (CMS, kependudukan, jabatan, konfigurasi); Kades/Sekdes = approver final tanpa akses CMS; Kasi/Kaur = baca daftar warga, akses surat selesai, Terapkan; RT = approver wilayah; RW/Kadus = baca FYI.

---

## 5. Domain Kependudukan

- `families` (KK, tipis) terpisah dari `citizens` (individu). Sosio-ekonomi per KK (`family_socioeconomics`). Pekerjaan dari katalog `occupations` per desa.
- Tidak ada "warga Non-NIK"; lokal/pendatang dibedakan `residency_type`.
- Perubahan data warga oleh warga **hanya** lewat jenis surat ber-`data_action`, yang diterapkan Kasi/Kaur/Staf SIDUTama (S3.6). Tidak ada edit langsung oleh warga.
- Daftar warga berpaginasi (default 20, maks 100) dengan pencarian nama dan filter Dusun/RW/RT (RW dan Dusun lewat RT warga); Kasi/Kaur dapat membaca daftar.
- Register warga mewajibkan NIK + tanggal lahir yang cocok dengan `citizens.date_of_birth`.
- Impor Excel per baris, baris gagal dilewati.

---

## 6. PDF & Dokumen

- Tidak ada file PDF tersimpan; dirender dompdf saat diminta.
- **Surat approved dirender dari snapshot** (template, definisi isian, identitas & kop desa, nama Kepala Desa penanda tangan, nama/NIK pejabat pada formulir `service_officials`, tanggal terbit). Penggantian Kades, perubahan template, atau data warga tidak mengubah surat lama.
- Surat belum approved (preview) dirender dari data hidup dengan Kepala Desa aktif saat ini. Pemohon hanya dapat mem-preview setelah surat approved; pejabat yang memutus/memantau dapat mem-preview selama proses.
- **Tanpa TTD digital dan stempel**: satu view `pdf.templates.letter`, semua ruang tanda tangan (`{{ signature_img }}`, `{{ tanda_tangan_* }}`, `{{ ttd_* }}`) dikosongkan dan nama penanda tangan tetap tercetak. Alur: surat terbit → petugas desa mencetak, menandatangani, dan menstempel basah → pemohon mengambil di kantor desa; unduhan pemohon adalah salinan tanpa TTD.
- Placeholder: data pemohon, kop desa (`village_*`, dari profil desa), nomor & tanggal surat, isian form (diformat `LetterValueFormatter`: tanggal, rupiah + terbilang, pilihan), nama/NIK pejabat formulir (`pejabat_*`). Nilai teks di-escape; placeholder tak terpetakan diganti garis.
- Dokumen pendukung (`supporting_template`) dirender dengan cara yang sama.
- Pemohon ditolak mengunduh bila `expires_at` lewat.

---

## 7. Notifikasi

- `LetterStatusNotification` → kanal `database` (koneksi `sync`, in-app) dan `WebPushChannel` (diantrekan). Payload memuat `context.letter_id`, `letter_no`, `status`, `applicant`, `is_applicant`; Web Push membawa URL `/buka-notifikasi?...`.
- Langganan Web Push disimpan per perangkat lewat `POST/DELETE /push-subscriptions` (VAPID dari `.env`).
- Kode status: `pending`, `approver_vacant`, `approval_reminder`, `rt_approved`, `rt_rejected`, `rt_approved_rw_fyi`, `rt_approved_kadus_fyi`, `kepala_desa_approved`, `kepala_desa_rejected`, `letter_approved_final`, `letter_ready_for_print`, `letter_needs_fulfillment`, `handler_vacant`, `letter_fulfilled`, `signature_requested`, `signature_accepted`, `signature_rejected`.
- Pengingat approval: `ApprovalReminderService` lewat command `approvals:send-reminders` yang dijadwalkan tiap 5 menit di `routes/console.php` (butuh `php artisan schedule:work`; di Docker service `sid_scheduler`). Dikirim sekali per tahap per surat ke approver berwenang (in-app + Web Push) saat `now() >= deadline_at - reminder_hours` (0 = tepat saat deadline); `reminded_at` diisi.
- Pengumuman beranda: command `announcements:prune` dijadwalkan tiap menit di `routes/console.php` dan menghapus pengumuman yang lewat `expires_at` per model (event `deleted` ikut menggugurkan cache publik). Pembacaan memakai scope `active()`, jadi pengumuman basi tidak tampil walau scheduler terlambat.
- Tidak ada notifikasi email status surat.

---

## 8. Keamanan Data & Audit

- Enkripsi `$casts encrypted`: `citizens.nik`, `families.no_kk`, `families.family_address`, `letters.applicant_nik`, `letters.applicant_address`. Dual-column hash (`nik_hash`, `no_kk_hash`, `applicant_nik_hash`, `letter_signatures.target_nik_hash`).
- Berkas privat (disk `private_uploads`): lampiran surat dan hasil dari instansi. Disk public: logo & foto beranda desa (dioptimasi WebP), foto pejabat, foto anggota organisasi desa (`org-member-photos/`), foto profil akun warga (`user-photos/`), thumbnail berita.
- Login: throttle 5 percobaan per `username|IP`, lockout 1 jam, percobaan gagal dicatat `Log::warning`. Register: 5/menit per IP dan 10/jam per hash NIK.
- `must_change_password` → 403 `password_change_required` kecuali `GET /api/user`, `PUT /api/profile/password`, `/logout`.
- Role tidak cocok dengan grup endpoint → 403 `role_forbidden` (`EnsureUserHasRole`). Role dibaca ulang dari DB setiap request, jadi rotasi/turun jabatan langsung berlaku pada sesi yang masih terbuka.
- Label peran `staf_sid` = "Staf " + `config('sid.app_name')` (`config/sid.php`, env `SID_APP_NAME`) lewat `UserRole::stafSidLabel()`; dipakai juga untuk pesan error.
- Audit: `letter_status_logs` (semua transisi status + alasan sistem) dan activity log untuk `official` (promote/demote/rotate), `citizen` (`letter_fulfilled`, serta `created`/`updated`/`deleted`/`imported` manual), `family` (`created`/`updated`/`deleted`/`socioeconomic_updated`), `user_signature` (`reset`), `user` (`staf_sid_recovered`). Pencatatan data kependudukan manual lewat `PopulationAuditService` (properti `village_id`, `subject_label`, `changes` {field: {old,new}}; NIK/No KK/alamat KK disamarkan). Dibaca Staf SIDUTama lewat `GET /activity-logs/population` dan `GET /activity-logs/letters` (`ActivityLogController`). Retensi: `activitylog:clean` harian (365 hari).
- Pemulihan darurat Staf SIDUTama: `php artisan staf-sid:recover --username=...` (`UserService::recoverStafSid`) hanya untuk `staf_sid` aktif; reset kata sandi sementara, `must_change_password`, cabut token & sesi DB.
- `trustProxies('*')` aktif; tidak ada `forceScheme('https')` di aplikasi; cookie session default `SameSite=lax` (`SESSION_SAME_SITE`).

---

## 9. Performa & Cache

- Index performa (migration `2026_10_11_090600`) untuk kolom FK yang dipakai scope wilayah, urutan, dan eager-load (citizens, letters, letter_approvals, rts, rws, officials, users, families, news).
- Daftar surat & warga berpaginasi di database; ringkasan dashboard (`GET /letters/summary`) dihitung dengan agregasi SQL atas scope yang sama.
- `PublicPageCache`: JSON respons `/public/*` di-cache per desa 10 menit dengan kunci berversi; event `saved/deleted` pada Citizen, News, NewsCategory, VillageRegulation, LetterType, Official, Hamlet, Village, OfficialPositionType, Announcement, VillageInfoPage, VillageOrgPosition, VillageOrgMember menggugurkan cache desa terkait (`AppServiceProvider::boot`). Citizen ikut karena nama pejabat (Sambutan Kepala Desa di `/public/home`, kontak) dan jumlah penduduk publik (`total_population`) dibaca dari data warga.
- `GoogleMapsLinkResolver` (`POST /villages/profile/resolve-map-link`): mengambil titik kantor dari link Google Maps. Redirect diikuti manual maks. 5 hop dengan timeout 5 detik, hanya ke host Google Maps di setiap hop (pencegahan SSRF); body respons tidak dibaca. Urutan pembacaan: pin `!3d..!4d..`, lalu `@lat,lng`, lalu parameter `q`/`query`/`ll`/`center`.
- `VillageImageOptimizer`: logo ≤512 px, foto beranda ≤1920 px, EXIF orientation diterapkan, simpan WebP (fallback PNG/JPEG atau berkas asli).

---

## 10. Reliabilitas & Operasional

| Constraint | Kondisi source | Catatan |
|---|---|---|
| Queue worker | Web Push diantrekan; notifikasi database sinkron | Stack Docker memakai `QUEUE_CONNECTION=database` dengan service `sid_worker` (`queue:work`); panduan VPS memakai Supervisor worker (`docs/deploy`) |
| Deadline approval | `is_overdue` dihitung saat daftar dimuat; pengingat terjadwal `reminder_hours` sebelum deadline | Satu pengingat per tahap; tidak ada notifikasi overdue terpisah |
| Konkurensi keputusan | Row lock + cek ulang | 409 untuk request kedua |
| Surat tertahan | RT kosong, atau Kades/Sekdes pasangan pemohon kosong → ditahan + notifikasi Petugas | Dilepas saat pejabatnya ditetapkan |
| Deployment | Docker image `sid-api` (PHP-FPM) + `sid-web` (Nginx + SPA), entrypoint tidak menjalankan migrate/seed | `deploy/docker-compose.yml` |

---

## 11. Wacana Next Dev — Belum Ada Desain

| Istilah | Status |
|---|---|
| QR Verification | Belum ada desain/implementasi |
| Void/Cancel Surat | Belum ada; `letters.status` tetap 4 nilai |
| Staging perubahan data self-service | Sebagian terealisasi lewat jenis surat ber-`data_action` (S3.6). Pengajuan perubahan bebas di luar definisi jenis surat tetap tidak ada |

---

## 12. Referensi Silang

| Kebutuhan | Dokumen |
|---|---|
| Kontrak API | `docs/api_spec/openapi.yaml`, `00_INDEX.md` |
| Skema DB | `TDD-03_Database_Schema.md` |
| Use case | `TDD-02_UseCase_Descriptions.md` |
| Diagram | `docs/diagram/code/*` |
| Deployment | `deploy/`, `docs/deploy/`, `docs/EXPO_RUNBOOK.md` |
| Audit docs | `docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md` |

---

## 13. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal, selaras `SID-ARCH-SYS-001` v1.0 dan TDD v5.0 |
| 1.1 | - | v5.1 Auth & Approval Flow |
| 1.2 | 2026-10-06 | v5.2: sosio-ekonomi per KK, pekerjaan baku, stempel desa, upload privat |
| 1.3 | 2026-10-16 | v5.3: kategori surat & verification_type dihapus; jenis surat data-driven (form_fields, data_action, signature_slots, supporting_template, classification_code); snapshot render; nomor surat per kode klasifikasi; TTD akun & permintaan TTD; lampiran; Terapkan; surat ditahan saat RT kosong; Web Push; jabatan tanpa akun dinamis & foto pejabat; kategori berita; identitas desa & cache halaman publik; register dengan tanggal lahir; paginasi; index performa; Docker |
| 1.4 | 2026-10-31 | TTD digital dihapus: surat terbit tanpa TTD/stempel (TTD & stempel basah di kantor desa), pratinjau pemohon setelah terbit; tabel `user_signatures`/`signature_reset_requests`, kolom `officials.signature_img`, `villages.stamp_img`, `letter_types.signature_slots`, dan TTD pihak lain/basah di `letter_signatures` dihapus; tersisa saksi/persetujuan |
