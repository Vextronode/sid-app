# SIDUTama Cibenda

**Sistem Informasi Desa (SID)** untuk Desa Cibenda. Aplikasi web ini mendigitalisasi layanan administrasi surat, pengelolaan data kependudukan, informasi publik desa, dan alur kerja perangkat desa.

> Status: pengembangan aktif. Kode, migration, dan route yang berjalan adalah sumber kebenaran implementasi; dokumen di `docs/` diselaraskan dengannya.

Nama aplikasi yang tampil ke pengguna (judul, `<title>`, manifest PWA, label peran staf) dapat diganti lewat `SID_APP_NAME` (backend) dan `VITE_APP_NAME` (frontend). Default-nya **SIDUTama**, sehingga peran staf aplikasi (`staf_sid`) tampil sebagai **Staf SIDUTama**; dokumen di repo ini memakai nama default tersebut.

## Fitur utama

- **Surat online:** warga (atau pejabat untuk dirinya sendiri) mengajukan surat dengan form dinamis per jenis surat, unggahan berkas, dan tanda tangan pihak terkait; status dipantau sampai PDF dapat diunduh. Pilihan jenis surat dikelompokkan menjadi **Persuratan Desa** (surat keterangan desa) dan **Layanan Kependudukan** (formulir kependudukan Disdukcapil). Seeder menyediakan 11 jenis surat keterangan Persuratan Desa (A01–A11, termasuk Surat Keterangan Ahli Waris yang berlaku tanpa batas). Isian pekerjaan di form memakai katalog pekerjaan desa, dengan pilihan "Lainnya" yang teksnya dirapikan dan hanya dicetak di surat.
- **Layanan Kependudukan (F01–F10):** Surat Pernyataan Tidak Memiliki Dokumen Kependudukan, Perubahan Elemen Data, Pindah Keluar, Pindah Datang, Pelaporan Kelahiran, Pelaporan Kematian, Pelaporan Perkawinan/Perceraian, Pengakuan Anak, Perubahan Susunan KK, dan Pelaporan Pengangkatan Anak. Tiap layanan menerbitkan formulir Disdukcapil yang dibangun dari Excel aslinya (F-1.01, F-1.02, F-2.01, dst.) beserta formulir pendukung yang hanya terbit bila dibutuhkan jawaban form; formulir tanpa nomor dan tanpa TTD Kepala Desa, TTD pemohon dan pejabat (RT/RW, Kasi Pemerintahan) ditempel otomatis saat final. Isian mengambil data dari database (anggota KK, NIK warga desa, data orang tua, kode wilayah) dan memeriksa aturan seperti urutan tanggal, SHDK sesuai jenis kelamin, dan satu kepala keluarga. Pihak lain (saksi, pasangan, kepala KK tujuan, penerima kuasa) diminta persetujuannya lewat akunnya. Semua layanan punya opsi **"Diurus orang lain"** yang menerbitkan Surat Kuasa F-1.07. Setelah formulir terbit, pemohon mengunggah hasil dari Disdukcapil di surat yang sama; setelah diverifikasi Kasi Pemerintahan, perubahan data warga/KK diterapkan otomatis lewat **Terapkan** dengan pop up daftar perubahan (lama → baru) untuk dikonfirmasi.
- **Persetujuan:** alur default **RT → Kepala Desa/Sekretaris Desa (final)**. RW dan Kadus menerima pemberitahuan setelah RT menyetujui; Kasi Pemerintahan / Kaur TU & Umum menerima surat yang sudah final sesuai penugasan jenis suratnya (seluruh jenis surat bawaan A01–A11 ditugaskan ke Kaur TU & Umum). Saat final, sistem menerbitkan nomor surat dan membekukan snapshot render PDF.
- **Deadline & pengingat:** tiap tahap punya batas waktu; surat yang lewat deadline ditandai overdue, dan scheduler mengirim satu pengingat ke approver `reminder_hours` sebelum deadline.
- **Masa berlaku surat:** dicap saat final approve dari pengaturan jenis surat. Surat yang kedaluwarsa tetap tampil sebagai riwayat, tetapi pemohon tidak dapat lagi mengunduh atau mem-preview PDF-nya.
- **Data kependudukan:** warga (termasuk 11 SHDK resmi Disdukcapil serta dokumen & keterangan tambahan untuk Biodata Keluarga: gelar, akta lahir/perkawinan/perceraian, kelainan fisik & mental), Kartu Keluarga, data sosio-ekonomi KK, wilayah Dusun/RW/RT, dan katalog pekerjaan, dengan impor Excel. NIK, No KK, nomor akta, dan keterangan penyandang cacat disimpan terenkripsi.
- **Log Aktivitas:** setiap perubahan data warga/KK oleh staf tercatat (nilai lama → baru, data sensitif disamarkan), bersama riwayat status semua surat, dalam satu halaman khusus Staf SIDUTama.
- **Konten publik:** beranda, profil desa, berita berkategori, peraturan desa, struktur pemerintahan, BPD, LPM/Karang Taruna/PKK, dan informasi jenis surat.
- **Notifikasi:** in-app (lonceng) dan Web Push (PWA).

