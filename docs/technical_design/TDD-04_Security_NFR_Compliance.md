# TECHNICAL DESIGN DOCUMENT — BAGIAN 4
## SISTEM INFORMASI DESA - DESA CIBENDA
### Keamanan Sistem, Non-Functional Requirements, Compliance

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 4 dari 5 (+ Appendix) |
| Status | v5.2 — Kependudukan, Stempel & Pekerjaan |
| Cakupan | Keamanan per layer, klasifikasi data & threat modeling, NFR, compliance |
| Dokumen terkait | `TDD-03_Database_Schema.md` (strategi enkripsi field), `SID-ARCH-BE-001` (S8), OpenAPI Spec v5.2 |

---

## 1. Keamanan Sistem

### 1.1. Implementasi Keamanan per Layer

**Authentication & Authorization**

- Laravel Sanctum dengan SPA cookie-based auth, token disimpan di HttpOnly cookie (bukan localStorage)
- RBAC memakai middleware aplikasi (`EnsureUserHasRole`) dan Laravel Policy untuk konteks resource; `spatie/laravel-permission` tidak tercantum di `composer.json`.
- Semua route protected API memakai middleware `account.active`; akun yang dinonaktifkan mendapat HTTP 403 dengan kode `account_inactive`. Logout tetap diizinkan agar sesi dapat diakhiri.
- Session timeout otomatis untuk mencegah sesi yang ditinggalkan
- (Opsional) kemungkinan Token API Based menggantikan cookie-based di masa depan

**Data in Transit**

- Wajib HTTPS (TLS 1.2 / 1.3) di seluruh komunikasi client-server
- Force HTTPS dikonfigurasi di level Laravel (`AppServiceProvider`) dan web server
- Secure cookie + `SameSite=Strict` untuk mencegah CSRF lintas origin

**Data at Rest**

- Password pengguna: Argon2id (lebih tahan terhadap GPU brute-force dibanding bcrypt)
- Login memakai username dengan pembatasan 5 percobaan gagal per username/IP; registrasi NIK diberi rate limit khusus
- Password reset sementara mewajibkan `must_change_password`; perubahan password menghapus guard ini
- Permintaan terproteksi ditolak dengan HTTP 403 dan kode `password_change_required` sampai password diganti
- Field sensitif terenkripsi AES-256-CBC via Laravel Encryption (`$casts = encrypted`): `citizens.nik`, `families.no_kk`, `families.family_address`, `letters.applicant_nik`, `letters.applicant_address`. Catatan: `citizens.address` **tidak** dienkripsi (teks biasa). Detail lengkap di `TDD-03_Database_Schema.md` Section 5
- Data sosio-ekonomi tersimpan per keluarga di `family_socioeconomics`; tabel tersebut belum menggunakan cast enkripsi. Keputusan enkripsi data sosio-ekonomi belum final.
- Key management: `APP_KEY` tersimpan di `.env`, tidak pernah di-commit ke repository

**Backend Security**

- CSRF protection aktif (default Laravel middleware)
- Semua input divalidasi via Laravel Form Request, tidak ada data yang masuk tanpa validasi
- File stempel desa dan TTD pejabat disimpan di private storage, dengan tipe gambar PNG/JPEG/WebP dan batas ukuran 5 MB. Preview dilayani sebagai binary lewat endpoint terautentikasi dan dibatasi scope desa; respons menerapkan `Cache-Control: private, no-store` dan `X-Content-Type-Options: nosniff`. Resource profil desa mengembalikan indikator, bukan path stempel baru; resource pejabat tidak mengembalikan path tanda tangan, tetapi tetap membawa field legacy `officials.stamp_img`.
- Hanya menggunakan Eloquent ORM / Query Builder, raw query dilarang
- Rate limit terdaftar: registrasi 5 permintaan/menit per IP dan 10/jam per hash NIK; pengiriman verifikasi email 6/menit. Source tidak memasang rate limit global pada seluruh API.
- Source tidak mencatat failed login ke log aplikasi secara khusus.
- Setiap endpoint decision (approve/reject) selalu melakukan re-validasi gate di dalam Service sebelum `DB::transaction()`, bukan hanya mengandalkan hasil Policy di awal request — pola *double-check* untuk menangani race condition antara buka halaman dan submit keputusan

**Frontend Security**

- Token autentikasi disimpan di HttpOnly cookie, tidak dapat diakses via JavaScript (XSS-proof)
- React melakukan auto-escape semua output, mencegah XSS dari data yang ditampilkan
- Data sensitif tidak disimpan di React state lebih lama dari yang diperlukan
- Tidak ada data sensitif yang muncul di browser console atau network log yang tidak perlu

**Logging & Audit Trail**

| Event yang Dicatat | Data yang Disimpan | Implementasi | Status |
|---|---|---|---|
| Login & Logout | Timestamp, IP, user agent, status sukses/gagal | — | **Planned** — tidak ada listener atau logging login/logout di source; `spatie/activitylog` tidak dipanggil untuk event auth |
| Failed Login Attempt | Timestamp, IP, username yang dicoba | Laravel throttle (rate limiter) | Rate limiter mencegah brute-force; pencatatan eksplisit ke log file **Planned** |
| Perubahan status surat | Old status, new status, actor, IP | Tabel `letter_status_logs` | **Aktif** |
| Akses data sensitif (NIK, No KK) | User, surat/data yang diakses, timestamp, IP | — | **Planned** — tidak ada model yang menggunakan trait `LogsActivity`; pencatatan akses data sensitif belum diimplementasikan |
| Perubahan data kritis (CRUD warga, dsb.) | Model, kolom berubah, old value, new value | — | **Planned** — tidak ada model yang menggunakan trait `LogsActivity`; `spatie/activitylog` terpasang di `composer.json` tetapi hanya dipakai untuk jabatan |
| Promote/demote/rotate jabatan | Aktor (atau null untuk CLI), official, operasi dan perubahan terkait | `spatie/laravel-activitylog`, log `official` via `OfficialAssignmentService` | **Aktif** |

