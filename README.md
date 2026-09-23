# SIDUTama Cibenda

**Sistem Informasi Desa (SID)** untuk Desa Cibenda. Aplikasi web ini mendigitalisasi layanan administrasi surat, pengelolaan data kependudukan, informasi publik desa, dan alur kerja petugas desa.

> Status: pengembangan aktif. Dokumen desain dan OpenAPI v5.0 adalah target arsitektur/migrasi; gunakan kode, migration, dan route yang berjalan sebagai sumber kebenaran implementasi saat ini.

## Fitur utama

- Warga dapat mendaftar, masuk, mengajukan surat, memantau status, dan mengunduh surat PDF yang telah disetujui.
- Persetujuan surat ditargetkan memakai alur dinamis berbasis kategori, flow, dan langkah approval (`letter_categories`, `approval_flows`, dan `flow_steps`).
- Data warga, kartu keluarga, wilayah Dusun/RW/RT, pengguna, jabatan, berita, peraturan desa, dan profil desa adalah domain utama aplikasi.
- Halaman publik mencakup beranda, profil desa, berita, peraturan, serta informasi jenis surat.
- Notifikasi in-app merupakan bagian dari alur; pengiriman email masih menunggu keputusan aktivasi MVP.

Alur default surat pada desain MVP adalah **Warga → RT → Kepala Desa/Sekretaris Desa → Kasi Pelayanan/Kaur TU & Umum**. RW menerima notifikasi FYI setelah persetujuan RT dan bukan approver. Flow lain dapat memiliki tahapan berbeda sesuai konfigurasi.

## Role

| Role | Tanggung jawab utama |
| --- | --- |
| Warga | Mengajukan, melacak, dan mengunduh surat miliknya |
| RT | Memverifikasi pengajuan pada wilayahnya |
| RW | Menerima notifikasi FYI |
| Kepala Desa / Sekretaris Desa | Approver pada tahap pemeriksaan desa |
| Kasi Pelayanan / Kaur TU & Umum | Memproses persetujuan akhir dan penerbitan surat |
| Petugas Desa | Mengelola data master, konten desa, wilayah, pengguna, dan memantau seluruh surat |
| Kadus | Jabatan struktural dan akses non-approval |

## Arsitektur

Monorepo ini memiliki dua aplikasi independen:

```text
sid-app/
├── apps/
│   ├── backend/     Laravel REST API
│   └── frontend/    React SPA (Vite)
├── docs/            desain teknis, arsitektur, spesifikasi API, dan panduan tim
└── README.md
```

- **Backend:** PHP 8.3+, Laravel 13, Laravel Sanctum, DomPDF, queue database, dan PHPUnit.
- **Frontend:** React 19, Vite, React Router, TanStack Query, Axios, Tailwind CSS, Zod, Vitest, dan React Testing Library.
- **Autentikasi:** Laravel Sanctum berbasis session/cookie HttpOnly. Token tidak disimpan pada `localStorage` atau `sessionStorage`.

### Database

Project menggunakan **PostgreSQL 18**. Gunakan konfigurasi `pgsql` yang sama pada setiap environment dan dokumentasikan environment variable baru di `.env.example`.

## Prasyarat

- PHP 8.3+ beserta ekstensi `pdo_pgsql`
- Composer
- Node.js 18+ dan npm
- PostgreSQL 18

## Menjalankan secara lokal

### 1. Backend

```powershell
cd apps\backend
composer install
copy .env.example .env
php artisan key:generate
```

Buat database PostgreSQL, kemudian sesuaikan `apps/backend/.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sid_cibenda
DB_USERNAME=postgres
DB_PASSWORD=isi_password_postgresql_anda

FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
```

Lalu jalankan migration dan server API:

```powershell
php artisan migrate
php artisan serve
```

API tersedia di `http://localhost:8000`.

Jika Anda menguji notifikasi asynchronous atau reminder deadline, jalankan worker dan scheduler pada terminal terpisah:

```powershell
cd apps\backend
php artisan queue:work
php artisan schedule:work
```

### 2. Frontend

Buka terminal kedua:

```powershell
cd apps\frontend
npm install
npm run dev
```