## Role

| Role | Tanggung jawab utama |
| --- | --- |
| Warga | Mengajukan, melacak, dan mengunduh surat miliknya |
| RT | Approver tahap pertama untuk warga di wilayahnya |
| RW / Kadus | Menerima pemberitahuan dan melihat surat di wilayahnya setelah disetujui RT |
| Kepala Desa / Sekretaris Desa | Approver final |
| Kasi Pemerintahan / Kaur TU & Umum | Menerima, mengunduh, dan menerapkan perubahan data dari surat yang sudah final sesuai penugasan. Kaur TU & Umum memegang surat keterangan desa (A01–A11); Kasi Pemerintahan memegang Layanan Kependudukan (verifikasi hasil dari Disdukcapil, lalu Terapkan) dan ikut mengelola Data Penduduk & KK seperti Staf SIDUTama; Kaur TU & Umum hanya melihat Data Penduduk & KK. Kasi Pelayanan adalah jabatan tanpa akun |
| Staf SIDUTama (`staf_sid`) | Mengelola akun, jabatan, data kependudukan, wilayah, konten desa, konfigurasi jenis surat & deadline, serta memantau seluruh surat dan Log Aktivitas. Hanya **satu per desa**; pergantian lewat Rotasi |

## Arsitektur

Monorepo ini memiliki dua aplikasi independen:

```text
sid-app/
├── apps/
│   ├── backend/     Laravel REST API
│   └── frontend/    React SPA (Vite)
├── deploy/          docker compose + skrip deploy stack expo
├── docs/            desain teknis, arsitektur, spesifikasi API, dan panduan tim
└── README.md
```

- **Backend:** PHP 8.3+, Laravel 13, Laravel Sanctum, DomPDF, spatie/laravel-activitylog, queue & scheduler Laravel, PHPUnit.
- **Frontend:** React 19, Vite 8, React Router, TanStack Query, Axios, Tailwind CSS v4, Vitest, React Testing Library.
- **Autentikasi:** Laravel Sanctum berbasis session/cookie HttpOnly. Token tidak disimpan di `localStorage` atau `sessionStorage`.
- **Database:** PostgreSQL (`DB_CONNECTION=pgsql`). Test backend memakai SQLite in-memory.

## Prasyarat

- PHP 8.3+ dengan ekstensi `pdo_pgsql` (dan `gd` dengan dukungan WebP untuk optimasi gambar)
- Composer
- Node.js 20.19+ atau 22.12+ (syarat Vite 8)
- PostgreSQL

## Menjalankan secara lokal

Langkah lengkap ada di [`docs/SETUP.md`](docs/SETUP.md). Ringkasnya:

### 1. Backend

```powershell
cd apps\backend
composer install
copy .env.example .env
php artisan key:generate
```

Buat database PostgreSQL, lalu sesuaikan `apps/backend/.env`:

```env
SID_APP_NAME=SIDUTama

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sidutama
DB_USERNAME=postgres
DB_PASSWORD=isi_password_postgresql_anda

FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173

QUEUE_CONNECTION=database
```

> `.env.example` default-nya menunjuk ke `vite preview` (port 4173). Untuk `npm run dev`, pakai port 5173 seperti di atas (versi yang di-comment di `.env.example`).

Isi database. Untuk database lokal yang boleh di-reset, pakai seeder demo:

```powershell
php artisan migrate:fresh --seed
php artisan storage:link
```

