# Index API Spec (OpenAPI 3.0.3) — SIDUTama Cibenda v5.1

**Status:** Kontrak API mengikuti route dan perilaku backend aktif v5.1.
Untuk endpoint dan bentuk data, `openapi.yaml` beserta path/schema yang
direferensikan menjadi acuan.

**Basis referensi:**
1. Route aktif `apps/backend/routes/api.php`
2. Controller, request, resource, policy, dan service backend aktif
3. Migration dan model backend untuk kontrak data

## Struktur Folder

Identik dengan v4 — hanya isi yang berubah:

```
api_spec_v5/
├── openapi.yaml          <- SATU PINTU.
├── paths/
│   ├── auth/, wilayah/, citizens/, users/, officials/
│   ├── families/
│   ├── letter-types/, letter-categories/, approval-flows/
│   ├── letters/                                                    daftar/detail surat bersama semua role
│   ├── rt/, kades/                                                  operasi keputusan saja
│   ├── notifications/, approval-settings/, dashboard/
│   ├── public/, villages/, news/, regulations/
│   └── village-org/
├── schemas/
│   ├── families/                                                  BARU
│   └── letter-categories/                                         BARU (LetterCategory, ApprovalFlow, FlowStep)
└── responses/
```

## Perilaku Endpoint Surat Aktif

| Operasi | Implementasi aktif | Scope/perilaku |
|---|---|---|
| `GET /letters` | Daftar dan filter surat | Scope otomatis berdasarkan role; `scope=mine` memilih surat yang diajukan user login. |
| `GET /letters/{id}` | Detail surat | Diotorisasi oleh policy berdasarkan pemohon, role, desa, dan wilayah surat. |
| `PATCH /rt/letters/{letter}/decision` | Keputusan RT | Hanya untuk step aktif RT dan wilayah RT terkait. |
| `PATCH /kades/letters/{letter}/decision` | Keputusan Kades/Sekdes | Keduanya dapat memutuskan step aktif `kepala_desa`; first-action-wins. |

Tidak ada operasi GET khusus `/rt/letters`, `/rw/letters`, `/kades/letters`,
atau `/kasi/letters`. RW dan Kadus membaca melalui endpoint bersama sesuai
scope wilayah, tanpa hak keputusan. Kasi/Kaur membaca surat approved sesuai
`assigned_role` melalui endpoint bersama.

## Audit Bug Fix yang Tercermin di Kontrak v5.0

Filter Kasi/Kaur aktif memakai `letter_types.assigned_role`; nilai `NULL`
berlaku untuk kedua role. Filter tersebut berjalan di dalam scope daftar
bersama `GET /letters`, bukan endpoint Kasi/Kaur tersendiri.

## Keputusan approval yang sudah diterapkan

- Kades dan Sekdes dapat memutuskan pada step `kepala_desa` yang sama dengan first-action-wins. Flow baru hanya menerima posisi step `rt` dan `kepala_desa`, dengan step final wajib `kepala_desa`.
- ENUM database `approval_settings.approval_level` tetap lima nilai untuk kompatibilitas; API hanya mengekspos setting level approver aktif (`rt`, `kepala_desa`). Sekdes memutuskan pada step `kepala_desa`; Kasi/Kaur bukan approver.

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
| E6 | Sistem Notifikasi | `LetterStatusNotification` dikirim langsung dari service melalui kanal database | - |
| E7 | Deadline & Reminder Approval | Enum approval_level diselaraskan (belum final) | UC-22 |
| E8 | Dashboard & Statistik | Dashboard tetap menyediakan scope role Kadus dan RW read-only; Kades/Sekdes aktif pada tahap final | UC-15 |
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
