# Index API Spec (OpenAPI 3.0.3) — SIDUTama v5.3

**Status:** Kontrak API mengikuti route dan perilaku backend aktif per
2026-10-16. Bila spec dan source berbeda, **source yang berlaku**.

**Basis referensi:**
1. Route aktif `apps/backend/routes/api.php` dan `routes/auth.php`
2. Controller, Form Request, Resource, Policy, dan Service backend
3. Migration dan model backend untuk kontrak data

**Verifikasi terakhir (2026-10-16):**
- 134 pasangan method+path dari `php artisan route:list` cocok 1:1 dengan
  `paths` di `openapi.yaml` (tidak ada route yang belum terdokumentasi,
  tidak ada path terdokumentasi yang tidak ada di source).
- `redocly lint openapi.yaml` (@redocly/cli 1.34.5): **valid**, 0 error,
  3 warning `operation-4xx-response` pada `/`, `/up`, dan
  `/sanctum/csrf-cookie` (endpoint itu memang tidak punya respons 4xx).

Fitur yang pernah ada di spec tetapi tidak ada di source dicatat di
`../audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md`.

## Struktur Folder

```
api_spec/
├── openapi.yaml            <- SATU PINTU
├── parameters/common.yaml  <- parameter bersama (village_code)
├── responses/common.yaml
├── paths/
│   ├── infrastructure/, auth/
│   ├── wilayah/, citizens/, families/, occupations/, users/, officials/
│   ├── letter-types/, approval-flows/          (approval flow read-only)
│   ├── letters/      daftar, ringkasan, ekspor Excel, detail, PDF, lampiran, dokumen
│   │                 pendukung, slot TTD, fulfillment
│   ├── rt/, kades/   aksi keputusan saja
│   ├── signatures/   TTD pribadi akun, permintaan TTD, blokir
│   ├── notifications/, push-subscriptions/
│   ├── approval-settings/, dashboard/
│   ├── public/, villages/, news/, regulations/
│   └── village-org/
└── schemas/
    ├── approval-flows/   ApprovalFlow, FlowStep
    ├── letter-types/     LetterType, LetterFormField, LetterDataField,
    │                     LetterSignatureSlot, PublicLetterType
    ├── letters/          Letter, LetterListItem, LetterSummary,
    │                     LetterAttachment, LetterSignature, Fulfillment*,
    │                     SignatureRequest, SignatureBlock, UserSignatureStatus
    ├── users/            User, Official, OfficialPositionType,
    │                     OfficialCandidate, PublicOfficial
    ├── news/             News, NewsCategory
    ├── villages/         Village, PublicStats, VillageImageUpload
    └── ... (auth, citizens, families, occupations, dashboard, dst)
```

## Ringkasan Endpoint per Domain

| Domain | Endpoint | Aktor |
|---|---|---|
| Auth & profil | `POST /register` (NIK + tanggal lahir + password), `POST /login`, `POST /logout`, `POST /forgot-password`, `POST /reset-password`, `GET /user` (memuat `role_label`, `photo_url`), `PATCH /profile`, `PUT /profile/password`, `POST/DELETE /profile/photo` (hanya role warga) | Publik / semua user |
| TTD pribadi | `GET/POST /profile/signature`, `GET /profile/signature/image` | Semua user |
| Permintaan TTD | `GET /signature-requests`, `POST /signature-requests/{id}/accept\|reject`, `GET /signature-blocks`, `DELETE /signature-blocks/{id}` | Pemilik NIK yang dituju |
| Surat | `GET/POST /letters`, `GET /letters/summary`, `GET /letters/export` (Excel, filter sama dengan daftar), `GET/DELETE /letters/{id}`, `GET /letters/{letter}/download\|preview\|supporting-document`, `GET /letters/{letter}/attachments/{attachment}`, `POST /letters/{letter}/signatures/{slot}`, `GET/POST /letters/{letter}/fulfillment` | Sesuai LetterPolicy |
| Keputusan | `PATCH /rt/letters/{letter}/decision`, `PATCH /kades/letters/{letter}/decision` | RT; Kades/Sekdes |
| Konfigurasi surat | `GET /letter-types`, `PUT /letter-types/{id}`, `GET /approval-flows`, `GET /approval-flows/{id}`, `GET/PATCH /approval-settings` | Petugas Desa (GET letter-types lintas-role) |
| Kependudukan | `/citizens` (GET juga untuk Kasi/Kaur), `/citizens/import`, `GET /citizens/import-template`, `/citizens/wilayah`, `/families` (berhalaman), `GET /families/options`, `/families/{id}/socioeconomic`, `/occupations` (GET daftar aktif juga untuk semua role, dipakai isian pekerjaan form surat) | Petugas Desa |
| Akun & jabatan | `/users`, `/users/{user}/reset-password`, `/users/{user}/signature/reset`, `/users/{user}/toggle-status`, `/users/{user}/photo` (POST/DELETE, akun warga), `/officials` (+ promote, candidates/lookup, demote, rotate, signature, photo POST/DELETE), `/official-position-types` | Petugas Desa (`staf_sid`, satu per desa) |
| Wilayah | `/hamlets`, `/rws`, `/rts` | Petugas Desa |
| Notifikasi | `/notifications`, `/notifications/unread-count` (`{ data: { count } }`), `/notifications/read-all`, `/notifications/{id}/read`, `POST/DELETE /push-subscriptions` | Semua user |
| Dashboard | `/dashboard`, `/dashboard/gender-stats`, `/dashboard/letter-stats` (keduanya dibungkus `data`) | Semua role (data di-scope) |
| CMS | `/villages/profile` (GET semua user; PATCH Petugas), `/villages/profile/stamp\|logo\|hero-image\|resolve-map-link`, `/news`, `/news-categories`, `/regulations`, `/announcement` (GET/PUT/DELETE, satu per desa), `/info-pages` (+ `/{page}`), `/village-org-positions` (GET slot tetap; + members, members/{id}/end, members/{id}/photo) | Petugas Desa |
| Publik | `/public/home` (+ `village_head`), `/public/village-profile`, `/public/news`, `/public/letter-types`, `/public/regulations`, `/public/contact-us`, `/public/village-orgs/{orgType}` (opsional `?village_code=`; cache 10 menit per desa) | Tanpa login |

