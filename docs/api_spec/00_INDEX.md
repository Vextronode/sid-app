# Index API Spec (OpenAPI 3.0.3) — SIDUTama Cibenda v5.0

**Status:** Draft spec hasil migrasi dari v4.2, mengikuti TDD v5.0, Patch Guide v4.2→v5.0,
Rencana Migrasi v4→v5, hasil Audit Progress, dan dokumen arsitektur
`SID-ARCH-SYS-001` v1.1 / `SID-ARCH-BE-001` v1.2 / `SID-ARCH-FE-001` v1.1.

**Basis referensi:**
1. `api_spec_v4/` (struktur & konvensi dasar, endpoint yang tidak berubah)
2. `AUDIT_PROGRESS_SID_CIBENDA.md` (fitur mana yang sudah ada, bug yang harus diperbaiki di kontrak API, gap yang belum dikerjakan)
3. `RENCANA_MIGRASI_v4_ke_v5_SID_CIBENDA.md` (urutan & keputusan teknis migrasi skema)

## Struktur Folder

Identik dengan v4 — hanya isi yang berubah:

```
api_spec_v5/
├── openapi.yaml          <- SATU PINTU.
├── paths/
│   ├── auth/, wilayah/, citizens/, users/, officials/            (tidak berubah struktural)
│   ├── families/                                                  BARU — KK terpisah dari citizens
│   ├── letter-types/, letter-categories/, approval-flows/         letter-categories & approval-flows BARU
│   ├── letters/, rt/, rw/, kades/, kasi/                           kadus/ DIHAPUS, kades/ BARU, rw/ dirombak jadi read-only
│   ├── notifications/, approval-settings/, dashboard/
│   ├── public/, villages/, news/, regulations/
│   └── village-org/
├── schemas/
│   ├── families/                                                  BARU
│   └── letter-categories/                                         BARU (LetterCategory, ApprovalFlow, FlowStep)
└── responses/
```

## Ringkasan Perubahan Endpoint v4.2 → v5.0

| Endpoint v4.2 | Status di v5.0 | Alasan |
|---|---|---|
| `GET /kadus/letters` | ❌ **DIHAPUS TOTAL** | Kadus dihapus total dari domain approval surat (Patch 37, SID-ARCH-BE-001 S3.2) |
| `GET/PATCH /kadus/letters/{id}` | ❌ **DIHAPUS TOTAL** | idem |
| `PATCH /rw/letters/{id}/decision` | ❌ **DIHAPUS TOTAL, tanpa pengganti** | RW bukan approver sejak v5.0 — endpoint decision untuk RW secara struktural tidak pernah dibuka lagi, bukan hanya disembunyikan di UI |
| `GET /rw/letters` | 🔄 **DIROMBAK** — jadi read-only riwayat FYI | RW murni penerima notifikasi non-blocking |
| — | ✅ **BARU**: `GET /kades/letters`, `GET/PATCH /kades/letters/{id}`, `PATCH /kades/letters/{id}/decision` | Kepala Desa/Sekretaris Desa jadi approver aktif menggantikan posisi gate Kadus lama |
| — | ✅ **BARU**: `GET/POST /letter-categories`, `/approval-flows`, `/approval-flows/{id}/steps` | Domain Config over Code (letter_categories → approval_flows → flow_steps) |
| — | ✅ **BARU**: `GET/POST /families`, `/families/{id}`, `/families/{id}/members` | KK dipisah dari citizens (Patch 41) |
| — | ✅ **BARU**: `GET/PUT /citizens/{id}/socioeconomic` | Tabel baru citizen_socioeconomics (1:1 dengan citizens) |
| `POST /citizens` (dengan field `no_kk`) | 🔄 **field `no_kk` DIHAPUS** dari request/response | No KK pindah ke `families`, citizens pakai `family_id` |
| Semua endpoint approval (`/rt/*`, `/kasi/*`) | 🔄 **status generik** (`pending/in_progress/approved/rejected`) menggantikan ENUM granular (`rt_approved`, `kadus_approved`, `kasi_approved`, dst) | Skema `letters.status` dirombak total (Section 3.2 SID-ARCH-BE-001) |
| `GET /dashboard` (oneOf 6 varian termasuk DashboardKadus) | 🔄 **oneOf 6 varian baru** — DashboardKadus dihapus, DashboardRw dirombak, DashboardKadesSekdes baru | Sesuai perubahan role di atas |