Jika frontend dan backend dijalankan pada origin berbeda, buat `apps/frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000/api
```

Frontend tersedia di `http://localhost:5173`.

### 3. Menjalankan test dan pemeriksaan kode

```powershell
# Backend
cd apps\backend
php artisan test

# Frontend
cd apps\frontend
npm run lint
npm run test:run
npm run build
```

## Konvensi penting

- Seluruh endpoint backend berada di `apps/backend/routes/api.php`; kontrak API ada di [`docs/api_spec/openapi.yaml`](docs/api_spec/openapi.yaml).
- Kode frontend dikelompokkan per domain di `src/features/`; halaman route berada di `src/pages/`.
- Request browser harus mengirim cookie (`withCredentials`) dan mengambil CSRF cookie Sanctum sebelum login.
- Data sensitif seperti NIK, nomor KK, dan alamat dirancang memakai enkripsi field-level serta hash terpisah untuk pencarian.
- Jangan memasukkan secret atau file `.env` ke Git. Jika menambah environment variable, tambahkan juga ke `.env.example` dan dokumentasikan perubahannya.

## Kontribusi

Gunakan branch dari `dev` dengan format `feature/deskripsi`, `fix/deskripsi`, atau `docs/deskripsi`. Buat pull request ke `dev`, pastikan lint/test relevan sudah dijalankan, lalu tunggu minimal satu approval sebelum *squash merge*. Jangan push langsung ke `main` atau `dev`.

## Dokumentasi

| Dokumen | Kegunaan |
| --- | --- |
| [`docs/technical_design/TDD-01_Overview_Scope_Roles.md`](docs/technical_design/TDD-01_Overview_Scope_Roles.md) | Tujuan, ruang lingkup MVP, role, dan alur surat |
| [`docs/technical_design/TDD-02_UseCase_Descriptions.md`](docs/technical_design/TDD-02_UseCase_Descriptions.md) | Aturan bisnis dan use case |
| [`docs/technical_design/TDD-03_Database_Schema.md`](docs/technical_design/TDD-03_Database_Schema.md) | Skema data, enkripsi, dan strategi indexing |
| [`docs/technical_design/TDD-04_Security_NFR_Compliance.md`](docs/technical_design/TDD-04_Security_NFR_Compliance.md) | Keamanan, kebutuhan nonfungsional, dan compliance |
| [`docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md`](docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md) | Roadmap, risiko, dan keputusan terbuka |
| [`docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md`](docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md) | Titik masuk arsitektur sistem dan pemetaan RBAC |
| [`docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md`](docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md) | Pola backend, pipeline, notifikasi, dan audit trail |
| [`docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md`](docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md) | Pola frontend, routing, API client, dan design system |
| [`docs/SETUP.md`](docs/SETUP.md) | Panduan setup Windows yang lebih rinci |
| [`docs/STRUKTUR_FOLDER.md`](docs/STRUKTUR_FOLDER.md) | Struktur dan aturan organisasi kode |
| [`docs/api_spec/00_INDEX.md`](docs/api_spec/00_INDEX.md) | Indeks spesifikasi API |
| [`docs/development/DEV-CODE-001_Code_Guidelines.md`](docs/development/DEV-CODE-001_Code_Guidelines.md) | Konvensi kode frontend dan automasi kualitas |
| [`docs/development/DEV-TEST-001_Testing.md`](docs/development/DEV-TEST-001_Testing.md) | Strategi serta cakupan pengujian |
| [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) | Aturan branch, commit, PR, review, dan rilis |
| [`docs/Environment Standardization.md`](docs/Environment%20Standardization.md) | Aturan environment variable dan pengelolaan secret |
| [`docs/diagram/code/`](docs/diagram/code/) | Source PlantUML untuk use case, sequence, ERD, class, dan deployment |

## Batasan MVP

Modul aset dan keuangan desa, integrasi Dukcapil, WhatsApp Bot, blockchain penuh, serta editor dinamis tipe/template surat belum termasuk MVP. Rencana pengembangannya dicatat pada [appendix desain teknis](docs/technical_design/TDD-06_Appendix.md).
