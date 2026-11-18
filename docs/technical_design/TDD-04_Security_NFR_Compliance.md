# TECHNICAL DESIGN DOCUMENT — BAGIAN 4
## SISTEM INFORMASI DESA - DESA CIBENDA
### Keamanan Sistem, Non-Functional Requirements, Compliance

| Atribut Dokumen | Keterangan |
|---|---|
| Bagian | 4 dari 5 (+ Appendix) |
| Status | v5.3 — diselaraskan ke source 2026-11-19 |
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
- Register: rate limit 5/menit per IP dan 10/jam per hash NIK; wajib NIK warga aktif + foto wajah dari kamera. Akun dibuat **nonaktif** dan baru aktif setelah petugas wilayah mencocokkan foto dengan warga yang dikenalnya. Semua kegagalan identitas dijawab satu pesan yang sama (tahan enumerasi NIK); NIK yang ditolak 3 kali diblokir dari pendaftaran online dan hanya dapat diaktifkan manual Staf SIDUTama di kantor desa.
- Lupa kata sandi: tautan email (akun ber-email), atau NIK + tanggal lahir yang disetujui Staf SIDUTama desa yang sama (throttle 5/menit per IP dan 5/jam per NIK). Kegagalan dijawab pesan yang sama; hanya pemegang token klaim (hash disimpan server, token di browser pengaju) yang dapat membuat kata sandi baru, maks 24 jam setelah disetujui. Akun Staf SIDUTama dikecualikan (pemulihan CLI).
- API integrasi pihak ketiga (`/api/integrations/v1`): bearer token milik `IntegrationClient` (guard `integration`), ditolak di route internal dan sebaliknya; hak per endpoint lewat Sanctum abilities; 60 request/menit per client; aksi menu Integrasi Staf SIDUTama mewajibkan kata sandi ulang.
- Session lifetime 120 menit (`SESSION_LIFETIME`), driver database.
- Menyetujui permintaan tanda tangan mewajibkan kata sandi ulang (`current_password`).

**Data in Transit**

- HTTPS: TLS diakhiri proxy di depan stack (`deploy/nginx`, `docs/deploy`) — **Di luar source**. Aplikasi mempercayai header proxy (`trustProxies('*')`) dan Nginx meneruskan `X-Forwarded-Proto`.
- Laravel **tidak** memaksa HTTPS (`URL::forceScheme`) — **Belum diimplementasi**.
- Cookie: `SESSION_SECURE_COOKIE` dari env; `SameSite` default **`lax`** (`SESSION_SAME_SITE`), bukan Strict.

**Data at Rest (Aktif)**

- Password: Argon2id (`HASH_DRIVER=argon2id`).
- Field terenkripsi (`$casts encrypted`, AES-256-CBC): `citizens.nik`, `families.no_kk`, `families.family_address`, `letters.applicant_nik`, `letters.applicant_address`, nomor akta & disabilitas warga, kontak `citizen_businesses`, serta kontak/riwayat kerja/kontrak `migrant_workers`. `citizens.address` tidak dienkripsi.
- NIK / No. KK pihak lain di isian surat dikirim tersamar di API (`LetterIdentityMask`); nilai utuh dibuka lewat tombol lihat yang tercatat.
- Berkas privat di disk `private_uploads` (lampiran surat, hasil dari instansi, foto pendaftaran akun dan foto permintaan ganti foto) hanya dilayani lewat endpoint terautentikasi dengan cek path folder dan `X-Content-Type-Options: nosniff`. Tidak ada TTD digital maupun stempel digital yang disimpan.
- Berkas publik (disk `public`): logo & foto beranda desa, foto pejabat, foto anggota organisasi desa, foto profil akun warga, thumbnail berita — sengaja publik untuk halaman publik dan avatar header. Halaman publik organisasi hanya mengirim nama dan foto (tanpa WA/catatan).
- `family_socioeconomics` belum dienkripsi (keputusan terbuka).
- `APP_KEY` di `.env`; entrypoint Docker gagal bila kosong dan tidak pernah membuat ulang key.

**Backend Security (Aktif)**

