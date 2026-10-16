# TECHNICAL DESIGN DOCUMENT — BAGIAN 5
## SISTEM INFORMASI DESA - DESA CIBENDA
### Roadmap, Asumsi & Risiko, Pertanyaan Terbuka, Known Constraints

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 5 dari 5 (+ Appendix) |
| Status | v5.3 — diselaraskan ke source 2026-10-16 |
| Cakupan | Roadmap pengembangan, asumsi & risiko, pertanyaan prioritas (terjawab & belum), known technical constraints |
| Dokumen terkait | Seluruh bagian TDD 01–04, `TDD-06_Appendix.md`, OpenAPI Spec v5.3, `docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md` |

> **Cara pakai dokumen ini:** Section 3 (Pertanyaan Prioritas) adalah bagian paling penting untuk dicek berkala — status di sini bisa berubah seiring project jalan, sementara dokumen tidak selalu ikut diperbarui secara real-time. Jika ragu, cek migration/kode terlebih dulu, baru anggap dokumen ini sebagai rujukan kedua.

> **Catatan v5.3:** keputusan yang sudah terkunci sebelumnya tetap berlaku. Keputusan baru yang sudah dieksekusi di source (kategori surat dihapus, jenis surat data-driven, snapshot, tanda tangan pihak terkait, Terapkan, jabatan tanpa akun dinamis, kategori berita, Docker untuk expo) dicatat sebagai terjawab di S3.2.

---

## 1. Roadmap Pengembangan

Roadmap ini sangat terbuka pada requirement client setelah observasi pertama.

| Tahap | Fokus | Deliverable | Prasyarat |
|---|---|---|---|
| Tahap 1 — Core System (MVP) | Register NIK + tanggal lahir + password, login username; surat dengan isian dinamis, lampiran, tanda tangan pihak terkait; flow RT → Kades/Sekdes final (RW/Kadus FYI); snapshot & nomor surat per kode klasifikasi; Kasi/Kaur unduh & Terapkan perubahan data; PDF on-demand + dokumen pendukung; deadline & overdue; data kependudukan; jabatan berakun & tanpa akun; CMS (profil desa, berita berkategori, peraturan, organisasi); dashboard; notifikasi in-app + Web Push; cache halaman publik; Docker stack expo | Fitur MVP aktif; reminder otomatis, notifikasi email, dan audit akses data sensitif belum tersedia | Arsitektur dan setup project selesai, database termigrasi |
| Tahap 2 — Penguatan Integritas & Keamanan | Aset & Keuangan Desa; Kelayakan Bantuan Sosial; Redis + Laravel Horizon; scheduler/job untuk reminder approval; backup terjadwal; hardening (force HTTPS, cookie SameSite ketat, audit akses data sensitif); benchmarking & load test | Reminder otomatis masih Planned; backup terjadwal tidak diverifikasi terhadap source backend; hasil benchmarking terdokumentasi (hash chain & dynamic form **tidak** termasuk — lihat Next Dev di `TDD-06_Appendix.md`) | Tahap 1 stabil |
| Next Dev — Paket 1 | Dynamic Tipe Surat oleh Petugas Desa: create tipe surat baru, WYSIWYG template editor, CRUD isian form/slot TTD/aksi data dari UI (infrastruktur data `form_fields` dsb. sudah ada, tetapi hanya diisi developer lewat seeder) | Petugas Desa mandiri kelola tipe surat tanpa developer | Tahap 1 stabil — lihat detail di Appendix |
| Next Dev — Paket 2 | Blockchain-inspired hashing | Validasi integritas data surat | Tahap 1 stabil — lihat detail di Appendix |
| Tahap 3 — Pengembangan Lanjutan | WA Chatbot; cetak surat mandiri untuk Warga; integrasi API eksternal (Dukcapil); AI (opsional) | Multi-channel access, integrasi eksternal | Tahap 2 stabil, validasi kebutuhan client |

---

## 2. Asumsi & Risiko

### 2.1. Asumsi & Risiko Infrastruktur Teknis

| Asumsi | Risiko | Skenario Jika Salah | Mitigasi |
|---|---|---|---|
| Kantor desa memiliki akses internet yang stabil | SEDANG | Sistem tidak dapat diakses, data tidak bisa diinput/di-approve real-time | Desain UI toleran koneksi lambat; fitur draft offline-first (future) |
| Server deployment tersedia dengan spesifikasi minimum: 2 vCPU, 2GB RAM, 20GB SSD | TINGGI | Performa sistem degradasi; implementasi keamanan (HTTPS, fail2ban, firewall) tidak bisa diterapkan penuh | Dokumentasikan minimum server requirement sejak awal; siapkan alternatif managed hosting |
| Worker queue dijaga berjalan bila Web Push diaktifkan | SEDANG | Push tidak terkirim (notifikasi in-app tetap) | Stack Docker expo memakai `QUEUE_CONNECTION=sync`; panduan VPS menyediakan konfigurasi Supervisor |
| PostgreSQL tersedia dan dapat dikonfigurasi di server deployment | RENDAH | Implementasi keamanan tidak bisa diterapkan penuh | Dokumentasikan minimum requirement server; siapkan alternatif shared hosting |
| Docker dipakai untuk stack expo/demo; development tetap manual | RENDAH | Environment dev berbeda antar mesin | `deploy/docker-compose.yml` + `docs/SETUP.md`; PHP ^8.3, PostgreSQL |