Seeder membuat Desa Cibenda lengkap dengan wilayah, perangkat desa, warga, berita, dan akun demo (mis. `demo_admin` untuk Staf SIDUTama, `demo_warga` untuk warga, `demo_warga2`/`demo_warga3` untuk istri dan anaknya; kata sandi `Password123!`). Daftar lengkap akun ada di SETUP. Seeder demo menolak berjalan di `APP_ENV=production`.

Untuk database tanpa data demo, buat Staf SIDUTama pertama dengan `php artisan staf-sid:first` (lihat SETUP).

### 2. Proses backend yang dijalankan

Jalankan di `apps\backend`, masing-masing di terminal terpisah dan biarkan terbuka:

| Terminal | Perintah | Fungsi | Wajib? |
| --- | --- | --- | --- |
| 1 | `php artisan serve` | API di `http://localhost:8000` | Ya |
| 2 | `php artisan schedule:work` | Scheduler: pengingat approval tiap 5 menit, pembersihan log aktivitas harian | Untuk fitur pengingat |
| 3 | `php artisan queue:work` | Worker antrean: mengirim **semua** Web Push | Untuk push browser |

- Notifikasi in-app (lonceng) selalu masuk tanpa worker. Dengan `QUEUE_CONNECTION=database`, Web Push diantrekan dan baru terkirim saat `queue:work` jalan; yang tertunda langsung terkirim begitu worker dinyalakan.
- Alternatif lokal paling ringkas: set `QUEUE_CONNECTION=sync` agar push dikirim langsung tanpa worker (tombol submit/approve sedikit lebih lambat).
- Setelah mengubah kode backend atau `.env`, restart `queue:work` dan `schedule:work` (Ctrl+C lalu jalankan lagi).
- Script `composer dev` / `composer setup` bawaan template Laravel menjalankan `npm` di folder backend yang tidak punya `package.json`; jangan dipakai, jalankan perintah di atas secara manual.

### 3. Frontend

```powershell
cd apps\frontend
npm install
copy .env.example .env
npm run dev
```

`apps/frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=SIDUTama
VITE_VAPID_PUBLIC_KEY=
```

Samakan `VITE_APP_NAME` dengan `SID_APP_NAME`, dan `VITE_VAPID_PUBLIC_KEY` dengan `VAPID_PUBLIC_KEY` backend bila Web Push dipakai. Gunakan host yang sama dengan `SANCTUM_STATEFUL_DOMAINS` (jangan campur `localhost` dan `127.0.0.1`). Frontend tersedia di `http://localhost:5173`.

### 4. Test dan pemeriksaan kode

```powershell
# Backend (memakai SQLite in-memory, tidak menyentuh database .env)
cd apps\backend
php artisan test
.\vendor\bin\pint --test

# Frontend
cd apps\frontend
npm run lint
npm run format:check
npm run typecheck
npm run test:run
npm run build
```

`npm run typecheck` (`tsc --noEmit`) wajib bersih; `npm run build` tidak memeriksa tipe. `npm run format` merapikan format semua file. CI menjalankan kelima perintah frontend ini.

## Perintah artisan khusus aplikasi

| Perintah | Kegunaan |
| --- | --- |
| `php artisan staf-sid:first --nik=... [data citizen]` | Bootstrap Staf SIDUTama pertama (ditolak bila sudah ada staf aktif) |
| `php artisan staf-sid:recover --username=... [--force]` | Pemulihan darurat bila Staf SIDUTama lupa kata sandi: kata sandi sementara, wajib ganti saat login, sesi lama dicabut, tercatat |
| `php artisan approvals:send-reminders` | Kirim pengingat approval yang jatuh tempo sekarang (normalnya otomatis lewat `schedule:work`) |
| `php artisan letters:backfill-snapshots` | Bekukan snapshot render untuk surat approved lama yang belum punya snapshot |

## Deploy (stack expo Docker)

Stack Docker (`sid_db`, `sid_api`, `sid_scheduler`, `sid_worker`, `sid_web`) dijalankan lewat skrip di `deploy/scripts/` dengan image yang dibangun CI. Di Docker, `QUEUE_CONNECTION=database`: push diantrekan dan dikirim service `sid_worker`, sedangkan scheduler berjalan di service `sid_scheduler`, jadi tidak perlu menjalankan worker atau scheduler manual. Panduan operasional ada di [`docs/EXPO_RUNBOOK.md`](docs/EXPO_RUNBOOK.md).

