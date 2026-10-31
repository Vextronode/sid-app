# ARSITEKTUR SISTEM
## SIDUTama (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | SID-ARCH-SYS-001 |
| Status | Berlaku (Aktif) - Versi 1.3 (diselaraskan ke source 2026-10-16) |
| Nama Aplikasi | SIDUTama (nama desa dan identitasnya diambil dari data `villages`, bukan di-hardcode) |
| Kode Proyek | SID |
| Audiens | Seluruh developer, Reviewer, Tech Lead, QA Coordinator, kontributor baru |
| Sifat Dokumen | Titik masuk tunggal. Detail teknis ada di dokumen turunan yang dirujuk. |

---

## 1. Visi & Prinsip Arsitektur

1. **Independent Domain.** SIDUTama berdiri sendiri (domain, database, deployment); interoperabilitas lewat API.
2. **Konfigurasi di atas Kode.** Jenis surat (template, isian form, slot tanda tangan, aksi data, kode klasifikasi) dan alur persetujuan (`approval_flows` → `flow_steps`) adalah data. Saat ini data tersebut diset developer lewat seeder; Staf SIDUTama mengatur masa berlaku, penugasan Kasi/Kaur, dan status aktif.
3. **RBAC Berlapis.** Tier navigasi (S4) di atas 9 role datar; otorisasi konteks per resource di Policy/Service.
4. **Human-in-the-Loop.** Approval surat dan penerapan perubahan data kependudukan tetap diputuskan manusia (RT, Kades/Sekdes, Kasi/Kaur/Staf SIDUTama).
5. **Satu desa per instalasi (praktik saat ini).** Skema mendukung banyak desa (`village_id`), tetapi deployment berjalan dengan satu desa; identitas desa dikelola lewat Kelola Profil Desa.

---

## 2. Peta Domain Bisnis

### 2.1 Pelayanan Surat-Menyurat
Warga (atau pejabat untuk dirinya) mengajukan surat dengan isian form dinamis per jenis surat, termasuk unggahan berkas dan saksi (warga ber-akun menyetujui lewat akunnya). Tidak ada TTD digital: surat terbit tanpa TTD dan stempel, dicetak lalu ditandatangani dan distempel basah di kantor desa, dan pemohon mengambilnya di sana (unduhan PDF tetap tersedia tanpa TTD). Alur default: **RT → Kepala Desa/Sekdes (final)**; RW & Kadus menerima FYI, Kasi/Kaur menerima notifikasi setelah final. Saat final approve sistem menerbitkan nomor surat (`{kode klasifikasi}/{urut}/Des/{bulan Romawi}/{tahun}`) dan membekukan **snapshot** render agar PDF tidak berubah. Jenis surat tertentu membawa **aksi data** (mis. menonaktifkan warga meninggal, menambah anak lahir) yang diterapkan Kasi/Kaur, dengan pop up daftar perubahan sebelum disimpan. Jenis surat dibagi **Persuratan Desa** (A01–A11, surat keterangan bernomor ditandatangani Kepala Desa) dan **Layanan Kependudukan** (F01–F10, formulir Disdukcapil tanpa nomor dan tanpa TTD Kepala Desa, plus formulir pendukung bersyarat dan Surat Kuasa F-1.07 bila diurus orang lain): setelah terbit, pemohon mengunggah hasil Disdukcapil di surat yang sama, Kasi Pemerintahan memverifikasi, lalu Terapkan. Overdue dihitung dari deadline approval; scheduler mengirim satu pengingat ke approver `reminder_hours` sebelum deadline.

### 2.2 Manajemen Kependudukan
Data warga (individu, 11 SHDK resmi Disdukcapil, dokumen & keterangan tambahan untuk Biodata Keluarga) dan KK, sosio-ekonomi per KK, katalog pekerjaan per desa, impor Excel. NIK, No KK, nomor akta, dan keterangan penyandang cacat terenkripsi. Warga tidak mengedit datanya langsung; perubahan diajukan lewat surat ber-aksi data.

### 2.3 Manajemen Informasi Desa (CMS)
Profil desa (identitas, kop surat, luas, jam layanan, titik kantor berupa koordinat, sambutan Kepala Desa, logo, foto beranda), berita berkategori, peraturan desa, pengumuman beranda berdurasi (dihapus otomatis), halaman informasi (PPID, Kebijakan Privasi, Aksesibilitas), organisasi non-struktural (BPD, LPM, Karang Taruna, PKK: Ketua, Wakil Ketua, Anggota). **Eksklusif `staf_sid`.** Halaman publik menampilkan profil, statistik terhitung (jumlah warga, dusun), perangkat desa (termasuk Staf SIDUTama), peraturan (section Profil Desa), struktur BPD dan Lembaga Desa, berita, info jenis surat, kontak, bar pengumuman, dan halaman informasi. BUMDesa dan Transparansi APBDes tampil "Segera hadir".

### 2.4 Governance & RBAC
Struktur wilayah (Dusun/RW/RT), jabatan berakun dan jenis jabatan tanpa akun yang dapat dikelola, akun pengguna, reset password & reset tanda tangan akun.

---

## 3. Komponen Sistem