### 2.2. Asumsi & Risiko Operasional & Sosial

| Asumsi | Risiko | Skenario Jika Salah | Mitigasi |
|---|---|---|---|
| Admin desa memiliki kemampuan dasar menggunakan aplikasi web | SEDANG | Resistensi adopsi — sistem tidak digunakan meski sudah dibangun | Rancang UI intuitif; sediakan dokumentasi pengguna dan sesi pelatihan |
| Data NIK/No KK yang diinput sudah tervalidasi secara manual oleh admin desa | RENDAH | Data NIK/No KK salah tersimpan dan terenkripsi, sulit dikoreksi | Validasi format NIK 16 digit dan format No KK di frontend & backend |
| Kepala desa mendukung implementasi dan penggunaan sistem, termasuk perannya sebagai approver aktif | SEDANG | Resistensi dari level pimpinan; surat mandek karena Kades tidak terbiasa jadi approver aktif | Sosialisasi dan demo sistem sejak awal kepada pemangku kepentingan, khususnya soal perubahan peran dari monitoring-only menjadi approver aktif |

---

## 3. Pertanyaan Prioritas

Bagian ini mendokumentasikan pertanyaan yang perlu dikonfirmasi sebelum atau selama fase pengembangan. Status diperbarui setelah masing-masing pertanyaan terjawab — baik lewat konfirmasi eksplisit dari desa/tim, maupun implisit lewat keputusan yang sudah dieksekusi di kode.

### 3.1. Validasi dengan Pihak Desa / Client

| Pertanyaan | Status | Jawaban |
|---|---|---|
| Jenis surat apa saja yang perlu dikelola di fase pertama? (SKD, SKU, SKCK, dll.) | Belum dikonfirmasi | — |
| Apakah infrastruktur server sudah tersedia, atau perlu disiapkan dari awal oleh tim? | Belum dikonfirmasi | — |
| Apakah ada sistem eksisting (manual atau digital) yang perlu dipertimbangkan untuk migrasi data? | Belum dikonfirmasi | — |
| Apakah desa manage jabatan BPD/BUMDES/LPM/Karang Taruna/PKK di app, atau statis? | Menunggu konfirmasi | — |
| Apakah history jabatan organisasi non-struktural ditampilkan ke publik? | Menunggu konfirmasi | — |
| Apakah jumlah anggota BPD fix atau dinamis? | Menunggu konfirmasi | — |
| Struktur BUMDES, LPM, Karang Taruna, PKK — fix atau dinamis? | Menunggu konfirmasi | — |

### 3.2. Keputusan Teknis Internal Tim

