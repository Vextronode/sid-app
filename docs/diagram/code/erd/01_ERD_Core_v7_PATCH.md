# ERD Patch — `01_ERD_Core_v7.puml`

File ini berisi **instruksi perubahan spesifik** yang perlu diterapkan ke:
```
docs/diagram/code/erd/01_ERD_Core_v7.puml
```

---

## Perubahan yang Dilakukan

File ERD hanya perlu edit **1 blok** (entity `approval_settings` + note-nya).

---

## 🔄 Cari dan Ganti (Find & Replace)

### GANTI bagian ini (baris 555–580 di file original):

```plantuml
entity "approval_settings" as APS {
  * id : BIGINT <<PK>>
  --
  * village_id : BIGINT <<FK -> villages>>
  * approval_level : ENUM('rt','rw',\n'kadus','kasi')
  * deadline_hours : INT <<DEFAULT 24>>
  * reminder_hours : INT <<DEFAULT 12>>
  * is_active : BOOLEAN
  created_at : TIMESTAMP
  updated_at : TIMESTAMP
}

note right of APS
  ⚠ BELUM DI-PATCH EKSPLISIT oleh Patch
  Guide v5.0 (dicatat sebagai technical
  debt di TDD Section 8.3.2 & Table 70).
  ENUM approval_level MASIH peninggalan
  v4.2 ('rt','rw','kadus','kasi') -
  TIDAK SELARAS lagi dengan
  letter_approvals.approval_level yang
  sudah berubah 5 nilai di v5.0.
  Digambar APA ADANYA sesuai TDD saat ini
  (bukan dikoreksi sepihak di ERD ini) -
  perlu ditinjau ulang tim teknis.
  UNIQUE(village_id, approval_level).
end note
```

### DENGAN yang ini (versi yang benar / sudah di-patch):

```plantuml
entity "approval_settings" as APS {
  * id : BIGINT <<PK>>
  --
  * village_id : BIGINT <<FK -> villages>>
  * approval_level : ENUM('rt','kepala_desa',\n'sekdes','kasi_pelayanan',\n'kaur_tu_umum')
  * deadline_hours : INT <<DEFAULT 24>>
  * reminder_hours : INT <<DEFAULT 12>>
  * is_active : BOOLEAN
  created_at : TIMESTAMP
  updated_at : TIMESTAMP
}

note right of APS
  SELARAS v5.0. ENUM approval_level sudah
  diupdate ke 5 nilai v5.0 sesuai migration
  aktual (2026_09_10_192831_create_
  approval_settings_table.php) dan
  letter_approvals.approval_level.
  Technical debt di ERD sebelumnya sudah
  diselesaikan (Finalisasi Sprint 3).
  UNIQUE(village_id, approval_level).
end note
```

---

## Catatan

- Tidak ada perubahan lain di file ini.
- Hanya 1 entity (`APS`) dan 1 note yang berubah.
- Jumlah baris setelah patch sama (tidak bertambah/berkurang).

