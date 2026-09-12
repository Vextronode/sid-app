# TECHNICAL DESIGN DOCUMENT — BAGIAN 4
## SISTEM INFORMASI DESA - DESA CIBENDA
### Keamanan Sistem, Non-Functional Requirements, Compliance

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 4 dari 5 (+ Appendix) |
| Status | v5.0 — mencerminkan state final saat ini |
| Cakupan | Keamanan per layer, klasifikasi data & threat modeling, NFR, compliance |
| Dokumen terkait | `TDD-03_Database_Schema.md` (strategi enkripsi field), `SID-ARCH-BE-001` (S8), OpenAPI Spec v5.0 |

---

## 1. Keamanan Sistem

### 1.1. Implementasi Keamanan per Layer

**Authentication & Authorization**

- Laravel Sanctum dengan SPA cookie-based auth, token disimpan di HttpOnly cookie (bukan localStorage)
- RBAC via middleware kustom + Laravel Policy — bukan murni `spatie/laravel-permission` generik, karena ada segmentasi non-hierarkis (role check + context check per resource, misal wilayah untuk RT, posisi untuk Kades/Sekdes/Staff)
- Session timeout otomatis untuk mencegah sesi yang ditinggalkan
- (Opsional) kemungkinan Token API Based menggantikan cookie-based di masa depan

**Data in Transit**

- Wajib HTTPS (TLS 1.2 / 1.3) di seluruh komunikasi client-server
- Force HTTPS dikonfigurasi di level Laravel (`AppServiceProvider`) dan web server
- Secure cookie + `SameSite=Strict` untuk mencegah CSRF lintas origin

**Data at Rest**

- Password pengguna: Argon2id (lebih tahan terhadap GPU brute-force dibanding bcrypt)
- Field sensitif NIK, No KK, dan alamat: AES-256-CBC via Laravel Encryption (`$casts = encrypted`) — detail lengkap di `TDD-03_Database_Schema.md` Section 5
- Key management: `APP_KEY` tersimpan di `.env`, tidak pernah di-commit ke repository

**Backend Security**

- CSRF protection aktif (default Laravel middleware)
- Semua input divalidasi via Laravel Form Request, tidak ada data yang masuk tanpa validasi
- Hanya menggunakan Eloquent ORM / Query Builder, raw query dilarang
- Rate limiting pada endpoint login dan seluruh API endpoint via Laravel Throttle
- Logging setiap failed login attempt
- Setiap endpoint decision (approve/reject) selalu melakukan re-validasi gate di dalam Service sebelum `DB::transaction()`, bukan hanya mengandalkan hasil Policy di awal request — pola *double-check* untuk menangani race condition antara buka halaman dan submit keputusan

**Frontend Security**

- Token autentikasi disimpan di HttpOnly cookie, tidak dapat diakses via JavaScript (XSS-proof)
- React melakukan auto-escape semua output, mencegah XSS dari data yang ditampilkan
- Data sensitif tidak disimpan di React state lebih lama dari yang diperlukan
- Tidak ada data sensitif yang muncul di browser console atau network log yang tidak perlu

**Logging & Audit Trail**

| Event yang Dicatat | Data yang Disimpan | Implementasi |
|---|---|---|
| Login & Logout | Timestamp, IP, user agent, status sukses/gagal | `spatie/activitylog` + custom listener |
| Failed Login Attempt | Timestamp, IP, email yang dicoba | Laravel event + log file |
| Perubahan status surat | Old status, new status, actor, IP | Tabel `letter_status_logs` |
| Akses data sensitif (NIK, No KK) | User, surat/data yang diakses, timestamp, IP | `spatie/activitylog` custom log |
| Perubahan data kritis | Model, kolom berubah, old value, new value | `spatie/activitylog` |

Audit trail dua lapis: `spatie/laravel-activitylog` untuk perubahan data model umum (CRUD warga, jabatan, dst), dan `letter_status_logs` sebagai audit trail khusus domain surat — dipisah karena domain surat butuh struktur query spesifik (riwayat per surat, urut kronologis) yang tidak sepenuhnya terlayani oleh log generik.

**Backup & Recovery**

- Backup database dijadwalkan otomatis via Laravel Scheduler
- File backup dienkripsi sebelum disimpan — tidak bisa dibaca tanpa decryption key
- Akses ke file backup dibatasi, terpisah dari direktori aplikasi
- Backup disimpan di lokasi terpisah dari server utama (offsite backup)

### 1.2. Infrastruktur & Deployment

- Wajib HTTPS (TLS 1.2 / 1.3), force HTTPS di konfigurasi Laravel
- Secure + SameSite cookie configuration
- Firewall aktif — hanya buka port 80, 443, dan SSH (port kustom)
- SSH key authentication — nonaktifkan password-based SSH login
- fail2ban aktif untuk proteksi brute-force pada SSH dan endpoint login
- Update rutin: OS, PHP, PostgreSQL, dan seluruh dependency
- Disable PHP error display di production — gunakan logging ke file
- Disable directory listing di konfigurasi web server

### 1.3. Compliance