```
┌───────────────────────┐   HTTPS (satu origin)   ┌────────────────────────┐
│ Browser / PWA         │◄──────────────────────►│ Nginx (sid-web)        │
│ React SPA + SW push   │                         │  - file statis SPA     │
└───────────────────────┘                         │  - /api,/sanctum,      │
        ▲  Web Push (VAPID)                       │    /storage → PHP-FPM  │
        │                                         └──────────┬─────────────┘
┌───────┴───────────────┐                                    │ FastCGI
│ Layanan push browser  │◄──── WebPushChannel ───┐ ┌─────────▼─────────────┐
└───────────────────────┘                        └─┤ Laravel API (sid-api) │
                                                   │ Sanctum, Policy,      │
                                                   │ dompdf, activitylog   │
                                                   └───┬──────────┬────────┘
                                                       │          │
                                         ┌─────────────▼──┐  ┌────▼──────────────┐
                                         │ PostgreSQL     │  │ Storage           │
                                         │ (lokal / Neon) │  │ public | private  │
                                         └────────────────┘  └───────────────────┘
```

Autentikasi Frontend–Backend: Laravel Sanctum SPA cookie (HttpOnly) + XSRF token. Detail di `SID-ARCH-FE-001` dan `SID-ARCH-BE-001`.

---

## 4. RBAC: Tier Navigasi vs Role Implementasi

Tier hanyalah label navigasi/guard frontend di atas `users.role` (9 nilai).

| Tier | Label | `users.role` | Scope |
|---|---|---|---|
| 1 | Superadmin | *(belum ada)* | Tidak diimplementasikan |
| 2 | Admin Desa / Eksekutif | `staf_sid`, `kepala_desa`, `sekretaris_desa` | Staf SIDUTama (`staf_sid`, tampil "Staf {nama aplikasi}", satu per desa, diganti lewat rotasi) = operator penuh desanya (CMS, kependudukan, jabatan, konfigurasi, semua surat). Kades/Sekdes = approver final tanpa akses CMS |
| 3 | Staff Desa | `kasi_pemerintahan`, `kaur_tu_umum` | Notifikasi & akses surat selesai sesuai `assigned_role`, menerapkan aksi data, membaca daftar warga; bukan approver. Kasi Pemerintahan memegang Layanan Kependudukan (F01–F10: verifikasi hasil Disdukcapil lalu Terapkan) dan mengelola Data Penduduk & KK; Kaur TU & Umum memegang Persuratan Desa (A01–A11). Kasi Pelayanan adalah jabatan tanpa akun |
| 4 | RT/RW/Kadus | `rt`, `rw`, `kadus` | RT approver wilayah; RW & Kadus hanya FYI read-only |
| 5 | Warga | `warga` | Ajukan surat, setujui/tolak permintaan saksi, unduh surat sendiri setelah terbit (ambil surat ber-TTD & stempel basah di kantor desa) |

Pejabat dengan citizen juga dapat mengajukan surat untuk dirinya (menu "Surat Saya").

---

## 5. Topologi Deployment

| Mode | Isi | Rujukan |
|---|---|---|
| Docker (expo/demo) | `sid_web` (Nginx + SPA, satu-satunya port host loopback), `sid_api` (PHP-FPM), `sid_scheduler` (`schedule:work`), `sid_worker` (`queue:work`), `sid_db` (PostgreSQL 18, profil `localdb`) atau DB Neon; volume `public`/`private`; `QUEUE_CONNECTION=database`, Web Push nonaktif bila VAPID kosong | `deploy/docker-compose.yml`, `docs/EXPO_RUNBOOK.md` |
| VPS (Nginx + PHP-FPM) | SPA statis + Laravel, Supervisor queue worker untuk Web Push, opcache | `docs/deploy/README.md` |
| Development | Vite dev server (proxy `/api`, `/sanctum` ke `127.0.0.1:8000`) + `php artisan serve` + PostgreSQL lokal | `docs/SETUP.md` |

Lokasi hosting staging/produksi (kampus/desa) **tidak diverifikasi** dari source.

---

## 6. Tabel Navigasi Dokumen

| Kebutuhan | Dokumen |
|---|---|
| Arsitektur Frontend | `SID-ARCH-FE-001` |
| Arsitektur Backend | `SID-ARCH-BE-001` |
| Kontrak API | `docs/api_spec/openapi.yaml` |
| TDD (scope, UC, skema, keamanan, roadmap) | `docs/technical_design/TDD-01` s.d. `TDD-06` |
| Diagram (UC, activity, sequence, class, ERD, component, deployment) | `docs/diagram/code/` |
| Business workflow per aktor | `docs/bussines_workflow/*.puml` |
| Aturan kode & testing | `docs/development/DEV-CODE-001`, `DEV-TEST-001` |
| Fitur terdokumentasi yang belum diimplementasi | `docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md` |

---

## 7. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Penyusunan awal |
| 1.1 | - | Tier vs role, terminologi pipeline, koreksi Non-NIK, CMS eksklusif Staf SIDUTama |
| 1.2 | 2026-10-06 | Sosio-ekonomi KK dan pekerjaan baku per desa |
| 1.3 | 2026-10-16 | Kategori surat dihapus; jenis surat data-driven, TTD pihak terkait, snapshot, aksi data; Web Push; identitas desa dari DB & halaman publik; topologi Docker/VPS; kotak "Endpoint Verifikasi QR" dihapus dari diagram komponen karena tidak ada di source |
| 1.4 | 2026-10-31 | TTD digital, TTD akun, TTD jabatan, stempel digital, dan reset TTD dihapus; surat terbit tanpa TTD/stempel (dibubuhkan basah di kantor desa); tersisa persetujuan saksi |