## Audit Bug Fix yang Tercermin di Kontrak v5.0

Sesuai `AUDIT_PROGRESS_SID_CIBENDA.md` §3.4, implementasi v4.2 sebelumnya salah
memfilter endpoint Kasi berdasarkan `letter_types.assigned_role == 'rw'`
(seharusnya `kasi_pelayanan`/`kaur_tu_umum`). Spec v5.0 di `paths/kasi/letters.yaml`
secara eksplisit mendefinisikan kontrak yang BENAR: filter generik berbasis
`flow_steps.approver_position`, dengan `assigned_role` dipertahankan hanya
sebagai derived cache (bukan source of truth untuk Policy).

## Keputusan yang MASIH TERBUKA (jangan anggap final)

Ditandai eksplisit di dalam file terkait dengan blok "⚠ Catatan status keputusan":

1. **Sekretaris Desa saling menggantikan dengan Kepala Desa di step yang sama
   (first-action-wins)** — `paths/kades/letter-decision.yaml`. Ini rekomendasi/asumsi
   default (SID-ARCH-BE-001 S3.3), BUKAN keputusan final. Desain teknis endpoint
   (siapa saja yang boleh memanggil, mekanisme re-validasi) sudah dituliskan
   mengikuti asumsi ini, tapi kontraknya perlu ditinjau ulang jika keputusan
   bisnisnya berubah.
2. **Konsistensi ENUM `approval_settings.approval_level`** — `schemas/approval-settings/approval-settings.yaml`.
   TDD v5.0 mencatat ini sebagai technical debt yang belum di-patch eksplisit.
   Spec ini mengikuti rekomendasi Rencana Migrasi Fase 6.1 (enum diselaraskan
   ke 5 nilai baru), BUKAN keputusan final TDD.

## Scope Eksklusi Eksplisit (TIDAK ada di spec ini)

Sesuai `SID-ARCH-BE-001` S10 dan Rencana Migrasi — ketiganya berstatus "wacana
belum berdesain", dilarang diimplementasikan sebelum keputusan eksplisit:

- **QR Verification** — tidak ada endpoint verifikasi publik berbasis token di spec ini.
- **Void/Cancel Surat** — tidak ada endpoint void/cancel, `letters.status` tetap 4 nilai.
- **Staging Perubahan Data Self-Service** — tidak ada endpoint warga edit data sendiri; UC-09 tetap eksklusif Petugas Desa (`SID-ARCH-BE-001` S5.3).

## Fitur MVP v5.0 yang Belum Distabilkan sebagai Endpoint (Next Dev / Tahap 2)

Sama seperti v4.2 — tidak berubah statusnya, sengaja tidak dimasukkan ke spec:
- Blockchain-inspired hashing (`letter_hashes`, UC-07) — Next Dev Paket 2
- Dynamic Tipe Surat (WYSIWYG, `letter_type_fields`, `letter_field_values`) — Next Dev Paket 1
- `village_assets`, `village_finances` — Tahap 2
- `citizen_aid_eligibility`, `citizen_aid_history`, `aid_programs` — Next Dev / Tahap 2

## Cara Membuka / Validasi

```bash
npm install -g @redocly/cli
redocly lint openapi.yaml
redocly bundle openapi.yaml -o bundled.yaml
redocly preview-docs openapi.yaml
```

## Pengelompokan Endpoint per Epic

