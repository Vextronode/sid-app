# TECHNICAL DESIGN DOCUMENT — BAGIAN 5
## SISTEM INFORMASI DESA - DESA CIBENDA
### Roadmap, Asumsi & Risiko, Pertanyaan Terbuka, Known Constraints

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 5 dari 5 (+ Appendix) |
| Status | v5.0 — mencerminkan state final saat ini |
| Cakupan | Roadmap pengembangan, asumsi & risiko, pertanyaan prioritas (terjawab & belum), known technical constraints |
| Dokumen terkait | Seluruh bagian TDD 01–04, `TDD-06_Appendix.md`, OpenAPI Spec v5.0 |

> **Cara pakai dokumen ini:** Section 3 (Pertanyaan Prioritas) adalah bagian paling penting untuk dicek berkala — status di sini bisa berubah seiring project jalan, sementara dokumen tidak selalu ikut diperbarui secara real-time. Jika ragu, cek migration/kode terlebih dulu, baru anggap dokumen ini sebagai rujukan kedua.

---

## 1. Roadmap Pengembangan

Roadmap ini sangat terbuka pada requirement client setelah observasi pertama.

| Tahap | Fokus | Deliverable | Prasyarat |
|---|---|---|---|
| Tahap 1 — Core System (MVP) | Warga self-service (register, login, submit, tracking status); Approval dinamis berbasis Category+Flow (default: RT → RW notif-only → Kades/Sekdes → Kasi/Kaur); Download PDF on-demand; Deadline approval + reminder scheduler; CRUD citizens + families (KK) + citizen_socioeconomics + import Excel; Kelola struktur wilayah; Kelola jabatan struktural (termasuk Sekretaris Desa); Kelola organisasi non-struktural; Kelola peraturan desa; Halaman publik; Dashboard per role (9 role); Notifikasi in-app + email; Queue driver: database | Semua fitur MVP aktif | Arsitektur dan setup project selesai, database termigrasi |
| Tahap 2 — Penguatan Integritas & Keamanan | Aset & Keuangan Desa; Kelayakan Bantuan Sosial; Redis + Laravel Horizon; Docker + Laravel Sail; Benchmarking query lengkap; Security hardening | Notifikasi berjalan; enkripsi field aktif; deadline & reminder aktif; hasil benchmarking terdokumentasi (hash chain & dynamic form **tidak** termasuk — lihat Next Dev di `TDD-06_Appendix.md`) | Tahap 1 stabil |
| Next Dev — Paket 1 | Dynamic Tipe Surat: create tipe surat baru, WYSIWYG template editor, CRUD field requirement | Petugas Desa mandiri kelola tipe surat tanpa developer | Tahap 1 stabil — lihat detail di Appendix |
| Next Dev — Paket 2 | Blockchain-inspired hashing | Validasi integritas data surat | Tahap 1 stabil — lihat detail di Appendix |
| Tahap 3 — Pengembangan Lanjutan | WA Chatbot; cetak surat mandiri untuk Warga; integrasi API eksternal (Dukcapil); AI (opsional) | Multi-channel access, integrasi eksternal | Tahap 2 stabil, validasi kebutuhan client |

---

## 2. Asumsi & Risiko

### 2.1. Asumsi & Risiko Infrastruktur Teknis

| Asumsi | Risiko | Skenario Jika Salah | Mitigasi |
|---|---|---|---|
| Kantor desa memiliki akses internet yang stabil | SEDANG | Sistem tidak dapat diakses, data tidak bisa diinput/di-approve real-time | Desain UI toleran koneksi lambat; fitur draft offline-first (future) |
| Server deployment tersedia dengan spesifikasi minimum: 2 vCPU, 2GB RAM, 20GB SSD | TINGGI | Performa sistem degradasi; implementasi keamanan (HTTPS, fail2ban, firewall) tidak bisa diterapkan penuh | Dokumentasikan minimum server requirement sejak awal; siapkan alternatif managed hosting |
| Queue worker (Supervisor/Horizon) dapat dikonfigurasi dan dijaga tetap berjalan di server | SEDANG | Notifikasi tidak berjalan async, sistem terasa lambat atau fitur tidak berfungsi | Siapkan konfigurasi Supervisor sebagai bagian dari deployment script |
| PostgreSQL tersedia dan dapat dikonfigurasi di server deployment | RENDAH | Implementasi keamanan tidak bisa diterapkan penuh | Dokumentasikan minimum requirement server; siapkan alternatif shared hosting |
| Docker belum dipakai di Tahap 1, environment development manual | RENDAH | Environment berbeda antar device developer | Dokumentasikan versi PHP/PostgreSQL/extension; Docker masuk Tahap 2 |

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
| **Apakah Sekretaris Desa resmi ikut menjadi approver di step yang sama dengan Kepala Desa (saling menggantikan)?** | ⚠ **Belum dikonfirmasi eksplisit oleh desa** — saat ini diimplementasikan di kode sebagai asumsi/rekomendasi default (first-action-wins, app-layer check). Lihat `TDD-01_Overview_Scope_Roles.md` Section 3 dan `TDD-02_UseCase_Descriptions.md` UC-04c. | Direkomendasikan tim teknis mengikuti prinsip lama (Sekdes selalu scope identik Kades) — belum keputusan final dari pemilik proyek |

### 3.2. Keputusan Teknis Internal Tim

