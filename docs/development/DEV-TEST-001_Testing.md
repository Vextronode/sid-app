# STRATEGI & CAKUPAN PENGUJIAN (TESTING)
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | DEV-TEST-001 |
| Status | Berlaku (Aktif) - Versi 1.0 |
| Audiens | Developer, QA Coordinator, Tech Lead |

---

## 1. Filosofi Cakupan Pengujian

Mengingat batasan waktu program (target stabilitas ±2 bulan untuk SIDUTama sebagai critical path program), cakupan pengujian ditetapkan secara **pragmatis** - memprioritaskan logic bisnis kritikal, bukan cakupan menyeluruh (100% coverage bukan target). End-to-end testing menyeluruh dapat menjadi peningkatan pada fase stabilisasi berikutnya, bukan syarat delivery Tahap 2.

---

## 2. Frontend

**Tools yang direkomendasikan:** Vitest + React Testing Library - pasangan yang umum digunakan untuk proyek berbasis Vite. *(Rekomendasi ini masih menunggu konfirmasi/ACC eksplisit sebelum ditetapkan sebagai wajib.)*

**Wajib diuji (unit test):**
- Logic render `ApprovalStepRenderer` berdasarkan kombinasi `approver_ref` dan `authority_type` - memastikan tombol Reject hanya muncul saat `reject_capable`.
- Validasi schema-driven form (React Hook Form + Zod) - memastikan pesan error muncul sesuai skema field requirement per `LetterType`.

**Tidak wajib pada tahap ini:** pengujian end-to-end (E2E) menyeluruh terhadap seluruh alur pipeline.

---

## 3. Backend

**Tools yang digunakan:** PHPUnit melalui Laravel Test Runner (`php artisan test`). Konfigurasi suite tersedia di `apps/backend/phpunit.xml` dengan database SQLite in-memory untuk environment testing.

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

Untuk menjalankan satu suite, gunakan `php artisan test --testsuite=Unit` atau `php artisan test --testsuite=Feature`.

---

## 4. Kriteria Definition of Done Terkait Pengujian

Selaras dengan struktur task baku program (PIC, Reviewer, Deadline, Definition of Done), setiap task yang menyentuh logic kritikal pada S2 (Frontend) wajib menyertakan test terkait sebagai bagian dari Definition of Done sebelum masuk tahap QA Validation.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Rancangan Awal |
| 1.1 | 2026-09-12 | Menambahkan strategi pengujian Backend dengan PHPUnit, Unit Test, dan Feature Test endpoint. |
