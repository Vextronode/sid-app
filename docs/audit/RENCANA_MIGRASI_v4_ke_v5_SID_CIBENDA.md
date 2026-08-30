# 🛠️ Rencana Migrasi Konkret — Kode v4.2 → TDD v5.0
## SIDUTama Cibenda

**Basis:** Hasil audit progress (lihat `AUDIT_PROGRESS_SID_CIBENDA.md`), Patch Guide v4.2→v5.0, Rangkuman Percakapan v5.0, dan dokumen arsitektur `SID-ARCH-SYS-001` v1.1 / `SID-ARCH-BE-001` v1.2 / `SID-ARCH-FE-001` v1.1.

**Prinsip urutan pengerjaan:** Kerjakan dari fondasi ke permukaan — skema database dulu (migration), lalu model, lalu service/business logic, lalu controller/route, terakhir hal yang belum pernah ada di kode (UC-18 s/d UC-24) sebagai fitur baru murni yang langsung dibangun sesuai v5.0 (tidak perlu dua kali kerja).

**Catatan strategi:** Karena ini masih tahap development (belum ada data produksi), migration **tidak perlu backward-compatible / tidak perlu strategi rollback data lama**. Pendekatan yang dipakai adalah **fresh migration** (drop & rebuild skema terdampak), bukan `ALTER` bertahap dengan migrasi data — jauh lebih cepat dan lebih bersih untuk kondisi saat ini.

**Catatan tambahan dari dokumen arsitektur:** Selain migrasi skema v4.2→v5.0, momentum ini dipakai sekaligus untuk menutup gap arsitektural yang teridentifikasi di audit (§1a) — layer **Repository** dan **Policy** yang menurut `SID-ARCH-BE-001` S2/S4.3 wajib ada sejak awal tapi belum terwujud di kode. Karena hampir seluruh Service approval akan ditulis ulang total di rencana ini, menunda pembenahan pola ini hanya akan menambah utang teknis baru di kode yang baru ditulis.

**Scope eksklusi eksplisit:** QR Verification, Void/Cancel Surat, dan Staging Perubahan Data Self-Service **tidak termasuk** rencana migrasi ini. `SID-ARCH-BE-001` S10 secara eksplisit menyatakan ketiganya belum berdesain dan melarang implementasi sebelum ada keputusan dari pemilik proyek — dicatat sebagai gap kesadaran di dokumen audit, bukan item pekerjaan di sini.

---

## FASE 0 — Persiapan & Perbaikan Utang Teknis (Sebelum Sentuh v5.0)

Kerjakan dulu, terlepas dari isu v5, karena ini bug/inkonsistensi independen (lihat Audit §3) yang akan mempersulit migrasi kalau dibiarkan.

| # | Tindakan | File Terdampak |
|---|---|---|
| 0.1 | Putuskan status fitur "revisi surat oleh warga" (`WaitingRevisionWarga`, `RejectedRevision`, `revision_count`) — **konfirmasi ke pemilik proyek**: apakah ini fitur yang mau dipertahankan (lalu didokumentasikan resmi sebagai extension TDD) atau dihapus karena eksperimen yang tidak jadi dipakai | `LetterStatus.php`, `KasiApprovalService.php`, `LetterController::resubmit` |
| 0.2 | Hapus duplikasi route `/login` antara `routes/api.php` dan `routes/auth.php` | `routes/api.php`, `routes/auth.php` |
| 0.3 | Perbaiki `RegisteredUserController` agar validasi NIK ke `citizens` sesuai UC-17 (ini akan ditulis ulang lagi di Fase 3 karena skema `citizens` berubah, tapi tetap harus difix logic-nya) | `RegisteredUserController.php` |
| 0.4 | Catat keputusan: kolom `assigned_role` di `letter_types` — pakai sebagai cache (sesuai rekomendasi Patch Guide v5.0 PATCH 33) atau hapus. **Rekomendasi: pertahankan sebagai cache**, perbaiki isinya jadi benar (`kasi_pelayanan`/`kaur_tu_umum`, bukan `rw`) | `create_letter_types_table` migration |
| 0.5 | Siapkan struktur folder `app/Repositories/` dan `app/Policies/` (kosong dulu, diisi paralel dengan Fase 4) — bukan pekerjaan besar, tapi menegaskan sejak awal bahwa Service baru **tidak boleh** akses Eloquent Model langsung, sesuai `SID-ARCH-BE-001` S2 | Struktur folder baru |

> ⚠️ Fase 0 murni cleanup, tidak wajib selesai 100% sebelum Fase 1, tapi 0.4 sebaiknya diputuskan dulu karena memengaruhi desain migration Fase 1.

