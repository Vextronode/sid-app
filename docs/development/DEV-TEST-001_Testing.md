# STRATEGI & CAKUPAN PENGUJIAN (TESTING)
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | DEV-TEST-001 |
| Status | Berlaku (Aktif) - Versi 1.2 |
| Audiens | Developer, QA Coordinator, Tech Lead |

---

## 1. Filosofi Cakupan Pengujian

Mengingat batasan waktu program (target stabilitas ±2 bulan untuk SIDUTama sebagai critical path program), cakupan pengujian ditetapkan secara **pragmatis** - memprioritaskan logic bisnis kritikal, bukan cakupan menyeluruh (100% coverage bukan target). End-to-end testing menyeluruh dapat menjadi peningkatan pada fase stabilisasi berikutnya, bukan syarat delivery Tahap 2.

---

## 2. Frontend

**Tools yang digunakan:** Vitest (environment jsdom, setup `src/test/setup.ts`) + React Testing Library + `@testing-library/user-event`; jalankan `npm run test` (mode watch) / `npm run test:run` (sekali jalan). Test ditempatkan berdampingan dengan berkasnya (`*.test.ts` / `*.test.tsx`). Helper data uji (`partialFixture`, `DeepPartial`, `present`) ada di `src/test/fixtures.ts`; aturan penulisannya di `DEV-CODE-001` A.8 butir 9. Playwright terpasang untuk skrip screenshot (`npm run shot:beranda`), belum untuk suite E2E.

**CI (`.github/workflows/ci.yml`, job frontend):** `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, lalu `npm run build`. Semua harus lolos.

**Wajib diuji (unit test):**
- Aturan siapa yang boleh memutus surat (`canDecideOnLetter`, `features/approval/utils/canDecide.test.ts`): tombol Setuju/Tolak hanya untuk peran yang cocok dengan step aktif dan status yang masih dapat diputuskan.
- Utilitas form schema-driven di `features/surat/utils` (isian/opsi bersyarat `visible_when` di `fieldCondition`, susunan payload `letterFormData`, peringatan batas pelaporan `reportDeadline`, saksi, progres surat) - memastikan form mengikuti `form_fields` per jenis surat.
- Logika yang juga ada di backend dan harus sama hasilnya, mis. hubungan penanggung jawab CPMI (`features/data-cpmi/guardianRelation.test.ts`).
- Modul API fitur baru (mis. `activity-log/api.test.ts`, `pelanggan-notifikasi/api.test.ts`) dan komponen dengan aturan tampil per peran/flag (mis. `AktivasiAkunSection`, `CpmiSayaCard`).

**Tidak wajib pada tahap ini:** pengujian end-to-end (E2E) menyeluruh terhadap seluruh alur pipeline.

---

## 3. Backend

**Tools yang digunakan:** PHPUnit melalui Laravel Test Runner (`php artisan test`). Konfigurasi suite tersedia di `apps/backend/phpunit.xml` dengan database SQLite in-memory untuk menjalankan test di lokal.

**CI memakai PostgreSQL, bukan SQLite.** Job backend di `.github/workflows/ci.yml` menjalankan service `postgres:16`, `php artisan migrate --force`, `vendor/bin/pint --test`, lalu `php artisan test` dengan `DB_CONNECTION=pgsql`. Akibatnya beberapa kesalahan hanya muncul di CI, terutama tipe kolom: mencari kolom UUID dengan string yang bukan UUID lolos di SQLite tetapi gagal di PostgreSQL. Validasi nilai seperti itu (mis. `Str::isUuid`) sebelum dipakai di query, dan jangan menganggap test lokal yang hijau berarti CI juga hijau.

Beberapa test menjaga aturan lintas kode, misalnya `tests/Unit/EloquentOnlyWritesTest` (tidak ada mass update langsung ke tabel tertentu) dan `tests/Feature/LetterTypeDefinitionConsistencyTest` (definisi jenis surat di seeder konsisten dengan template dan aturan isiannya).

Backend memiliki dua jenis pengujian:

| Jenis | Lokasi | Fokus |
|---|---|---|
| Unit Test | `apps/backend/tests/Unit` | Menguji logic pada service, repository, model, enum, migration, atau komponen Backend secara terisolasi. |
| Feature Test | `apps/backend/tests/Feature` | Menguji endpoint API dari request sampai response, termasuk autentikasi, otorisasi, validasi, status HTTP, dan struktur payload. |

### 3.1 Unit Test

1. Unit Test wajib ditambahkan atau diperbarui saat mengubah business logic service, query repository, perilaku model, enum, atau migration yang kritikal.
2. Test harus memverifikasi hasil logic dan efek samping yang relevan, misalnya data tersimpan, relasi/approval terbentuk, status berubah, atau akses ditolak.
3. Gunakan factory, `RefreshDatabase`, fake Laravel (misalnya notification), dan dependency yang diperlukan agar test deterministik serta tidak bergantung pada data lokal.
4. Nama test menjelaskan perilaku yang diuji, misalnya `test_create_letter_persists_letter_status_log_and_first_approval`.

### 3.2 Feature Test (Endpoint Test)

1. Setiap endpoint baru atau perubahan kontrak endpoint wajib memiliki Feature Test di `tests/Feature`.
2. Cakupan minimum endpoint meliputi: akses guest/tidak terautentikasi bila relevan, akses pengguna yang berwenang, validasi input gagal, respons sukses, status HTTP, dan bentuk data JSON.
3. Skenario otorisasi per role wajib diuji bila endpoint memiliki pembatasan role atau scope data.
4. Gunakan helper HTTP Laravel seperti `getJson`, `postJson`, `putJson`, atau `deleteJson`, kemudian assert dengan `assertStatus`, `assertJson`, `assertJsonPath`, atau assertion yang paling spesifik.
5. Feature Test tidak boleh bergantung pada database lokal; gunakan `RefreshDatabase` serta factory/seed data yang didefinisikan oleh test.

### 3.3 Menjalankan Test

Jalankan dari direktori `apps/backend`:

```bash
composer test
```

Atau jalankan seluruh test dengan:

```bash
php artisan test
```

Untuk menjalankan satu suite, gunakan `php artisan test --testsuite=Unit` atau `php artisan test --testsuite=Feature`; untuk satu berkas/test, `php artisan test --filter=LetterPaperOptionTest`. Format kode diperiksa `vendor/bin/pint --test` (CI menolak bila tidak rapi).

---

## 4. Kriteria Definition of Done Terkait Pengujian

Selaras dengan struktur task baku program (PIC, Reviewer, Deadline, Definition of Done), setiap task yang menyentuh logic kritikal pada S2 (Frontend) wajib menyertakan test terkait sebagai bagian dari Definition of Done sebelum masuk tahap QA Validation.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Rancangan Awal |
| 1.1 | 2026-09-12 | Menambahkan strategi pengujian Backend dengan PHPUnit, Unit Test, dan Feature Test endpoint. |
| 1.2 | 2026-11-19 | Frontend: setup dan berkas test TypeScript, helper `src/test/fixtures.ts`, langkah CI; daftar wajib-uji diganti komponen yang ada (`canDecideOnLetter`, utilitas form surat, logika yang dicerminkan backend). Backend: CI berjalan di PostgreSQL 16 dengan migrate dan Pint, beda perilaku SQLite vs PostgreSQL, test arsitektur, `--filter` |