Audit trail saat ini terdiri dari dua mekanisme aktif: `letter_status_logs` untuk perubahan status surat (audit trail domain), dan `spatie/laravel-activitylog` **hanya untuk operasi jabatan** (`OfficialAssignmentService` memanggil `activity('official')`). Tidak ada model aplikasi yang menggunakan trait `LogsActivity` untuk mencatat perubahan CRUD secara otomatis. Pencatatan login/logout, akses data sensitif, dan CRUD model umum masih berstatus **Planned**.

**Backup & Recovery**

- Jadwal dan mekanisme backup database **Tidak diverifikasi terhadap source backend**; implementasi backup bisa berada di luar aplikasi.
- Enkripsi file backup sebelum penyimpanan **Tidak diverifikasi terhadap source backend** — tidak bisa dibaca tanpa decryption key
- Pembatasan akses file backup **Tidak diverifikasi terhadap source backend**.
- Penyimpanan backup di luar server utama **Tidak diverifikasi terhadap source backend**.

### 1.2. Infrastruktur & Deployment

> **Status: Tidak diverifikasi terhadap source backend** ??? pengaturan TLS, cookie pada proxy, firewall, SSH, fail2ban, pembaruan OS, logging web server, dan directory listing bergantung pada deployment di luar source aplikasi.


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
| UU PDP No. 27/2022 | NIK, No KK, dan data kependudukan adalah data pribadi yang dilindungi hukum | NIK/No KK dan field surat tertentu dienkripsi; pencatatan akses data sensitif **Tidak diverifikasi terhadap source backend** |
| SNI ISO/IEC 27001 | Framework internasional manajemen keamanan informasi | Dijadikan referensi kebijakan keamanan dan kontrol teknis yang diterapkan |
| Panduan BSSN / SPBE | Standar keamanan sistem pemerintahan berbasis elektronik di Indonesia | Acuan arsitektur keamanan dan deployment environment |

---

## 2. Klasifikasi Data & Threat Modeling

### 2.1. Klasifikasi Data

Seluruh data yang dikelola sistem diklasifikasikan ke dalam tiga level berdasarkan tingkat sensitivitas dan implikasi perlindungannya:

| Level | Data | Contoh | Perlakuan |
|---|---|---|---|
| Sangat Sensitif | Data pribadi desa dan kependudukan | NIK, No. KK, data pemohon surat, data sosio-ekonomi warga, data keuangan desa sensitif | Cast enkripsi hanya diterapkan pada field yang dirinci di TDD-03; pencatatan semua akses **Tidak diverifikasi terhadap source backend** |
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
| Backup tidak aman | File backup dibaca oleh pihak tidak berwenang | Kontrol backup **Tidak diverifikasi terhadap source backend** |
| Misconfig server | Port terbuka, SSH password login aktif | Firewall + SSH key authentication + fail2ban |
| Race condition approval (Kades/Sekdes) | Kades dan Sekdes memproses surat yang sama di step yang sama secara bersamaan | Keputusan dijalankan dalam transaksi dengan row lock pada surat; request berikutnya memeriksa ulang status dan step, lalu ditolak dengan HTTP 409 jika sudah diproses. |
| Reset password disalahgunakan | Password akun diubah oleh akun yang tidak berwenang atau password sementara tetap dipakai | Hanya Petugas Desa dapat reset akun non-Petugas lain; guard `must_change_password` mewajibkan penggantian saat berikutnya |

### 2.3. Pengamanan jabatan dan akun Petugas Desa

- Jabatan akun hanya diubah melalui promote/demote/rotate; operasi akun dan official dilakukan dalam satu transaksi.
- Akun tidak dapat menonaktifkan dirinya sendiri. Petugas Desa aktif terakhir tidak dapat diturunkan melalui alur dashboard/API; tidak ada opsi CLI `--force` untuk melewati guard tersebut.
- Petugas pertama diinisialisasi satu kali melalui CLI `petugas:first --nik=...`. Command dapat membuat citizen, akun, dan jabatan dalam satu transaksi, atau menggunakan citizen/akun warga yang sudah ada. Username dibuat otomatis; password sementara acak dicetak sekali dan wajib diganti saat login pertama. Command menolak jika Petugas Desa aktif sudah ada. Demote dan reset password dilakukan melalui dashboard/API dengan guard otorisasi.
- Belum ada command atau prosedur pemulihan darurat bawaan jika tidak ada Petugas Desa yang dapat login. `petugas:first` hanya menerima citizen baru, citizen tanpa akun, atau akun warga yang memenuhi syarat; command bukan mekanisme reset akun Petugas yang sudah ada. Prosedur operasional pemulihan perlu ditetapkan terpisah sebelum produksi.
- Perubahan jabatan diaudit melalui activity log; command bootstrap mencatat log tanpa causer.

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
