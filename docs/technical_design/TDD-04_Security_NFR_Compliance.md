# TECHNICAL DESIGN DOCUMENT — BAGIAN 4
## SISTEM INFORMASI DESA - DESA CIBENDA
### Keamanan Sistem, Non-Functional Requirements, Compliance

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 4 dari 5 (+ Appendix) |
| Status | v5.3 — diselaraskan ke source 2026-10-16 |
| Cakupan | Keamanan per layer, klasifikasi data & threat modeling, NFR, compliance |
| Dokumen terkait | `TDD-03_Database_Schema.md` (enkripsi field), `SID-ARCH-BE-001` (S8), OpenAPI Spec v5.3, `docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md` |

> Kolom **Status** di dokumen ini: **Aktif** = ada di source; **Belum diimplementasi** = tercatat di audit docs; **Di luar source** = bergantung konfigurasi server/deployment.

---

## 1. Keamanan Sistem

### 1.1. Implementasi Keamanan per Layer

**Authentication & Authorization (Aktif)**

- Laravel Sanctum SPA cookie (HttpOnly) + XSRF token (`X-XSRF-TOKEN`); frontend tidak menyimpan token di localStorage.
- Middleware grup: `auth:sanctum`, `account.active` (403 `account_inactive`), `password.changed` (403 `password_change_required` kecuali `GET /api/user`, `PUT /api/profile/password`, `/logout`), lalu `role:` per grup (403 `role_forbidden`). Role dibaca dari DB setiap request, sehingga perubahan peran (rotasi/turun jabatan) langsung berlaku tanpa memutus sesi; FE memakai `role_forbidden` untuk mengalihkan ke dashboard peran baru. Konteks resource di Policy (`LetterPolicy`, `OfficialPolicy`, `RegionPolicy`) dan Service.
- Login dengan username; throttle 5 percobaan gagal per `username|IP`, lockout 1 jam; percobaan gagal dicatat `Log::warning` (username, IP, user agent).
- Register: rate limit 5/menit per IP dan 10/jam per hash NIK; wajib NIK terdaftar **dan** tanggal lahir yang cocok dengan data kependudukan.
- Session lifetime 120 menit (`SESSION_LIFETIME`), driver database.
- Menyetujui permintaan tanda tangan mewajibkan kata sandi ulang (`current_password`).

**Data in Transit**

- HTTPS: TLS diakhiri proxy di depan stack (`deploy/nginx`, `docs/deploy`) — **Di luar source**. Aplikasi mempercayai header proxy (`trustProxies('*')`) dan Nginx meneruskan `X-Forwarded-Proto`.
- Laravel **tidak** memaksa HTTPS (`URL::forceScheme`) — **Belum diimplementasi**.
- Cookie: `SESSION_SECURE_COOKIE` dari env; `SameSite` default **`lax`** (`SESSION_SAME_SITE`), bukan Strict.

**Data at Rest (Aktif)**

- Password: Argon2id (`HASH_DRIVER=argon2id`).
- Field terenkripsi (`$casts encrypted`, AES-256-CBC): `citizens.nik`, `families.no_kk`, `families.family_address`, `letters.applicant_nik`, `letters.applicant_address`. `citizens.address` tidak dienkripsi.
- Berkas TTD pribadi akun dienkripsi (`Crypt::encryptString`) sebelum disimpan.
- Berkas privat di disk `private_uploads` (stempel desa, TTD jabatan Kades, TTD akun, lampiran surat) hanya dilayani lewat endpoint terautentikasi dengan cek path folder, `Cache-Control: private, no-store` (TTD/stempel) dan `X-Content-Type-Options: nosniff`.
- Berkas publik (disk `public`): logo & foto beranda desa, foto pejabat, foto anggota organisasi desa, foto profil akun warga, thumbnail berita — sengaja publik untuk halaman publik dan avatar header. Halaman publik organisasi hanya mengirim nama dan foto (tanpa WA/catatan).
- `family_socioeconomics` belum dienkripsi (keputusan terbuka).
- `APP_KEY` di `.env`; entrypoint Docker gagal bila kosong dan tidak pernah membuat ulang key.