- CSRF via Sanctum; semua input divalidasi Form Request (isian surat divalidasi terhadap definisi jenis surat; isian tak dikenal ditolak).
- Upload: tipe & ukuran dibatasi (foto pendaftaran/ganti foto JPEG/PNG/WebP persegi 1:1 ≤ 5 MB; lampiran PDF/JPG/PNG ≤ 2 MB; foto pejabat/foto anggota organisasi/foto profil akun ≤ 5 MB; logo ≤ 2 MB; foto beranda ≤ 5 MB; thumbnail berita ≤ 2 MB).
- Template PDF dirender mentah, sehingga semua nilai dari data warga/isian di-escape (`e()`); hanya HTML buatan sistem (mis. logo kop) yang tidak di-escape.
- Permintaan saksi tahan enumerasi: jawaban sama apakah NIK punya akun atau tidak; pembatasan 3 penolakan per pasangan pemohon–NIK dalam 24 jam; pemilik NIK dapat memblokir pemohon; identitas penolak tidak diberitahukan.
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
| Tindakan atas akun: aktif/nonaktif, ubah akun, reset sandi oleh staf, keputusan permintaan lupa sandi, aktivasi pendaftaran (termasuk manual), ganti foto | activity log `user` / `password_reset_request` / `account_registration` / `profile_photo_request` (`AccountAuditService`; kata sandi tidak pernah dicatat); dilihat di Log Aktivitas tab akun | **Aktif** |
| Integrasi pihak ketiga (request API dan aksi menu Integrasi), peringatan SIGAP diturunkan/ditampilkan | activity log `integration` / `disaster_alert` (NIK dan nilai token tidak dicatat) | **Aktif** |
| Pemulihan kata sandi Staf SIDUTama lewat CLI (`staf-sid:recover`) | activity log `user`, event `staf_sid_recovered` (tanpa causer, `via: cli`) | **Aktif** |
| Percobaan login gagal | `Log::warning('Failed login attempt')` | **Aktif** |
| Login/logout sukses | — | **Belum diimplementasi** |
| Akses data sensitif (membuka NIK / No KK utuh warga, KK, pemohon, atau isian surat) | activity log event `identity_viewed` (`IdentityRevealService`; dibatasi 60/menit) | **Aktif** |
| CRUD data warga/KK manual, impor Excel, data sosio-ekonomi KK | activity log `citizen` / `family` (`PopulationAuditService`), event `created`/`updated`/`deleted`/`imported`/`socioeconomic_updated`; field berubah + nilai lama/baru, NIK/No KK/alamat KK disamarkan; dilihat di menu **Log Aktivitas**; tidak dibersihkan otomatis (bukti bila ada sengketa) | **Aktif** |

**Backup & Recovery** — **Di luar source** (jadwal, enkripsi, dan lokasi backup tidak diatur aplikasi).

### 1.2. Infrastruktur & Deployment

| Kontrol | Kondisi |
|---|---|
| Docker stack | `sid_net` internal; hanya `sid_web` membuka port ke host dan hanya di loopback (`127.0.0.1:${SID_HTTP_PORT}`); `sid_api`/`sid_worker` keluar internet hanya lewat `sid_egress` (DB Neon, layanan push browser) |
| Nginx | `server_tokens off`, `client_max_body_size 25m`, gzip; PHP hanya lewat front controller |
| PHP | `docker/php.ini`, opcache (`docs/deploy/opcache.ini.example`) |
| Firewall, SSH key-only, fail2ban, update OS | **Di luar source** |

### 1.3. Compliance

| Regulasi / Standar | Relevansi | Implementasi |
|---|---|---|
| UU PDP No. 27/2022 | NIK, No KK, data kependudukan, foto wajah, data CPMI | Enkripsi field, berkas privat, NIK ter-mask di respons, pembukaan NIK/No KK utuh tercatat, User-Agent perangkat push tidak disimpan mentah; persetujuan berbagi data usaha ke Cimart dipilih warga |
| SNI ISO/IEC 27001 | Kerangka keamanan informasi | Referensi kebijakan |
| Panduan BSSN / SPBE | Keamanan sistem pemerintahan elektronik | Referensi arsitektur |