## Konvensi penting

- Seluruh endpoint backend berada di `apps/backend/routes/api.php`; jadwal scheduler di `apps/backend/routes/console.php`; kontrak API di [`docs/api_spec/openapi.yaml`](docs/api_spec/openapi.yaml).
- Kode frontend dikelompokkan per domain di `src/features/`; halaman route berada di `src/pages/`.
- Request browser harus mengirim cookie (`withCredentials`) dan mengambil CSRF cookie Sanctum sebelum login.
- Identitas desa (nama, kontak, logo) berasal dari database dan dikelola lewat Kelola Profil Desa, bukan di-hardcode di frontend.
- Jangan memasukkan secret atau file `.env` ke Git. Jika menambah environment variable, tambahkan juga ke `.env.example` dan dokumentasikan perubahannya.

## Kontribusi

Gunakan branch dari `dev` dengan format `feature/deskripsi`, `fix/deskripsi`, atau `docs/deskripsi`. Buat pull request ke `dev`, pastikan lint/test relevan sudah dijalankan, lalu tunggu minimal satu approval sebelum *squash merge*. Jangan push langsung ke `main` atau `dev`.

## Dokumentasi

| Dokumen | Kegunaan |
| --- | --- |
| [`docs/SETUP.md`](docs/SETUP.md) | Panduan setup lokal (Windows) yang lebih rinci |
| [`docs/EXPO_RUNBOOK.md`](docs/EXPO_RUNBOOK.md) | Deploy dan operasional stack Docker expo |
| [`docs/technical_design/TDD-01_Overview_Scope_Roles.md`](docs/technical_design/TDD-01_Overview_Scope_Roles.md) | Tujuan, ruang lingkup MVP, role, dan alur surat |
| [`docs/technical_design/TDD-02_UseCase_Descriptions.md`](docs/technical_design/TDD-02_UseCase_Descriptions.md) | Aturan bisnis dan use case |
| [`docs/technical_design/TDD-03_Database_Schema.md`](docs/technical_design/TDD-03_Database_Schema.md) | Skema data, enkripsi, dan strategi indexing |
| [`docs/technical_design/TDD-04_Security_NFR_Compliance.md`](docs/technical_design/TDD-04_Security_NFR_Compliance.md) | Keamanan, audit trail, kebutuhan nonfungsional, dan compliance |
| [`docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md`](docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md) | Roadmap, risiko, dan keputusan terbuka |
| [`docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md`](docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md) | Titik masuk arsitektur sistem dan pemetaan RBAC |
| [`docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md`](docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md) | Pola backend, pipeline, notifikasi, scheduler, dan audit trail |
| [`docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md`](docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md) | Pola frontend, routing, API client, dan design system |
| [`docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md`](docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md) | Fitur yang terdokumentasi tetapi belum diimplementasi |
| [`docs/STRUKTUR_FOLDER.md`](docs/STRUKTUR_FOLDER.md) | Struktur dan aturan organisasi kode |
| [`docs/api_spec/00_INDEX.md`](docs/api_spec/00_INDEX.md) | Indeks spesifikasi API |
| [`docs/development/DEV-CODE-001_Code_Guidelines.md`](docs/development/DEV-CODE-001_Code_Guidelines.md) | Konvensi kode frontend dan automasi kualitas |
| [`docs/development/DEV-TEST-001_Testing.md`](docs/development/DEV-TEST-001_Testing.md) | Strategi serta cakupan pengujian |
| [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) | Aturan branch, commit, PR, review, dan rilis |
| [`docs/Environment Standardization.md`](docs/Environment%20Standardization.md) | Aturan environment variable dan pengelolaan secret |
| [`docs/diagram/code/`](docs/diagram/code/) | Source PlantUML untuk use case, sequence, ERD, class, dan deployment |

## Batasan MVP

Modul aset dan keuangan desa, integrasi Dukcapil, WhatsApp Bot, blockchain penuh, notifikasi email status surat, serta editor dinamis tipe/template surat belum termasuk MVP. Rencana pengembangannya dicatat pada [appendix desain teknis](docs/technical_design/TDD-06_Appendix.md) dan [audit docs](docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md).