**Backend Security (Aktif)**

- CSRF via Sanctum; semua input divalidasi Form Request (isian surat divalidasi terhadap definisi jenis surat; isian tak dikenal ditolak).
- Upload: tipe & ukuran dibatasi (lampiran/TTD basah PDF/JPG/PNG ≤ 2 MB; TTD akun PNG/JPG ≤ 512 KB; stempel/TTD jabatan/foto pejabat/foto anggota organisasi/foto profil akun ≤ 5 MB; logo ≤ 2 MB; foto beranda ≤ 5 MB; thumbnail berita ≤ 2 MB).
- Template PDF dirender mentah, sehingga semua nilai dari data warga/isian di-escape (`e()`); hanya HTML buatan sistem (logo, TTD, stempel) yang tidak di-escape.
- Permintaan tanda tangan tahan enumerasi: jawaban sama apakah NIK punya akun atau tidak; pembatasan 3 penolakan per pasangan pemohon–NIK dalam 24 jam; pemilik NIK dapat memblokir pemohon; identitas penolak tidak diberitahukan.
- Keputusan approval dan Terapkan memakai row lock (`lockForUpdate`) + cek ulang status di dalam transaksi.
- Hanya Eloquent/Query Builder dengan binding; pencarian `LIKE` meng-escape `%` dan `_`.
- Akun yang dinonaktifkan lewat Terapkan (warga meninggal) dicabut token-nya.
- `Model::preventLazyLoading()` mencegah N+1 tersembunyi.

**Frontend Security (Aktif)**

- Cookie HttpOnly; React auto-escape output.
- Build produksi membuang `console.*` dan `debugger`.
- Service worker hanya membuka URL notifikasi same-origin.

**Logging & Audit Trail**

| Event | Implementasi | Status |
|---|---|---|
| Perubahan status surat (termasuk alasan sistem: menunggu TTD, ditahan, tahap dilewati, Terapkan) | `letter_status_logs` (aktor, IP, user agent otomatis) | **Aktif** |
| Promote/demote/rotate jabatan | activity log `official` | **Aktif** |
| Perubahan data warga dari surat (Terapkan) | activity log `citizen`, event `letter_fulfilled` | **Aktif** |
| Reset tanda tangan akun | activity log `user_signature`, event `reset` | **Aktif** |
| Percobaan login gagal | `Log::warning('Failed login attempt')` | **Aktif** |
| Login/logout sukses | — | **Belum diimplementasi** |
| Akses data sensitif (NIK, No KK) | — | **Belum diimplementasi** |
| CRUD data warga/KK manual | — (tidak ada `LogsActivity`) | **Belum diimplementasi** |

**Backup & Recovery** — **Di luar source** (jadwal, enkripsi, dan lokasi backup tidak diatur aplikasi).

### 1.2. Infrastruktur & Deployment

| Kontrol | Kondisi |
|---|---|
| Docker stack | `sid_net` internal; hanya `sid_web` membuka port ke host dan hanya di loopback (`127.0.0.1:${SID_HTTP_PORT}`); `sid_api` keluar internet hanya lewat `sid_egress` (DB Neon) |
| Nginx | `server_tokens off`, `client_max_body_size 25m`, gzip; PHP hanya lewat front controller |
| PHP | `docker/php.ini`, opcache (`docs/deploy/opcache.ini.example`) |
| Firewall, SSH key-only, fail2ban, update OS | **Di luar source** |

### 1.3. Compliance

| Regulasi / Standar | Relevansi | Implementasi |
|---|---|---|
| UU PDP No. 27/2022 | NIK, No KK, data kependudukan, tanda tangan | Enkripsi field & berkas TTD, berkas privat, NIK ter-mask di respons; pencatatan akses data sensitif belum ada |
| SNI ISO/IEC 27001 | Kerangka keamanan informasi | Referensi kebijakan |
| Panduan BSSN / SPBE | Keamanan sistem pemerintahan elektronik | Referensi arsitektur |