---

## 2. Klasifikasi Data & Threat Modeling

### 2.1. Klasifikasi Data

| Level | Contoh | Perlakuan |
|---|---|---|
| Sangat Sensitif | NIK, No. KK, data pemohon surat, lampiran surat, foto wajah pendaftaran, data CPMI (kontak, riwayat kerja, kontrak), data sosio-ekonomi | Enkripsi field/berkas sesuai TDD-03; berkas privat; RBAC + Policy |
| Sensitif Sedang | Nama, alamat, email, no. HP pengguna | RBAC; tidak tampil di halaman publik |
| Rendah | Profil desa, berita, peraturan, foto pejabat, struktur & foto organisasi desa, logo | Publik, di-cache |

### 2.2. Threat Modeling

| Threat | Skenario | Mitigasi |
|---|---|---|
| Admin internal abuse | Akses/modifikasi data tanpa keperluan | RBAC + Policy; perubahan data penduduk, surat, jabatan, dan akun diaudit; pembukaan NIK/No KK utuh tercatat (`identity_viewed`) |
| Credential bocor | Login dengan kredensial bocor | Throttle login; akun hasil register aktif hanya setelah petugas wilayah mencocokkan foto wajah |
| Pendaftaran memakai NIK orang lain | Penyerang mengetahui NIK warga | Foto wajah diperiksa petugas wilayah sebelum akun aktif; pesan gagal seragam; 3 penolakan memblokir NIK dari pendaftaran online |
| Lupa sandi disalahgunakan | Penyerang tahu NIK + tanggal lahir korban | Wajib persetujuan Staf SIDUTama desa yang sama; token klaim hanya di perangkat pengaju; berlaku 24 jam; pengajuan baru menggantikan yang lama |
| Token integrasi bocor | Pihak lain memanggil API integrasi | Token per client dengan ability terbatas, rate limit, dapat dirotasi/dicabut dan client dinonaktifkan dari menu Integrasi |
| Database bocor | Akses DB langsung | Enkripsi field sensitif (TDD-03 S5) |
| Penyalahgunaan permintaan saksi | Spam/enumerasi NIK | Jawaban seragam, rate limit penolakan, blokir, kata sandi saat setuju |
| Tanda tangan dipalsukan | PDF unduhan dicetak lalu diberi TTD palsu | PDF unduhan sengaja tanpa TTD/stempel; surat sah hanya cetakan ber-TTD & stempel basah dari kantor desa, nomor surat dapat dicek ke desa |
| XSS lewat isian surat | Isian berisi HTML/skrip masuk PDF | Escape semua nilai isian sebelum disisipkan template |
| SQL Injection | Input berbahaya | Eloquent + binding, escape wildcard LIKE |
| Race condition approval / Terapkan | Dua aktor bersamaan | Row lock + cek ulang; 409 |
| Reset password disalahgunakan | Akun tidak berwenang mereset | Hanya Staf SIDUTama; `must_change_password` |
| Misconfig server | Port terbuka | Docker: satu port loopback; sisanya di luar source |

### 2.3. Pengamanan jabatan dan akun Staf SIDUTama

- Jabatan berakun hanya berubah lewat promote/demote/rotate (transaksional, audit).
- Akun tidak dapat menonaktifkan dirinya; Staf SIDUTama aktif terakhir tidak dapat diturunkan.
- Petugas pertama dibuat sekali lewat `php artisan staf-sid:first --nik=...` (password sementara dicetak sekali, wajib diganti).
- Pemulihan darurat bila Staf SIDUTama tidak dapat login: `php artisan staf-sid:recover --username=...` (kata sandi sementara, `must_change_password`, sesi & token dicabut, activity log `staf_sid_recovered`). Jalur lupa sandi tanpa email tidak berlaku untuk akun Staf SIDUTama.

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
| Documentation | Seluruh endpoint di OpenAPI | Semua route API dan route auth web terdokumentasi di `docs/api_spec` (lint valid, 2026-11-19); `/api/integrations/v1` di spec pihak ketiga (`docs/thirdparty`) |
| Audit | Aksi kritis tercatat | Lihat tabel logging S1.1 |