| Regulasi / Standar | Relevansi | Implementasi dalam Sistem |
|---|---|---|
| UU PDP No. 27/2022 | NIK, No KK, dan data kependudukan adalah data pribadi yang dilindungi hukum | Field-level encryption, access log, data minimization (hanya kumpulkan data yang diperlukan) |
| SNI ISO/IEC 27001 | Framework internasional manajemen keamanan informasi | Dijadikan referensi kebijakan keamanan dan kontrol teknis yang diterapkan |
| Panduan BSSN / SPBE | Standar keamanan sistem pemerintahan berbasis elektronik di Indonesia | Acuan arsitektur keamanan dan deployment environment |

---

## 2. Klasifikasi Data & Threat Modeling

### 2.1. Klasifikasi Data

Seluruh data yang dikelola sistem diklasifikasikan ke dalam tiga level berdasarkan tingkat sensitivitas dan implikasi perlindungannya:

| Level | Data | Contoh | Perlakuan |
|---|---|---|---|
| Sangat Sensitif | Data pribadi desa dan kependudukan | NIK, No. KK, data pemohon surat, data sosio-ekonomi warga, data keuangan desa sensitif | Enkripsi AES-256 field-level, log setiap akses |
| Sensitif Sedang | Data identitas pengguna sistem | Nama, alamat, email, no. HP user | Proteksi RBAC, tidak expose di log publik |
| Rendah | Data publik/operasional | Nama desa, berita, profil desa, data aset desa (kode, nama, lokasi) | Standard protection |

### 2.2. Threat Modeling

**Aset yang Dilindungi:**

- Data NIK dan No. KK warga yang diproses dalam permohonan surat dan data keluarga
- Dokumen surat resmi dan riwayat keputusan approval (termasuk audit trail per `flow_step`)
- Kredensial (username & password) seluruh pengguna sistem
- Integritas rantai data (hash chain) yang membuktikan keaslian surat — lihat `TDD-06_Appendix.md` (Next Dev)
- Data sosio-ekonomi warga
- Data aset desa dan catatan keuangan desa

**Tabel Ancaman & Mitigasi:**

| Threat | Skenario | Mitigasi |
|---|---|---|
| Admin internal abuse | Akses atau modifikasi data tanpa keperluan resmi | RBAC ketat + audit log setiap akses data sensitif |
| Credential bocor | Login dari luar menggunakan kredensial yang bocor | Rate limiting + HttpOnly cookie + fail2ban di server |
| Database bocor langsung | Direct DB access saat server dikompromis | Field-level encryption — NIK/No KK tetap tidak terbaca meskipun DB bocor |
| Akun admin diambil alih | Full akses ke data seluruh desa oleh pihak tidak berwenang | Enkripsi data + audit trail + session timeout otomatis |
| SQL Injection | Input berbahaya dikirim via form atau API endpoint | Eloquent ORM only, hindari raw query, validasi semua input |
| XSS Attack | Skrip berbahaya diinjeksi melalui form input | React auto-escape + validasi dan sanitasi di backend |
| Backup tidak aman | File backup dibaca oleh pihak tidak berwenang | Backup dienkripsi sebelum disimpan, akses dibatasi |
| Misconfig server | Port terbuka, SSH password login aktif | Firewall + SSH key authentication + fail2ban |
| Race condition approval (Kades/Sekdes) | Kades dan Sekdes memproses surat yang sama di step yang sama secara bersamaan | Disederhanakan sebagai app-layer check (first-action-wins) — dicatat sebagai limitasi yang diterima, bukan solusi permanen. Lihat status keputusan terbuka di `TDD-05_Roadmap_Risks_OpenQuestions.md` |

---

## 3. Non-Functional Requirements

| Aspek | Requirement | Keterangan |
|---|---|---|
| Performance | Response API ≤ 500ms untuk operasi CRUD standar | Diukur di staging environment dengan data representatif |
| Performance | Response API ≤ 2000ms untuk operasi kompleks | Kompleks: query laporan, agregasi (generate hash Next Dev — lihat Appendix) |
| Concurrent Users | Minimal 50 concurrent users tanpa degradasi signifikan | Diuji dengan load testing tool (Apache JMeter / k6) |
| Scalability | Penambahan desa baru tanpa perubahan struktur database | Arsitektur modular — hanya tambah data, bukan skema |
| Scalability | Penambahan flow approval baru untuk jenis surat baru tanpa perubahan kode | Cukup tambah row di `approval_flows` + `flow_steps` (Config over Code) |
| Security | HTTPS wajib, Argon2id, AES-256, RBAC, rate limiting | Seluruh layer keamanan harus aktif di production |
| Reliability | Semua transaksi kritis menggunakan `DB::transaction()` | ACID compliance — data tidak boleh setengah tersimpan |
| Queue Reliability | Queue job dilengkapi retry mechanism | Notifikasi tidak boleh hilang jika gagal sekali |
| Availability | 99% uptime di staging/production environment | Downtime terencana (maintenance) tidak dihitung |
| Maintainability | Kode mengikuti standar PSR-12 | Enforced via PHP CS Fixer atau Laravel Pint |
| Documentation | Seluruh API endpoint terdokumentasi (OpenAPI/Swagger) | Wajib sebelum handover ke client — lihat `openapi.yaml` |
| Audit | Semua aksi kritis tercatat dengan timestamp dan IP address | Tidak boleh ada aksi tanpa jejak di sistem log |
