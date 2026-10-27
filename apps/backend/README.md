# SIDUTama Backend

REST API Laravel untuk SIDUTama (Sistem Informasi Desa). Gambaran umum aplikasi, peran, dan cara menjalankan seluruh stack ada di [README utama](../../README.md); setup lokal rinci ada di [`docs/SETUP.md`](../../docs/SETUP.md).

## Stack

PHP 8.3+, Laravel 13, Laravel Sanctum (session/cookie SPA), PostgreSQL, DomPDF, spatie/laravel-activitylog, Maatwebsite Excel, Web Push, PHPUnit.

## Struktur

| Folder | Isi |
| --- | --- |
| `app/Http/Controllers/Api`, `app/Http/Requests`, `app/Http/Resources` | Endpoint API, validasi, dan bentuk respons |
| `app/Services` | Logika bisnis: pengajuan & persetujuan surat, Terapkan perubahan data (`LetterFulfillmentService`), PDF, snapshot, tanda tangan, kependudukan, audit |
| `app/Support` | Helper bersama, mis. `LetterFormSchema` (definisi & validasi isian form surat), `CitizenDocumentRules` |
| `app/Enums`, `app/Models`, `app/Policies`, `app/Repositories` | Enum peran/status, model Eloquent, otorisasi, akses data |
| `database/migrations` | Skema database (pre-produksi: migrasi diedit langsung, lalu `migrate:fresh --seed`) |
| `database/seeders` | Data awal & demo. `LetterTypeSeeder` (Persuratan Desa A01–A11), `ServiceLetterTypeSeeder` (Layanan Kependudukan F01–F10 + Surat Kuasa F-1.07) |
| `database/seeders/templates` | Formulir Disdukcapil (F-1.01, F-1.02, F-2.01, ...) hasil konversi dari Excel asli di `docs/template-surat/pelayanan` |
| `routes/api.php`, `routes/console.php` | Seluruh route API dan jadwal scheduler |
| `tests/Feature`, `tests/Unit` | Pengujian (SQLite in-memory) |

## Perintah

```powershell
composer install
php artisan migrate:fresh --seed   # hanya untuk database yang boleh di-reset
php artisan serve                  # API http://localhost:8000
php artisan schedule:work          # pengingat approval & pembersihan log
php artisan queue:work             # pengiriman Web Push

php artisan test                   # tidak menyentuh database di .env
.\vendor\bin\pint --test
```

Perintah artisan khusus aplikasi (`staf-sid:first`, `staf-sid:recover`, `approvals:send-reminders`, `letters:backfill-snapshots`) dijelaskan di README utama.

## Dokumentasi terkait

- [`docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md`](../../docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md): pola backend, jenis surat, aksi data, PDF, audit.
- [`docs/technical_design/TDD-03_Database_Schema.md`](../../docs/technical_design/TDD-03_Database_Schema.md): skema data dan enkripsi.
- [`docs/api_spec/openapi.yaml`](../../docs/api_spec/openapi.yaml): kontrak API.