## Alur Surat (ringkas)

1. `POST /letters`: payload divalidasi terhadap `letter_types.form_fields`;
   berkas isian disimpan privat; slot TTD diisi (pemohon otomatis, pihak
   lain lewat NIK atau TTD basah).
2. Slot belum lengkap → `current_step_order = 0` (`awaiting_signatures`).
   Pemilik NIK menyetujui/menolak lewat `/signature-requests`; pemohon dapat
   mengisi ulang slot lewat `POST /letters/{letter}/signatures/{slot}`.
3. Slot lengkap → step 1 (RT). RT kosong → surat ditahan dan Petugas Desa
   dinotifikasi. Tahap non-final milik pemohon dilewati.
4. RT approve → FYI RW & Kadus, notifikasi Kades/Sekdes → Kades/Sekdes
   approve (first-action-wins) → nomor surat, `expires_at`, snapshot render.
5. Kasi/Kaur (sesuai `assigned_role`) diberi tahu: siap cetak, atau
   perlu Terapkan (`data_action`). Terapkan mengubah/menambah data warga.

## Keputusan yang Tercermin di Kontrak

- Flow default satu per desa: RT (step 1) → `kepala_desa` (step 2, final).
  Kades dan Sekdes memutuskan step yang sama (first-action-wins);
  `approval_level` mencatat aktor sebenarnya.
- RW dan Kadus hanya FYI; Kasi/Kaur bukan approver.
- `assigned_role` NULL berarti Kasi Pemerintahan dan Kaur TU & Umum.
- PDF approved dirender dari snapshot; TTD/stempel selalu milik Kepala
  Desa yang menjabat saat final approve.
- Gambar privat (stempel desa, TTD jabatan, TTD akun, lampiran) hanya
  dilayani lewat endpoint terautentikasi; logo/foto beranda/foto pejabat/
  thumbnail berita berada di disk publik.

## Scope Eksklusi

- **QR Verification** dan **Void/Cancel Surat** — tidak ada endpoint.
- Blockchain-inspired hashing, aset & keuangan desa, bansos — Next Dev/Tahap 2
  (`TDD-06_Appendix.md`).

## Cara Membuka / Validasi

```bash
npx @redocly/cli@1.34.5 lint openapi.yaml
npx @redocly/cli@1.34.5 bundle openapi.yaml -o bundled.yaml
npx @redocly/cli@1.34.5 preview-docs openapi.yaml
```

## Rujukan Silang

- Use case: `../technical_design/TDD-02_UseCase_Descriptions.md`
- Skema DB: `../technical_design/TDD-03_Database_Schema.md`
- Arsitektur: `../architecture/SID-ARCH-BE-001_Backend_Architecture.md`
- Audit fitur belum diimplementasi: `../audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md`