**Catatan penyelarasan (0.4 — sudah final):** `SID-ARCH-BE-001` S4.2 sudah mengunci keputusan ini secara eksplisit: `assigned_role` **dipertahankan sebagai derived cache**, dan Policy (bukan `assigned_role` langsung) yang jadi source of truth validasi. Poin ini tidak perlu lagi ditanyakan ke pemilik proyek — cukup dieksekusi sesuai keputusan yang sudah ada.

---

## FASE 1 — Migration Baru: Sistem Category + Flow (Approval Dinamis)

Ini fondasi paling kritis karena semua fase approval berikutnya bergantung padanya.

### 1.1 — Migration `letter_categories`
```php
Schema::create('letter_categories', function (Blueprint $table) {
    $table->id();
    $table->enum('code', ['approval_normal','upload_mandiri','dokumen_pendukung','update_data'])->unique();
    $table->string('name', 100);
    $table->text('description')->nullable();
    $table->string('handler_class', 150);
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### 1.2 — Migration `approval_flows`
```php
Schema::create('approval_flows', function (Blueprint $table) {
    $table->id();
    $table->foreignId('category_id')->constrained('letter_categories')->cascadeOnDelete();
    $table->string('name', 150);
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### 1.3 — Migration `flow_steps`
```php
Schema::create('flow_steps', function (Blueprint $table) {
    $table->id();
    $table->foreignId('flow_id')->constrained('approval_flows')->cascadeOnDelete();
    $table->integer('step_order');
    $table->enum('approver_position', ['rt','kepala_desa','sekdes','kasi_pelayanan','kaur_tu_umum']);
    $table->boolean('is_final')->default(false);
    $table->timestamps();
    $table->unique(['flow_id', 'step_order']);
});
```

### 1.4 — Model baru
Buat `app/Models/LetterCategory.php`, `app/Models/ApprovalFlow.php`, `app/Models/FlowStep.php` dengan relasi standar (`hasMany`/`belongsTo` sesuai FK di atas).

### 1.5 — Seeder flow default
Buat `ApprovalFlowSeeder`:
- 4 row `letter_categories` (sesuai kode di atas)
- Untuk `approval_normal`: minimal 1 flow "RT–Kades/Sekdes–Staff (3 Tahap)" dengan 3 `flow_steps` (`rt` step 1, `kepala_desa` **atau** `sekdes` step 2 — lihat catatan di 1.6, `kasi_pelayanan`/`kaur_tu_umum` step 3 `is_final=true`)
- Untuk `upload_mandiri`/`dokumen_pendukung`/`update_data`: masing-masing 1 flow "Direct" dengan `flow_steps` kosong/minimal

> ⚠️ **Catatan penting soal step Kades/Sekdes:** TDD v5.0 bilang keduanya "saling menggantikan, first-action-wins" — ini berarti **satu step** di `flow_steps` tidak bisa punya 2 `approver_position` berbeda dalam satu row (kolomnya `ENUM` tunggal). `SID-ARCH-BE-001` S3.2 & S3.3 sudah mengonfirmasi pendekatan teknisnya: buat 1 row `flow_steps` dengan `approver_position` **salah satu saja** (representasi), lalu di Service resolve tetap query `WHERE position IN ('kepala_desa','sekdes')` untuk step tersebut secara khusus — persis pendekatan yang diusulkan di dokumen ini sebelumnya, sekarang terkonfirmasi sebagai desain resmi BE.
>
> **Namun** — `SID-ARCH-BE-001` S3.3 sendiri menandai dengan ⚠️ eksplisit bahwa **keputusan bisnis di baliknya** (apakah Sekdes benar-benar ikut approve di step yang sama dengan Kades) **masih berstatus rekomendasi/asumsi**, bukan keputusan final — user menjawab "no preference" saat ditanya di sesi v5.0. Desain teknis di atas eksplisit ditulis sebagai *"implementasikan dengan asumsi ini boleh berubah, konfirmasikan ulang ke pemilik proyek sebelum mengunci desain ini di kode produksi"*. **Tetap wajib dikonfirmasi ulang** sebelum Fase 4.5 (pembuatan `KadesApprovalService`) dieksekusi — lihat bagian "Hal yang Wajib Dikonfirmasi" di akhir dokumen ini.

---

## FASE 2 — Migration: Perubahan `letters`, `letter_approvals`, `letter_status_logs`

Karena development, drop dan buat ulang tabel-tabel ini (fresh migration), jangan `ALTER` bertahap.

### 2.1 — `letters` (rombak `status`, tambah kolom flow)
```php
Schema::create('letters', function (Blueprint $table) {
    $table->id();
    $table->foreignId('village_id')->constrained()->cascadeOnDelete();
    $table->foreignId('letter_type_id')->constrained()->restrictOnDelete();
    $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
    $table->foreignId('on_behalf_of')->nullable()->constrained('citizens')->nullOnDelete();
    $table->foreignId('citizen_id')->nullable()->constrained('citizens')->nullOnDelete();
    $table->string('letter_number', 50)->unique()->nullable();
    $table->string('applicant_name', 100);
    $table->text('applicant_nik');
    $table->string('applicant_nik_hash', 64)->index();
    $table->text('applicant_address')->nullable();
    $table->text('purpose');
    $table->json('payload')->nullable();
    $table->text('notes')->nullable();

    // BARU v5.0 — status generik
    $table->enum('status', ['pending','in_progress','approved','rejected'])->default('pending');
    $table->foreignId('flow_id')->constrained('approval_flows'); // snapshot saat submit
    $table->integer('current_step_order')->default(1);
    $table->integer('rejected_at_step')->nullable();

    $table->boolean('is_overdue')->default(false);
    $table->timestamp('expires_at')->nullable();
    $table->timestamp('submitted_at')->useCurrent();
    $table->timestamp('processed_at')->nullable();
    $table->timestamps();
});
```
> Hapus seluruh sisa status generasi lama (`draft`, `waiting_rt`, `waiting_verification`, `cancelled`, dst) — ini juga sekaligus membereskan utang teknis Fase 0.

### 2.2 — `letter_approvals` (ENUM baru + `flow_step_id`)
```php
Schema::create('letter_approvals', function (Blueprint $table) {
    $table->id();
    $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
    $table->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
    $table->enum('approval_level', ['rt','kepala_desa','sekdes','kasi_pelayanan','kaur_tu_umum']);
    $table->foreignId('flow_step_id')->nullable()->constrained('flow_steps')->nullOnDelete();
    $table->enum('action', ['approved','rejected'])->nullable();
    $table->text('notes')->nullable();
    $table->timestamp('deadline_at')->nullable();
    $table->timestamp('reminded_at')->nullable();
    $table->timestamps();
});
```

### 2.3 — `letter_status_logs` (ENUM generik)
```php
$table->enum('old_status', ['pending','in_progress','approved','rejected'])->nullable();
$table->enum('new_status', ['pending','in_progress','approved','rejected']);
```

### 2.4 — Model updates
- `Letter.php`: hapus cast `LetterStatus::class` lama, ganti dengan enum PHP baru 4 nilai; tambah `flow()`, `currentFlowStep()` relasi/accessor
- `LetterApproval.php`: update cast `ApprovalLevel` jadi 5 nilai baru, tambah `flowStep()` relasi
- `LetterStatusLog.php`: update cast enum

---

## FASE 3 — Migration: Data Warga (`families`, `citizen_socioeconomics`, `citizens` update)

### 3.1 — Migration `families`
```php
Schema::create('families', function (Blueprint $table) {
    $table->id();
    $table->text('no_kk');
    $table->string('no_kk_hash', 64)->unique();
    $table->text('family_address');
    $table->enum('family_status', ['aktif','pindah','bubar'])->default('aktif');
    $table->foreignId('village_id')->constrained()->cascadeOnDelete();
    $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
    $table->foreignId('hamlet_id')->nullable()->constrained('hamlets')->nullOnDelete();
    $table->foreignId('head_of_family_id')->nullable(); // FK ke citizens ditambahkan setelah tabel citizens ada
    $table->timestamps();
});
```
> Tambahkan FK `head_of_family_id → citizens.id` di migration terpisah setelah tabel `citizens` final (circular dependency).

### 3.2 — Migration ulang `citizens` (fresh, hapus `no_kk`, tambah 11 kolom baru)
```php
Schema::create('citizens', function (Blueprint $table) {
    $table->id();
    $table->foreignId('village_id')->constrained()->cascadeOnDelete();
    $table->foreignId('family_id')->nullable()->constrained('families')->nullOnDelete();
    $table->foreignId('father_id')->nullable()->constrained('citizens')->nullOnDelete();
    $table->foreignId('mother_id')->nullable()->constrained('citizens')->nullOnDelete();
    $table->string('father_name_text', 100)->nullable();
    $table->string('mother_name_text', 100)->nullable();

    $table->text('nik');
    $table->string('nik_hash', 64)->unique();
    $table->string('name', 100);
    $table->date('date_of_birth');
    $table->string('place_of_birth', 100)->nullable();
    $table->enum('gender', ['L','P']);
    $table->enum('blood_type', ['A','B','AB','O','tidak_tahu'])->nullable();
    $table->enum('religion', ['islam','kristen','katolik','hindu','buddha','konghucu'])->nullable();

    $table->text('address'); // domisili riil, terpisah dari families.family_address

    $table->enum('family_role', ['kepala_keluarga','istri','suami','anak','famili_lain'])->nullable();
    $table->enum('marital_status', ['belum_kawin','kawin','cerai_hidup','cerai_mati'])->nullable();
    $table->enum('last_education', ['tidak_sekolah','sd','smp','sma','diploma','s1','s2','s3'])->nullable();
    $table->string('occupation', 100)->nullable();

    $table->enum('residency_type', ['lokal','pendatang'])->default('lokal');
    $table->string('origin_region', 150)->nullable();

    $table->foreignId('rt_id')->nullable()->constrained('rts')->nullOnDelete();
    $table->foreignId('hamlet_id')->nullable()->constrained('hamlets')->nullOnDelete();
    $table->enum('domicile_status', ['menetap','merantau_dalam_negeri','merantau_luar_negeri','tki'])->default('menetap');
    $table->string('current_domicile', 150)->nullable();

    $table->enum('data_source', ['manual_input_desa','import_excel','dukcapil_sync'])->default('manual_input_desa');
    $table->timestamp('last_verified_at')->nullable();
    $table->enum('sync_status', ['synced','pending','conflict'])->nullable();

    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### 3.3 — Migration `citizen_socioeconomics`
```php
Schema::create('citizen_socioeconomics', function (Blueprint $table) {
    $table->id();
    $table->foreignId('citizen_id')->unique()->constrained('citizens')->cascadeOnDelete();
    $table->enum('income_range', ['<1jt','1-3jt','3-5jt','5-10jt','>10jt'])->nullable();
    $table->enum('house_ownership_status', ['milik_sendiri','sewa','menumpang','dinas'])->nullable();
    $table->enum('water_source', ['pdam','sumur','sungai','lainnya'])->nullable();
    $table->enum('electricity_source', ['pln','non_pln','tidak_ada'])->nullable();
    $table->integer('dependents_count')->nullable();
    $table->json('productive_assets')->nullable();
    $table->timestamp('surveyed_at')->nullable();
    $table->foreignId('surveyed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

### 3.4 — Model updates
- `Citizen.php`: update `$fillable`, tambah relasi `family()`, `father()`, `mother()`, `socioeconomics()`, hapus referensi `no_kk` lama
- `Family.php` (baru): model dengan boot hook auto-hash `no_kk` seperti pola `Citizen::booted()` yang sudah ada
- `CitizenSocioeconomic.php` (baru)

### 3.5 — Repository domain Kependudukan (baru, penutup gap §1a Audit)
Buat `CitizenRepository` dan `FamilyRepository` sejak awal skema baru ini dibuat, bukan ditambahkan belakangan:
- `CitizenRepository::findByNikHash()`, `findByFamilyId()` — dipakai baik oleh `CitizenService` (UC-09) maupun `RegisteredUserController` (UC-17, Fase 6.10)
- `FamilyRepository::findByNoKkHash()`
Ini konsisten dengan alasan Repository di `SID-ARCH-BE-001` S2: query pencarian NIK/KK dipakai lintas beberapa Service, bukan hanya satu.

---

## FASE 4 — Rewrite Service Layer Approval (+ Penutupan Gap Repository/Policy)

Ini fase paling berat secara logic, dan **fase paling tepat untuk sekaligus menutup gap arsitektural** (§1a Audit): tidak ada Repository/Policy sama sekali di kode saat ini. Karena hampir seluruh Service approval di bawah ini ditulis ulang total, urutan pengerjaan disusun agar Repository/Policy dibangun **sebagai fondasi terlebih dahulu**, baru Service baru dibangun di atasnya — bukan ditambahkan setelah Service selesai.

### 4.0 — Bangun `LetterRepository`, `OfficialRepository`, `LetterPolicy` (fondasi, dikerjakan sebelum 4.1–4.9)

**`LetterRepository`** — pusatkan seluruh query yang sebelumnya tersebar di masing-masing Service (`RtApprovalService::getPendingLetters()`, `RwApprovalService::getPendingLetters()`, `KasiApprovalService::getPendingLetters()`, dll — semuanya query `Letter::query()` langsung dengan variasi filter serupa):
```php
class LetterRepository
{
    public function findByFlowStepAndStatus(string $approverPosition, array $statuses): Collection
    {
        return Letter::query()
            ->whereHas('currentFlowStep', fn ($q) => $q->where('approver_position', $approverPosition))
            ->whereIn('status', $statuses)
            ->with(['citizen', 'letterType', 'approvals.approvedBy:id,name'])
            ->latest()
            ->get();
    }

    public function findById(int $id): Letter { /* ... */ }
    public function findByIdWithApprovals(int $id): Letter { /* ... */ }
}
```
Nama method `findByFlowStepAndStatus` sengaja mengikuti persis nama yang dicontohkan `SID-ARCH-BE-001` S2 sebagai motivasi Repository — dipakai oleh dashboard approval (4.7), Listener notifikasi (Fase 7), **dan** `SendApprovalReminderJob` (scheduler overdue) sekaligus, tanpa duplikasi query.

**`OfficialRepository`** — pusatkan resolve pejabat yang sebelumnya inline di `OfficialService`:
```php
class OfficialRepository
{
    public function findActiveByRtId(int $rtId): ?Official { /* ... */ }
    public function findActiveByPositions(array $positions, int $villageId): Collection { /* ... */ }
}
```

**`LetterPolicy`** — pindahkan seluruh cek otorisasi context yang sebelumnya inline di Service (contoh existing: `if ($letter->citizen->rt_id != $official->rt_id) { abort(403, ...) }` di `RtApprovalService::decision()`) ke method Policy:
```php
class LetterPolicy
{
    public function decide(User $user, Letter $letter): bool
    {
        $step = $letter->currentFlowStep;
        if (!$step) return false;

        return match ($step->approver_position) {
            'rt' => $user->official?->rt_id === $letter->citizen->rt_id,
            'kepala_desa', 'sekdes' => in_array($user->role, ['kepala_desa', 'sekretaris_desa']),
            'kasi_pelayanan', 'kaur_tu_umum' => $user->role === $step->approver_position,
            default => false,
        };
    }
}
```
Ini satu Policy generik menggantikan kebutuhan menulis ulang gate logic yang sama berkali-kali di `RtApprovalService`, `KadesApprovalService` (4.5, baru), dan `KasiApprovalService` (4.6) — sesuai prinsip *Config over Code* dan pola *double-check gate* yang diwajibkan `SID-ARCH-BE-001` S4.3 (Service tetap re-validasi via Policy ini di dalam `DB::transaction()`, bukan hanya mengandalkan hasil Policy di awal request).

### 4.1 — `OfficialService::resolveNextOfficials()` — rewrite total, pindah ke `OfficialRepository`
Ganti hardcode match per posisi jadi generik berbasis `flow_steps`, method ini sekarang tinggal orkestrasi tipis di atas `OfficialRepository`:
```php
public function resolveApproversForStep(Letter $letter): Collection
{
    $step = FlowStep::where('flow_id', $letter->flow_id)
        ->where('step_order', $letter->current_step_order)
        ->first();

    if (!$step) return collect();

    $positions = match ($step->approver_position) {
        'kepala_desa', 'sekdes' => ['kepala_desa', 'sekdes'], // first-action-wins, lihat Fase 1.6
        default => [$step->approver_position],
    };

    return $this->officialRepository->findActiveByPositions($positions, $letter->village_id);
}
```

### 4.2 — Hapus `KadusApprovalController` & `KadusApprovalService`
File dihapus total dari codebase.

### 4.3 — Rewrite `RwApprovalController` & `RwApprovalService` → jadi pure notifier
- Hapus method `approve()` dan route `PATCH /rw/approvals/{letter}/approve`
- `index()` tetap ada tapi query berubah jadi read-only: tampilkan surat yang **pernah lewat** step RT-approved (untuk histori FYI), tanpa opsi aksi apapun
- Trigger notifikasi RW dipindah ke dalam `RtApprovalService` sebagai side-effect non-blocking (lihat 4.4)

### 4.4 — Rewrite `RtApprovalService::decision()`
- Tetap gate approve/reject seperti sekarang (tidak berubah secara alur)
- Saat approve: **hapus** logic `createApproval` untuk `'rw'`. Ganti dengan:
  1. Kirim notifikasi FYI ke RW (side-effect, tidak buat row `letter_approvals`)
  2. Update `letters.current_step_order += 1`, `status = 'in_progress'`
  3. Panggil `OfficialService::resolveApproversForStep()` untuk resolve & notifikasi approver berikutnya (Kades/Sekdes)

### 4.5 — Buat `KadesApprovalController` & `KadesApprovalService` (baru)
Struktur mengikuti pola `RtApprovalService` tapi:
- Gate: `current_step_order` mengarah ke step dengan `approver_position IN ('kepala_desa','sekdes')` — divalidasi lewat `LetterPolicy::decide()` (4.0), bukan inline check baru
- Authorization: user dengan `role IN ('kepala_desa','sekretaris_desa')` boleh akses & decide (first-action-wins — tidak ada row-lock, cukup cek ulang status via Policy sebelum `update()` di dalam `DB::transaction()`, race condition diterima sebagai trade-off sesuai `SID-ARCH-BE-001` S3.3)
- Approve → `current_step_order += 1`, resolve approver berikutnya (Kasi/Kaur)
- Reject → `status = 'rejected'`, `rejected_at_step = current_step_order`, terminal

> ⚠️ **Jangan mulai sub-fase ini** sebelum poin #1 di "Hal yang Wajib Dikonfirmasi" (akhir dokumen) terjawab — desain teknis di atas valid *jika* Sekdes memang final ikut approve bareng Kades. Kalau jawabannya "tidak", `approver_position` untuk step ini di seeder Fase 1.5 dan Policy di 4.0 perlu disederhanakan jadi `kepala_desa` saja.

### 4.6 — Rewrite `KasiApprovalService`
- Fix bug filter `assigned_role == 'rw'` → ganti jadi query generik via `flow_steps` (sama pola seperti 4.1)
- Approve saat `flow_step.is_final = true` → `status = 'approved'`, generate `letter_number`, hitung `expires_at`, trigger notif ke Kades **dan** Sekdes (monitoring)
- Reject → `status = 'rejected'`, `rejected_at_step`, terminal
- **Putuskan status fitur revisi** (dari Fase 0.1) sebelum menulis ulang bagian `needs_revision` di service ini

### 4.7 — Rewrite `LetterService::getScopedLetters()`
Ganti seluruh `switch ($user->role)` yang query berdasarkan status granular lama, jadi pola generik:
```php
case 'rt':
case 'kepala_desa':
case 'sekretaris_desa':
case 'kasi_pelayanan':
case 'kaur_tu_umum':
    $query->whereHas('currentFlowStep', function ($q) use ($user) {
        $q->where('approver_position', $this->mapRoleToPosition($user->role));
    })->whereIn('status', ['pending', 'in_progress']);
    break;

case 'rw':
    // read-only, tampilkan histori FYI — bukan filter approval
    ...
```
Hapus case `'kadus'` sepenuhnya.

### 4.8 — Rewrite `LetterService::createFirstApproval()`
Saat submit surat baru:
1. Set `letters.flow_id` = snapshot dari `letter_types.flow_id` (bukan live-join)
2. Set `current_step_order = 1`
3. Resolve RT via `citizens.rt_id` (tidak berubah dari sekarang)
4. Buat row `letter_approvals` untuk step RT dengan `flow_step_id` terisi + `deadline_at` dari `approval_settings` (lihat Fase 6)

### 4.9 — `PdfService::download()` — sesuaikan gate
Ganti:
```php
$allowedStatuses = [LetterStatus::KasiApproved];
if (!in_array($letter->status, $allowedStatuses)) { ... }
```
Menjadi:
```php
if ($letter->status !== 'approved') {
    abort(403, 'Surat baru dapat diunduh setelah seluruh proses persetujuan selesai.');
}
```

---

## FASE 5 — Enum PHP: Rombak Total

### 5.1 — `LetterStatus.php`
Ganti isi total jadi 4 case: `Pending`, `InProgress`, `Approved`, `Rejected`. Hapus seluruh case granular lama (`RtApproved`, `KadusApproved`, dst) dan case revisi (kecuali Fase 0.1 memutuskan revisi dipertahankan — jika iya, rancang ulang sebagai bagian dari flow, bukan status terpisah).

### 5.2 — `ApprovalLevel.php`
```php
enum ApprovalLevel: string
{
    case RT = 'rt';
    case KepalaDesa = 'kepala_desa';
    case Sekdes = 'sekdes';
    case KasiPelayanan = 'kasi_pelayanan';
    case KaurTuUmum = 'kaur_tu_umum';
}
```

### 5.3 — `AssignedRole.php`
Perbaiki jadi 2 case sesuai TDD v4.2/v5.0 (bukan cuma `Rw`):
```php
enum AssignedRole: string
{
    case KasiPelayanan = 'kasi_pelayanan';
    case KaurTuUmum = 'kaur_tu_umum';
}
```

---

## FASE 6 — Fitur yang Belum Pernah Ada (UC-18 s/d UC-24) — Bangun Langsung Sesuai v5.0

Karena fitur-fitur ini **belum pernah dikerjakan**, tidak ada "migrasi" — langsung dibangun sesuai skema final. Urutan prioritas disarankan berdasarkan ketergantungan:

| Urutan | UC | Yang Dibangun | Ketergantungan |
|---|---|---|---|
| 6.1 | UC-22 | Migration `approval_settings` + `ApprovalSettingController` (CRUD deadline per `approval_level` baru: rt/kepala_desa/sekdes/kasi_pelayanan/kaur_tu_umum) | Fase 1 & 2 selesai |
| 6.2 | UC-20 | `RegionController` (CRUD hamlets/rws/rts) — model sudah ada, tinggal buat controller | Tidak ada dependensi baru |
| 6.3 | UC-21 | `LetterTypeController` ditambah `update()` — edit `validity_days`, `assigned_role`, `category_id`, `flow_id`, toggle `is_active` | Fase 1 selesai (butuh `category_id`/`flow_id`) |
| 6.4 | UC-09 lanjutan | `CitizenController` ditambah `store()`/`update()` + endpoint Import Excel (`maatwebsite/excel`) + sub-flow Kelola KK (`FamilyController`) — **hanya** aktor Petugas Desa, tidak ada jalur warga edit sendiri (lihat catatan di bawah) | Fase 3 & 3.5 selesai |
| 6.5 | UC-14 lanjutan | `UserController`/`OfficialController` ditambah create user + rotasi jabatan (termasuk logic khusus: assign posisi `sekdes` → auto-update `users.role = 'sekretaris_desa'`) | Tidak ada dependensi baru dari v5 |
| 6.6 | UC-18 | Migration tidak perlu baru (`villages` sudah ada) — `VillageProfileController` untuk edit profil desa. **Guard eksplisit**: hanya `role === 'petugas_desa'`, bukan seluruh Tier 2 (`SID-ARCH-SYS-001` S2.3) | — |
| 6.7 | UC-19 | Migration `news` (belum pernah dibuat!) + `NewsController`. **Guard sama seperti 6.6** — eksklusif `petugas_desa` | — |
| 6.8 | UC-24 | Migration `village_regulations` (belum pernah dibuat!) + `RegulationController`. **Guard sama seperti 6.6** | — |
| 6.9 | UC-23 | Migration `village_org_positions` + `village_org_members` + `VillageOrgController` | — |
| 6.10 | UC-17 fix | `RegisteredUserController` ditulis ulang total: validasi `nik_hash` ke `citizens` (via `CitizenRepository::findByNikHash()`, 3.5), cek `family_id`/`residency_type` sesuai skema baru | Fase 3 & 3.5 selesai |

> **Catatan penting untuk 6.4:** `SID-ARCH-BE-001` S5.3 (v1.2) menegaskan ulang bahwa pengelolaan `citizens` — termasuk koreksi data — **hanya** dilakukan Petugas Desa. Jangan tergoda membangun endpoint "warga edit profil sendiri" di sub-fase ini meski istilah "staging perubahan data self-service" pernah muncul di draft dokumen arsitektur — itu sudah dibatalkan sebagai desain (lihat Audit §3b). Batasi 6.4 murni pada CRUD oleh Petugas Desa + Import Excel.

**Yang secara eksplisit TIDAK masuk Fase 6 (atau fase manapun di rencana ini):** QR Verification, Void/Cancel Surat. Keduanya berstatus wacana tanpa desain teknis apa pun (`SID-ARCH-BE-001` S10) — jangan buat migration/controller/route apa pun untuk ini sampai ada keputusan eksplisit dari pemilik proyek. Kalau keputusan itu datang di kemudian hari, kedua fitur ini akan jadi fase migrasi tersendiri di luar dokumen ini, bukan disisipkan ke fase yang sudah ada.

---

## FASE 7 — Route, Middleware RBAC & Cleanup Akhir

- Update `routes/api.php`: hapus prefix `kadus`, hapus route approve RW, tambah prefix `kades` (atau nama generik `approval` yang menerima parameter posisi)
- **Bangun middleware RBAC kustom** (`SID-ARCH-BE-001` S4.3) — belum ada di kode sama sekali (lihat Audit §1a). Middleware ini menangani lapisan pertama (role check per endpoint); `LetterPolicy` (Fase 4.0) menangani lapisan kedua (context check per resource). Jangan campur keduanya jadi satu — role check tetap di middleware/route, context check tetap di Policy
- Hapus duplikasi `/login` (Fase 0.2 dieksekusi di sini kalau belum)
- Jalankan `php artisan migrate:fresh --seed` (development, tidak ada data produksi — aman)
- Update `ApprovalFlowSeeder` dipanggil di `DatabaseSeeder` sebelum `LetterTypeSeeder` (karena `letter_types` butuh `flow_id`)
- Update `LetterTypeSeeder`: setiap 10 template surat (A01–A10) diisi `category_id` (semua `approval_normal`) dan `flow_id` (flow 3-tahap default)

---

## Urutan Ringkas (Checklist Eksekusi)

- [ ] **Fase 0** — Cleanup utang teknis (route duplikat, keputusan fitur revisi, siapkan folder Repository/Policy)
- [ ] **Fase 1** — Migration + model + seeder: `letter_categories`, `approval_flows`, `flow_steps`
- [ ] **Fase 2** — Migration ulang `letters`, `letter_approvals`, `letter_status_logs` + update model cast
- [ ] **Fase 3** — Migration `families`, `citizen_socioeconomics`, migration ulang `citizens` + model baru + `CitizenRepository`/`FamilyRepository`
- [ ] **Fase 4** — Bangun `LetterRepository`/`OfficialRepository`/`LetterPolicy` (fondasi), lalu rewrite seluruh service approval di atasnya (hapus Kadus, rewrite RW/RT/Kasi, buat Kades service baru)
- [ ] **Fase 5** — Rombak total `LetterStatus`, `ApprovalLevel`, `AssignedRole` enum
- [ ] **Fase 6** — Bangun UC-18 s/d UC-24 langsung sesuai skema final (termasuk 2 tabel yang belum pernah ada: `news`, `village_regulations`) — **kecuali** QR Verification & Void/Cancel (di luar scope, lihat catatan Fase 6)
- [ ] **Fase 7** — Bangun middleware RBAC, beres-beres route, migrate fresh, update seeder urutan & isi

---

## Hal yang Wajib Dikonfirmasi ke Pemilik Proyek Sebelum Eksekusi

1. **Status fitur "revisi surat oleh warga"** (`WaitingRevisionWarga`/`RejectedRevision`) — pertahankan (lalu didesain ulang masuk ke dalam sistem flow) atau buang?
2. **Sekretaris Desa benar-benar ikut approve di step sama dengan Kepala Desa** — ini **bukan lagi murni pertanyaan teknis**: mekanisme *first-action-wins* sudah didesain lengkap di `SID-ARCH-BE-001` S3.3 (DB::transaction + re-check via Policy, tanpa row lock), tapi dokumen itu sendiri menandai ⚠️ bahwa **keputusan bisnisnya masih rekomendasi/asumsi**, bukan final. Wajib dikonfirmasi sebelum Fase 4.5 dieksekusi — kalau jawabannya "tidak", seeder Fase 1.5 dan `LetterPolicy` di Fase 4.0 perlu disederhanakan (step itu jadi `kepala_desa` saja, tanpa Sekdes).
3. **Prioritas Fase 6** — apakah urutan UC-22 → UC-20 → UC-21 → UC-09 → ... di atas sudah sesuai kebutuhan, atau ada UC yang lebih mendesak untuk demo berikutnya?
4. **QR Verification & Void/Cancel Surat** — kapan (atau apakah) ini akan didesain? Tidak mendesak untuk dijawab sekarang karena keduanya di luar scope rencana ini, tapi baik diketahui timeline-nya untuk perencanaan sprint berikutnya. Pertanyaan detail yang perlu dijawab saat itu tiba sudah dicatat di `SID-ARCH-BE-001` S10.

> Poin yang **sudah tidak perlu ditanyakan lagi** (sudah final di dokumen arsitektur): kolom `assigned_role` di `letter_types` (dipertahankan sebagai cache — `SID-ARCH-BE-001` S4.2), pola Controller→Service→Repository→Eloquent (final sejak v3.2 — S2), status Superadmin (belum diimplementasikan, memang sengaja — `SID-ARCH-SYS-001` S4), Staging Perubahan Data Self-Service (dibatalkan sebagai desain — `SID-ARCH-BE-001` S5.3 v1.2).

---

*Dokumen ini adalah rencana teknis migrasi kode dari basis TDD v4.2 menuju TDD v5.0, disusun berdasarkan hasil audit progress, seluruh dokumen patch/rangkuman v5.0, dan dokumen arsitektur `SID-ARCH-SYS-001` v1.1 / `SID-ARCH-BE-001` v1.2 / `SID-ARCH-FE-001` v1.1.*