| Pertanyaan | Status | Jawaban |
|---|---|---|
| Queue driver Tahap 1: database | Sudah diputuskan | Database driver dipakai di Tahap 1, migrasi ke Redis di Tahap 2 |
| Docker + Laravel Sail masuk Tahap 2 | Sudah diputuskan | Ya |
| Apakah notifikasi email aktif di MVP atau in-app dulu? | Belum dikonfirmasi | — |
| React via REST API atau via Inertia | Sudah diputuskan | REST API (lihat OpenAPI Spec v5.0, `SID-ARCH-FE-001`) |
| Apakah fitur rotasi jabatan organisasi non-struktural diaktifkan di UI MVP? | Menunggu konfirmasi desa | — |
| Apakah kolom `assigned_role` di `letter_types` dipertahankan sebagai cache atau dihapus (karena redundan dengan `flow_steps.approver_position`)? | **Sudah diputuskan** | Dipertahankan sebagai kolom derived/cache untuk kompatibilitas mundur & kemudahan query. Source of truth resmi tetap `flow_steps`. Lihat `TDD-03_Database_Schema.md` Section 2.3 |
| ~~Konsistensi ENUM `approval_settings.approval_level` terhadap `letter_approvals.approval_level`~~ | **✅ Selesai / Closed** | Sudah diselaraskan — ENUM `approval_settings.approval_level` menggunakan 5 nilai yang sama dengan `letter_approvals.approval_level` (`rt`, `kepala_desa`, `sekdes`, `kasi_pelayanan`, `kaur_tu_umum`), dikonfirmasi dari migration project yang berjalan. Riwayat koreksi status ini ada di `TDD-06_Appendix.md`. |

---

## 4. Known Technical Constraints

Bagian ini mendokumentasikan keterbatasan teknis yang sudah dapat diprediksi sebelum development dimulai, beserta solusi yang telah dirancang.

| Constraint | Dampak | Solusi |
|---|---|---|
| Kolom AES-256 tidak bisa di-index langsung | Query by NIK/No KK tidak bisa pakai index | Dual-column: encrypted + hash untuk indexing (`nik_hash`, `no_kk_hash`) |
| Queue worker harus selalu aktif | Notifikasi tidak jalan jika worker mati | Supervisor (Tahap 1) → Laravel Horizon (Tahap 2) |
| `APP_KEY` tidak boleh berubah di production | Semua data terenkripsi tidak bisa didekripsi | Simpan `APP_KEY` di tempat aman; jangan pernah regenerate di prod |
| `on_behalf_of` nullable di MVP | Warga submit sendiri di MVP, kolom selalu NULL | Kolom tetap ada untuk future use case di mana petugas mungkin perlu input atas nama warga tertentu |
| Tabel `officials` harus selalu punya minimal 1 RT aktif per wilayah | Routing notifikasi dan gate approval bergantung pada RT aktif | Query selalu filter `is_active=true AND ended_at IS NULL`; fallback notifikasi ke semua `petugas_desa` aktif jika RT tidak ditemukan (broadcast) |
| Redis belum dipakai di Tahap 1 | Queue & cache belum optimal | Database queue cukup untuk traffic desa kecil, switch hanya ubah `.env` |
| Docker belum dipakai di Tahap 1 | Environment dev mungkin berbeda antar mesin | Dokumentasikan versi PHP/PostgreSQL, Docker masuk di Tahap 2 |
| Template surat di MVP diinject developer via seeder | Petugas Desa tidak bisa mandiri tambah tipe surat baru | Petugas contact developer → developer inject template → aktifkan di UC-21 |
| Tipe surat dengan `template=NULL` tidak bisa dipakai warga | Warga tidak bisa submit surat yang belum ada template | Guard di backend + badge "Draft" di admin page |
| Approval yang mandek tidak ada auto-resolve | Surat bisa stuck jika pejabat tidak action | Reminder via scheduler + badge overdue di dashboard |
| PDF on-demand: generate setiap klik | Slight latency saat download | Acceptable trade-off — tidak signifikan untuk traffic desa kecil |
| `village_org_positions` & `village_org_members` pending konfirmasi desa | Fitur rotasi jabatan organisasi belum bisa diaktifkan | Seed hardcode dulu; aktifkan/disable fitur di UI setelah konfirmasi |
| Blockchain-inspired hashing dikeluarkan dari MVP | Integritas data surat belum tervalidasi di MVP | Detail lengkap dicatat di `TDD-06_Appendix.md` untuk implementasi Next Dev Paket 2 |
| Tidak ada DB-level lock untuk mencegah Kades & Sekdes approve bersamaan | Kemungkinan kecil race condition di step yang sama | Disederhanakan sebagai app-layer check (first-action-wins), diterima sebagai trade-off untuk traffic desa kecil. Status keputusan bisnisnya sendiri masih terbuka — lihat Section 3.1 |
| Kolom `assigned_role` berpotensi redundan dengan `flow_steps.approver_position` | Ada dua sumber informasi "siapa approver" untuk Kasi/Kaur | Dipertahankan sebagai cache/derived column untuk kompatibilitas mundur; source of truth resmi tetap `flow_steps` |
| ~~`approval_settings.approval_level` ENUM belum diselaraskan dengan `letter_approvals.approval_level`~~ | — | **Sudah tidak berlaku** — ENUM sudah diselaraskan. Lihat Section 3.2 dan `TDD-06_Appendix.md` |
