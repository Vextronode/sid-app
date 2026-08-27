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

*(Placeholder - menunggu pengisian oleh tim Backend. Sekurang-kurangnya perlu mencakup: tools pengujian yang dipakai (mis. PHPUnit/Pest), cakupan minimum untuk PipelineStep evaluation engine, dan strategi pengujian untuk endpoint verifikasi publik.)*

---

## 4. Kriteria Definition of Done Terkait Pengujian

Selaras dengan struktur task baku program (PIC, Reviewer, Deadline, Definition of Done), setiap task yang menyentuh logic kritikal pada S2 (Frontend) wajib menyertakan test terkait sebagai bagian dari Definition of Done sebelum masuk tahap QA Validation.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Rancangan Awal |