| Epic | Nama | Perubahan Struktural v5.0 | UC Terkait |
|---|---|---|---|
| E0 | Fondasi Proyek | Tambah Repository/Policy layer ke arsitektur (tidak menghasilkan endpoint) | - |
| E1 | Struktur Wilayah | Tidak berubah | UC-20 |
| E2 | Users, Citizens, Officials, Families | +families, +citizen_socioeconomics, citizens dirombak | UC-09, UC-14, UC-17 |
| E3 | Autentikasi | Tidak berubah struktural | UC-01, UC-02, UC-17 |
| E4 | Konfigurasi Tipe Surat & Pipeline Approval | +letter_categories, +approval_flows, +flow_steps | UC-21 |
| E5 | Alur Pengajuan & Approval Surat | Dirombak total (lihat tabel di atas) | UC-03, UC-04a, UC-04c(baru), UC-04d, UC-05, UC-06, UC-08 |
| E6 | Sistem Notifikasi | Event generik FlowStepAdvanced | - |
| E7 | Deadline & Reminder Approval | Enum approval_level diselaraskan (belum final) | UC-22 |
| E8 | Dashboard & Statistik | oneOf dirombak (hapus Kadus, RW read-only, Kades/Sekdes aktif) | UC-15 |
| E9 | Halaman Publik & Konten | Tidak berubah, guard petugas_desa ditegaskan ulang | UC-16, UC-18, UC-19, UC-24 |
| E10 | Organisasi Non-Struktural Desa | Tidak berubah | UC-23 |
| E11 | Security, Audit & Compliance | Dual-column enkripsi meluas ke families.no_kk | - |
| E12 | Testing, QA & Deployment | Tidak berubah | - |

## Audit Konsistensi dengan Knowledge (checklist manual sebelum dianggap final)

| Item yang Dicek | Hasil |
|---|---|
| Residu endpoint `/kadus/*` | ✅ Nol — dihapus total dari openapi.yaml dan folder paths/ |
| Residu endpoint approval RW (`decision`) | ✅ Nol — tidak ada file `rw/letter-decision.yaml` sama sekali |
| Residu status granular (`rt_approved`, `kadus_approved`, dst) di schema aktif | ✅ Nol di `schemas/letters/letters.yaml` (hanya disebut di deskripsi sebagai referensi historis) |
| Residu `no_kk` di `CitizenCreateRequest` | ✅ Nol — dipindah ke `FamilyCreateRequest` |
| Residu `letter_hashes`/`HashingService`/dst | ✅ Nol (Next Dev, di luar MVP) |
| Residu `village_assets`/`village_finances` | ✅ Nol (Tahap 2) |
| Konsistensi 9 role di semua enum | ✅ Identik — ENUM tidak berubah dari v4.2 |
| flow_steps.approver_position tidak pernah berisi 'rw'/'kadus' | ✅ Ditegaskan di schema & validasi endpoint `PUT /approval-flows/{id}/steps` |

## Rujukan Silang Knowledge

- **UC & alur bisnis v5.0**: TDD v5.0 Section 5.3.2 (UC Description), khususnya UC-04a/c/d dan sub-flow notifikasi RW
- **Skema pipeline dinamis**: TDD v5.0 Section 5.4.2 (`letter_categories`, `approval_flows`, `flow_steps`), `SID-ARCH-BE-001` S3
- **Skema kependudukan v5.0**: TDD v5.0 Section 5.4.2 (`families`, `citizens`, `citizen_socioeconomics`), `SID-ARCH-BE-001` S5
- **RBAC & scope otorisasi**: `SID-ARCH-SYS-001` S4, `SID-ARCH-BE-001` S4
- **Bug fix kontrak Kasi**: `AUDIT_PROGRESS_SID_CIBENDA.md` §3.4
- **Urutan migrasi & keputusan terbuka**: `RENCANA_MIGRASI_v4_ke_v5_SID_CIBENDA.md` Fase 1–7 dan bagian "Hal yang Wajib Dikonfirmasi"