| Pertanyaan | Status | Jawaban |
|---|---|---|
| Queue driver Tahap 1 | Sudah diputuskan | `database` untuk dev/VPS; `sync` untuk stack Docker expo. Hanya Web Push yang diantrekan |
| Docker untuk deployment | Terjawab (source) | Image `sid-api` (PHP-FPM) dan `sid-web` (Nginx + SPA) dengan compose; Laravel Sail tidak dipakai |
| Apakah notifikasi email aktif di MVP atau in-app dulu? | Terjawab (source) | In-app (database) + Web Push; email status surat belum ada |
| Apakah kategori surat (`letter_categories`) dipertahankan? | Terjawab (source) | Dihapus; perilaku per jenis surat diturunkan dari kolom `letter_types` |
| Apakah `verification_type` (auto/manual/document) dipakai? | Terjawab (source) | Kolom di-drop; persyaratan dokumen dipenuhi lewat isian bertipe file pada `form_fields` |
| Bagaimana warga mengajukan perubahan data kependudukan? | Terjawab (source) | Lewat jenis surat ber-`data_action`, diterapkan Kasi/Kaur/Petugas Desa (UC-26) |
| Apa makna `produces_letter` bagi alur? | Belum diputuskan | Kolom ada dan dikirim ke frontend, tetapi belum mengubah alur backend |
| Jenis surat mana yang membutuhkan slot tanda tangan / dokumen pendukung? | Belum diputuskan | Fitur siap, belum ada jenis surat seed yang memakainya |
| React via REST API atau via Inertia | Sudah diputuskan | REST API (lihat OpenAPI Spec v5.3, `SID-ARCH-FE-001`) |
| Apakah fitur rotasi jabatan organisasi non-struktural diaktifkan di UI MVP? | Terjawab sebagian (source) | Rotasi tersedia dan dijaga status aktif jabatan; konfirmasi desa soal struktur tetap terbuka |
| Apakah Sekdes ikut menjadi approver tahap final yang sama dengan Kades? | **Sudah diputuskan (K7/K13)** | Ya. Kades dan Sekdes saling menggantikan pada tahap final; pemohon Kades diputuskan Sekdes dan sebaliknya. |
| Apakah `assigned_role` menjadi penentu akses Kasi/Kaur? | **Sudah diputuskan (K8/A9/A10)** | Ya. Kasi/Kaur bukan approver; `assigned_role` menentukan akses surat selesai, dan NULL berlaku untuk kedua role. |
| Apa definisi periode untuk `household_income_range`? | Belum diputuskan | Field mengacu pada penghasilan rumah tangga; periode belum ditetapkan. |
| Bagaimana data sosio-ekonomi untuk warga tanpa KK? | Belum diputuskan | Perilaku saat ini tidak menyediakan record sosio-ekonomi pada tingkat individu. |
| Apakah `family_socioeconomics` perlu dienkripsi? | Belum diputuskan | Belum menggunakan cast enkripsi. |
| Apa isi lengkap daftar pekerjaan awal dan bagaimana import memetakan nama pekerjaan ke ID? | Belum diputuskan / ditunda | Seeder awal berisi tiga pekerjaan; pemetaan nama saat import belum dilakukan. |
| Apakah kolom legacy `officials.stamp_img` akan dihapus? | Belum diputuskan | Kolom masih ada, tetapi PDF mengambil stempel dari `villages.stamp_img`. |
| Apakah kolom legacy `letters.purpose` dan `letters.notes` dihapus? | Belum diputuskan | Pengajuan baru selalu NULL; kolom dipertahankan untuk data lama |
| Bagaimana daftar pekerjaan per desa dan sumber stempel PDF ditentukan? | Terjawab | Pekerjaan baku disimpan per desa di `occupations`; PDF memakai stempel pada profil desa. |
| Apakah sosio-ekonomi dicatat pada individu atau keluarga? | Terjawab | Dicatat per KK di `family_socioeconomics`; tidak ada penghasilan individu. |
| ~~Konsistensi ENUM `approval_settings.approval_level` terhadap `letter_approvals.approval_level`~~ | **✅ Selesai / Closed** | Sudah diselaraskan — ENUM `approval_settings.approval_level` menggunakan 5 nilai yang sama dengan `letter_approvals.approval_level` (`rt`, `kepala_desa`, `sekdes`, `kasi_pelayanan`, `kaur_tu_umum`), dikonfirmasi dari migration project yang berjalan. Riwayat koreksi status ini ada di `TDD-06_Appendix.md`. |

---

## 4. Known Technical Constraints

Bagian ini mendokumentasikan keterbatasan teknis yang sudah dapat diprediksi sebelum development dimulai, beserta solusi yang telah dirancang.