---

## 2. Klasifikasi Data & Threat Modeling

### 2.1. Klasifikasi Data

| Level | Contoh | Perlakuan |
|---|---|---|
| Sangat Sensitif | NIK, No. KK, data pemohon surat, tanda tangan pribadi, lampiran surat, data sosio-ekonomi | Enkripsi field/berkas sesuai TDD-03; berkas privat; RBAC + Policy |
| Sensitif Sedang | Nama, alamat, email, no. HP pengguna | RBAC; tidak tampil di halaman publik |
| Rendah | Profil desa, berita, peraturan, foto pejabat, struktur & foto organisasi desa, logo | Publik, di-cache |

### 2.2. Threat Modeling

| Threat | Skenario | Mitigasi |
|---|---|---|
| Admin internal abuse | Akses/modifikasi data tanpa keperluan | RBAC + Policy; perubahan data dari surat & jabatan diaudit; audit akses data sensitif belum ada |
| Credential bocor | Login dengan kredensial bocor | Throttle login, register butuh NIK + tanggal lahir |
| Database bocor | Akses DB langsung | Enkripsi field & berkas TTD |
| Penyalahgunaan permintaan TTD | Spam/enumerasi NIK | Jawaban seragam, rate limit penolakan, blokir, kata sandi saat setuju |
| Tanda tangan dipalsukan | TTD diganti setelah surat terbit | TTD akun tidak dapat diubah sendiri; snapshot membekukan TTD Kades; reset tercatat |
| XSS lewat isian surat | Isian berisi HTML/skrip masuk PDF | Escape semua nilai isian sebelum disisipkan template |
| SQL Injection | Input berbahaya | Eloquent + binding, escape wildcard LIKE |
| Race condition approval / Terapkan | Dua aktor bersamaan | Row lock + cek ulang; 409 |
| Reset password disalahgunakan | Akun tidak berwenang mereset | Hanya Petugas Desa; `must_change_password` |
| Misconfig server | Port terbuka | Docker: satu port loopback; sisanya di luar source |

### 2.3. Pengamanan jabatan dan akun Petugas Desa

- Jabatan berakun hanya berubah lewat promote/demote/rotate (transaksional, audit).
- Akun tidak dapat menonaktifkan dirinya; Petugas Desa aktif terakhir tidak dapat diturunkan.
- Petugas pertama dibuat sekali lewat `php artisan staf-sid:first --nik=...` (password sementara dicetak sekali, wajib diganti).
- Belum ada prosedur pemulihan darurat bila tidak ada Petugas Desa yang dapat login.

---

## 3. Non-Functional Requirements

| Aspek | Requirement | Kondisi source |
|---|---|---|
| Performance | API CRUD ≤ 500 ms; operasi kompleks ≤ 2000 ms | Paginasi DB, agregasi SQL untuk ringkasan, index performa, cache halaman publik 10 menit, gambar publik dioptimasi WebP; belum ada hasil benchmark terdokumentasi |
| Concurrent Users | ≥ 50 tanpa degradasi signifikan | Belum diuji (load test belum ada) |
| Scalability | Desa baru tanpa ubah skema | Data ber-`village_id`; seeder per desa |
| Scalability | Jenis surat/flow baru tanpa ubah kode | Jenis surat & flow adalah data (via seeder developer) |
| Security | HTTPS, Argon2id, AES-256, RBAC, rate limiting | Lihat S1; HTTPS di proxy |
| Reliability | Transaksi kritis atomik | `DB::transaction()` + rollback berkas yang sudah ditulis |
| Notifikasi | In-app tidak hilang bila push gagal | Kanal database sinkron; Web Push diantrekan dan independen |
| Availability | 99% uptime | Healthcheck container (`/up`, FPM ping, `/healthz`); target belum diukur |
| Maintainability | PSR-12 | Laravel Pint |
| Documentation | Seluruh endpoint di OpenAPI | 134/134 route terdokumentasi (lint valid) |
| Audit | Aksi kritis tercatat | Lihat tabel logging S1.1 |