| Constraint | Dampak | Solusi |
|---|---|---|
| Kolom AES-256 tidak bisa di-index langsung | Query by NIK/No KK tidak bisa pakai index | Dual-column: encrypted + hash untuk indexing (`nik_hash`, `no_kk_hash`) |
| Queue worker untuk Web Push | Push tertunda bila worker mati (in-app tetap jalan karena sinkron) | Supervisor (VPS) atau `QUEUE_CONNECTION=sync` (Docker expo); Horizon di Tahap 2 |
| `APP_KEY` tidak boleh berubah di production | Semua data terenkripsi tidak bisa didekripsi | Simpan `APP_KEY` di tempat aman; jangan pernah regenerate di prod |
| `on_behalf_of` nullable di MVP | Warga submit sendiri di MVP, kolom selalu NULL | Kolom tetap ada untuk future use case di mana petugas mungkin perlu input atas nama warga tertentu |
| Tabel `officials` sebaiknya punya minimal 1 RT aktif per wilayah | Gate approval bergantung pada RT aktif; resolver tidak melakukan fallback broadcast jika RT tidak ditemukan | Validasi konfigurasi dan pantau wilayah tanpa RT aktif; keputusan approval tetap membutuhkan pejabat RT |
| Redis belum dipakai | Queue, cache, dan session di database | Cukup untuk traffic desa; switch lewat `.env` |
| Entrypoint Docker tidak menjalankan migrate/seed | Deploy baru membutuhkan langkah manual | Ikuti `deploy/scripts/*` dan `docs/EXPO_RUNBOOK.md` |
| Struktur jenis surat (template, isian, slot TTD, aksi data, flow) diisi developer via seeder | Petugas Desa tidak bisa mandiri menambah/mengubah jenis surat | Petugas menghubungi developer; Petugas hanya mengatur masa berlaku, penugasan, status aktif (UC-21) |
| `GET /letter-types` hanya mengembalikan jenis aktif ber-template | Jenis surat yang dinonaktifkan tidak muncul lagi di pengaturan, sehingga tidak dapat diaktifkan ulang dari UI | Lihat audit docs |
| Snapshot/PDF membutuhkan Kepala Desa aktif | Surat approved lama tanpa snapshot tidak dapat diunduh (404) selama jabatan Kades kosong | Pastikan Kades selalu ditetapkan; snapshot dibuat saat final approve bila Kades ada |
| Surat ditahan bila RT di wilayah pemohon kosong | Surat menunggu sampai RT ditetapkan | Petugas Desa dinotifikasi; RT baru langsung diberi tahu |
| Web Push butuh VAPID di backend & `VITE_VAPID_PUBLIC_KEY` di build frontend | Tanpa keduanya push nonaktif | Image web expo saat ini dibangun tanpa VAPID |
| Optimasi gambar butuh ekstensi GD (WebP) | Tanpa dukungan, berkas disimpan apa adanya/fallback | Pasang `gd` dengan WebP di image PHP |
| Cache halaman publik 10 menit | Perubahan via SQL langsung (tanpa event model) tidak menggugurkan cache | Ubah data lewat aplikasi, atau tunggu TTL |
| Tipe surat dengan `template=NULL` tidak bisa dipakai warga | Warga tidak bisa submit surat yang belum ada template | Guard di backend + badge "Draft" di admin page |
| Reminder otomatis belum diimplementasikan | `reminded_at` dan `reminder_hours` tersedia, tetapi belum ada scheduler/job yang mengirim reminder; surat dapat tertahan tanpa notifikasi pengingat | Badge overdue dihitung dari deadline approval aktif; implementasi reminder via scheduler masih backlog |
| PDF on-demand: generate setiap klik | Slight latency saat download | Acceptable trade-off — tidak signifikan untuk traffic desa kecil |
| Struktur organisasi non-struktural menunggu konfirmasi desa | Rotasi anggota sudah tersedia, tetapi struktur jabatan (statis/dinamis) belum dikonfirmasi | Jabatan di-seed; rotasi dapat dimatikan per jabatan dengan menonaktifkan jabatan |
| Blockchain-inspired hashing dikeluarkan dari MVP | Integritas data surat belum tervalidasi di MVP | Detail lengkap dicatat di `TDD-06_Appendix.md` untuk implementasi Next Dev Paket 2 |
| Keputusan bersamaan oleh Kades dan Sekdes | Kedua user memproses tahap final yang sama hampir bersamaan | Aplikasi menerapkan first-action-wins; keputusan aktual actor tersimpan pada approval. |
| `assigned_role` mengatur akses Kasi/Kaur | Salah konfigurasi dapat membuka akses role yang tidak dituju | Policy dan repository memfilter surat selesai memakai nilai `assigned_role`; NULL berarti kedua role. |
| Desa baru memerlukan referensi pekerjaan awal | Dropdown pekerjaan kosong bila seed tidak dijalankan | Jalankan seeder pekerjaan untuk setiap desa baru. |
| Kecocokan desa antara `citizens` dan `occupations` hanya dijaga di aplikasi | Referensi lintas desa dapat tersimpan bila validasi terlewati | Validasi desa pada service saat assign pekerjaan. |
| ID pekerjaan berbeda antar desa | Analisis lintas desa tidak dapat membandingkan ID langsung | Bandingkan nama/normalisasi, atau buat pemetaan lintas desa jika kelak dibutuhkan. |
| Warga pindah desa dengan `occupation_id` terisi | Pekerjaan dapat menunjuk ke katalog desa lama | Kosongkan atau ganti `occupation_id` sesuai katalog desa tujuan saat pindah. |
| Nama pekerjaan/stempel dapat berubah | Surat approved memakai snapshot (stempel & TTD dibekukan), sedangkan data pemohon (nama, NIK, alamat) tetap dari kolom surat | Snapshot tidak membekukan pekerjaan warga |
| Stempel, TTD jabatan, TTD akun, lampiran bersifat private | FE tidak dapat menautkan path langsung | Gunakan endpoint preview terproteksi; upload TTD Kades dilakukan ulang setelah rotasi |
| ~~`approval_settings.approval_level` ENUM belum diselaraskan dengan `letter_approvals.approval_level`~~ | — | **Sudah tidak berlaku** — ENUM sudah diselaraskan. Lihat Section 3.2 dan `TDD-06_Appendix.md` |
