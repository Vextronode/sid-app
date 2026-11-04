<?php

namespace App\Services;

use App\Imports\CitizensImport;
use App\Imports\CitizensWorkbookImport;
use App\Imports\Support\CitizenImportColumns;
use App\Imports\Support\CitizenImportLayout;
use App\Imports\Support\XlsxStreamReader;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Support\AuditContext;
use App\Support\PopulationScope;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;

class CitizenService
{
    private const DUPLICATE_NIK_MESSAGE = 'NIK sudah ada dalam database warga';

    private const DUPLICATE_HEAD_MESSAGE = 'KK ini sudah memiliki kepala keluarga aktif.';

    /** File impor yang menunggu keputusan "Timpa / Lewati" (disk local). */
    private const IMPORT_DIR = 'citizen-imports';

    private const IMPORT_TTL_MINUTES = 60;

    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected PopulationAuditService $audit,
        protected AuditContext $auditContext,
    ) {}

    /** Daftar warga dalam cakupan pembaca (PopulationScope). */
    public function paginateWithWilayah(User $user, array $filters = []): LengthAwarePaginator
    {
        return $this->citizenRepository->paginateWithWilayah($this->villageId($user), $filters, PopulationScope::for($user));
    }

    /**
     * UC-09 Tambah Warga. NIK dienkripsi + di-hash lewat cast/observer
     * di model Citizen; keunikan dicek lewat nik_hash. rw_id diturunkan
     * dari rt_id (request tidak mengirim rw_id). Log Aktivitas (S-05)
     * ditulis PopulationAuditObserver.
     */
    public function create(array $data, User $user, string $dataSource = 'manual_input_desa'): Citizen
    {
        if (! $user->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        $this->guardDuplicateNik($data['nik']);
        $this->guardSingleFamilyHead($data['family_id'] ?? null, $data['family_role'] ?? null);
        $this->guardRelatedRecords($data, $user);

        try {
            return DB::transaction(function () use ($data, $user, $dataSource) {
                $citizen = $this->citizenRepository->create(array_merge($data, [
                    'village_id' => $user->village_id,
                    'data_source' => $dataSource,
                ]));
                $citizen->refresh();

                return $citizen->load(['family', 'rt', 'rw', 'hamlet', 'village', 'occupation']);
            });
        } catch (UniqueConstraintViolationException $exception) {
            $this->throwIfKnownUniqueViolation($exception);
        }
    }

    /**
     * UC-09 Edit Warga. NIK tidak bisa diubah (ditolak di
     * UpdateCitizenRequest). Perubahan rt_id menurunkan ulang rw_id.
     */
    public function update(Citizen $citizen, array $data, User $user): Citizen
    {
        if ($citizen->village_id !== $user->village_id) {
            abort(403, 'Anda tidak berwenang mengubah data warga ini.');
        }

        $this->guardRelatedRecords($data, $user, $citizen);

        $familyId = array_key_exists('family_id', $data) ? $data['family_id'] : $citizen->family_id;
        $familyRole = array_key_exists('family_role', $data) ? $data['family_role'] : $citizen->family_role?->value;

        $this->guardSingleFamilyHead($familyId, $familyRole, $citizen->id);

        try {
            return DB::transaction(function () use ($citizen, $data) {
                $citizen = $this->citizenRepository->update($citizen, $data);

                // users.name hanya salinan citizens.name saat akun dibuat;
                // ikut diperbarui agar Manajemen Pengguna tidak menampilkan
                // nama lama.
                if ($citizen->wasChanged('name')) {
                    $citizen->user()->update(['name' => $citizen->name]);
                }

                return $citizen->load(['family', 'rt', 'rw', 'hamlet', 'village', 'occupation']);
            });
        } catch (UniqueConstraintViolationException $exception) {
            $this->throwIfKnownUniqueViolation($exception);
        }
    }

    /**
     * EV5-11-S2 (UC-09 Import Excel) langsung dari file. Setiap baris
     * divalidasi & disimpan sendiri-sendiri lewat create() - baris gagal
     * (termasuk NIK yang sudah terdaftar) di-skip, bukan all-or-nothing
     * transaction (SID-ARCH-BE-001 S5.4).
     *
     * @return array{total_rows: int, success_count: int, updated_count: int, skipped_count: int, error_count: int, errors: list<array{row: int, message: string}>, warning_count: int, warnings: list<array{row: int, message: string}>}
     */
    public function importFromExcel(UploadedFile $file, User $user): array
    {
        [$import] = $this->runImport($file->getRealPath(), $file->getClientOriginalExtension(), $user);

        return $this->finishImport($import, $user, $file->getClientOriginalName());
    }

    /**
     * Tahap 1 impor dengan pilihan "Timpa / Lewati": semua baris diperiksa
     * tanpa menyimpan apa pun. File disimpan sementara di balik token untuk
     * tahap 2 (importFromPreview), jadi tidak perlu diunggah ulang.
     *
     * @return array{token: string, expires_at: string, total_rows: int, new_count: int, conflict_count: int, error_count: int, errors: list<array{row: int, message: string}>, warning_count: int, warnings: list<array{row: int, message: string}>, conflicts: list<array<string, mixed>>}
     */
    public function previewImport(UploadedFile $file, User $user): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        [$import, $layout] = $this->runImport($file->getRealPath(), $extension, $user, dryRun: true);

        $this->pruneImportFiles();

        $token = (string) Str::uuid();
        $path = $file->storeAs(self::IMPORT_DIR, "{$token}.{$extension}", 'local');
        $expiresAt = now()->addMinutes(self::IMPORT_TTL_MINUTES);

        Cache::put(self::importCacheKey($token), [
            'user_id' => $user->id,
            'path' => $path,
            'extension' => $extension,
            'name' => $file->getClientOriginalName(),
        ], $expiresAt);

        return [
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'total_rows' => $import->successCount() + count($import->conflicts()) + count($import->errorList()),
            'new_count' => $import->successCount(),
            'conflict_count' => count($import->conflicts()),
            'error_count' => count($import->errorList()),
            'errors' => $import->errorList(),
            'warning_count' => count($import->warningList()),
            'warnings' => $import->warningList(),
            'conflicts' => $import->conflicts(),
            'columns' => $layout->describe(),
        ];
    }

    /**
     * Tahap 2: impor file hasil preview. Baris di $overwriteRows yang NIK-nya
     * sudah terdaftar ditimpa (kolom yang terisi di file saja, NIK tetap);
     * baris lain yang NIK-nya terdaftar dilewati. Token hanya bisa dipakai
     * sekali.
     *
     * @param  list<int>  $overwriteRows
     * @return array{total_rows: int, success_count: int, updated_count: int, skipped_count: int, error_count: int, errors: list<array{row: int, message: string}>, warning_count: int, warnings: list<array{row: int, message: string}>}
     */
    public function importFromPreview(string $token, array $overwriteRows, User $user): array
    {
        $session = Cache::pull(self::importCacheKey($token));

        if (! is_array($session) || $session['user_id'] !== $user->id || ! Storage::disk('local')->exists($session['path'])) {
            throw ValidationException::withMessages([
                'token' => ['Sesi impor tidak ditemukan atau sudah kedaluwarsa. Unggah ulang file.'],
            ]);
        }

        try {
            [$import] = $this->runImport(
                Storage::disk('local')->path($session['path']),
                $session['extension'],
                $user,
                overwriteRows: array_values(array_unique(array_map('intval', $overwriteRows))),
            );
        } finally {
            Storage::disk('local')->delete($session['path']);
        }

        return $this->finishImport($import, $user, $session['name']);
    }

    /**
     * @param  list<int>|null  $overwriteRows
     * @return array{0: CitizensImport, 1: CitizenImportLayout}
     */
    private function runImport(string $path, string $extension, User $user, bool $dryRun = false, ?array $overwriteRows = null): array
    {
        $readerType = match (strtolower($extension)) {
            'csv' => ExcelFormat::CSV,
            'xls' => ExcelFormat::XLS,
            default => ExcelFormat::XLSX,
        };

        // Template sistem maupun file pemutakhiran data pemilih desa (tabel
        // di bawah judul, di salah satu dari banyak sheet).
        $xlsx = $readerType === ExcelFormat::XLSX ? new XlsxStreamReader($path) : null;
        $layout = $xlsx !== null
            ? CitizenImportLayout::detectXlsx($xlsx)
            : CitizenImportLayout::detect($path, $readerType);

        if ($layout === null) {
            throw ValidationException::withMessages([
                'file' => ['Kolom NIK dan Nama tidak ditemukan. Pastikan baris judul kolom ada di '.CitizenImportColumns::SCAN_ROWS.' baris pertama.'],
            ]);
        }

        $import = new CitizensImport($this, $user, $layout, $dryRun, $overwriteRows);

        // Satu file desa berisi ribuan warga; tiap baris dienkripsi, divalidasi,
        // dan dicatat di Log Aktivitas (±2 menit untuk ±6.000 baris).
        set_time_limit(600);

        // .xlsx dibaca baris demi baris (sheet file desa bisa puluhan MB);
        // CSV/XLS lewat Maatwebsite, hanya sheet tabel warga yang dimuat.
        $run = $xlsx !== null
            ? function () use ($xlsx, $layout, $import) {
                foreach ($xlsx->rows($layout->sheet, $import->wantsColumn(...)) as $row => $cells) {
                    $import->importRow($row, $cells);
                }
            }
        : fn () => Excel::import(
            new CitizensWorkbookImport($layout->sheet, $import),
            new UploadedFile($path, basename($path), null, null, true),
            null,
            $readerType,
        );

        // Setiap baris tercatat sebagai `created`/`updated` dengan
        // `source = import`; SHDK yang ditebak setelahnya tercatat `updated`.
        $this->auditContext->with(['source' => 'import'], function () use ($run, $import) {
            $run();
            $import->finish();
        });

        return [$import, $layout];
    }

    /**
     * @return array{total_rows: int, success_count: int, updated_count: int, skipped_count: int, error_count: int, errors: list<array{row: int, message: string}>, warning_count: int, warnings: list<array{row: int, message: string}>}
     */
    private function finishImport(CitizensImport $import, User $user, string $fileName): array
    {
        $errors = $import->errorList();

        $summary = [
            'total_rows' => $import->successCount() + $import->updatedCount() + $import->skippedCount() + count($errors),
            'success_count' => $import->successCount(),
            'updated_count' => $import->updatedCount(),
            'skipped_count' => $import->skippedCount(),
            'error_count' => count($errors),
            'errors' => $errors,
            'warning_count' => count($import->warningList()),
            'warnings' => $import->warningList(),
        ];

        $this->audit->citizensImported($user, $summary, $fileName);

        return $summary;
    }

    private static function importCacheKey(string $token): string
    {
        return "citizen-import:{$token}";
    }

    /** File preview yang tidak pernah dilanjutkan ke impor. */
    private function pruneImportFiles(): void
    {
        $disk = Storage::disk('local');
        $cutoff = now()->subMinutes(self::IMPORT_TTL_MINUTES)->getTimestamp();

        foreach ($disk->files(self::IMPORT_DIR) as $file) {
            if ($disk->lastModified($file) < $cutoff) {
                $disk->delete($file);
            }
        }
    }

    public function delete(Citizen $citizen, User $user): bool
    {
        $this->guardCitizenVillage($citizen, $user);

        // Transaksi: data dan Log Aktivitas dari observer tersimpan bersama.
        return DB::transaction(fn () => $this->citizenRepository->delete($citizen));
    }

    public function getDistinctWilayah(User $user): Collection
    {
        return $this->citizenRepository->distinctWilayah($this->villageId($user));
    }

    private function villageId(User $user): string
    {
        if (! $user->village_id) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        return $user->village_id;
    }

    private function guardCitizenVillage(Citizen $citizen, User $user): void
    {
        if ($citizen->village_id !== $this->villageId($user)) {
            abort(404, 'Data warga tidak ditemukan.');
        }
    }

    /** Ensure linked family, region, and parent records belong to this village. */
    private function guardRelatedRecords(array $data, User $user, ?Citizen $citizen = null): void
    {
        $villageId = $this->villageId($user);
        $rtId = $data['rt_id'] ?? $citizen?->rt_id;

        if ($rtId !== null && ! Rt::query()->whereKey($rtId)->where('village_id', $villageId)->exists()) {
            abort(422, 'RT harus berasal dari desa Anda.');
        }

        foreach (['hamlet_id' => Hamlet::class, 'family_id' => Family::class] as $field => $model) {
            $id = $data[$field] ?? $citizen?->{$field};
            if ($id !== null && ! $model::query()->whereKey($id)->where('village_id', $villageId)->exists()) {
                abort(422, 'Data wilayah atau keluarga harus berasal dari desa Anda.');
            }

            $occupationId = array_key_exists('occupation_id', $data)
                ? $data['occupation_id']
                : $citizen?->occupation_id;

            if ($occupationId !== null) {
                $occupation = Occupation::query()
                    ->whereKey($occupationId)
                    ->where('village_id', $villageId)
                    ->first();

                if (! $occupation) {
                    throw ValidationException::withMessages([
                        'occupation_id' => ['Pekerjaan harus berasal dari desa Anda.'],
                    ]);
                }

                $occupationIsUnchanged = $citizen && (int) $citizen->occupation_id === (int) $occupationId;
                if (! $occupation->is_active && ! $occupationIsUnchanged) {
                    throw ValidationException::withMessages([
                        'occupation_id' => ['Pekerjaan nonaktif tidak dapat dipilih.'],
                    ]);
                }
            }
        }

        foreach (['father_id', 'mother_id'] as $field) {
            $id = $data[$field] ?? null;
            if ($id !== null && ! Citizen::query()->whereKey($id)->where('village_id', $villageId)->exists()) {
                abort(422, 'Data orang tua harus berasal dari desa Anda.');
            }
        }
    }

    private function guardDuplicateNik(string $nik): void
    {
        if ($this->citizenRepository->findByNikHash(hash('sha256', $nik))) {
            throw ValidationException::withMessages([
                'nik' => [self::DUPLICATE_NIK_MESSAGE],
            ]);
        }
    }

    /**
     * Hanya boleh ada 1 kepala_keluarga aktif per family_id.
     */
    private function guardSingleFamilyHead(?string $familyId, ?string $familyRole, ?string $excludeCitizenId = null): void
    {
        if (! $familyId || $familyRole !== 'kepala_keluarga') {
            return;
        }

        if ($this->citizenRepository->existsFamilyHead($familyId, $excludeCitizenId)) {
            throw ValidationException::withMessages([
                'family_role' => [self::DUPLICATE_HEAD_MESSAGE],
            ]);
        }
    }

    /**
     * Dua penyimpanan bersamaan bisa sama-sama lolos guard di atas; yang
     * kalah kena unique index dan dijawab 422, bukan 500. Dikenali dari nama
     * index (PostgreSQL) atau kolomnya (SQLite tidak menyebut nama index).
     */
    private function throwIfKnownUniqueViolation(UniqueConstraintViolationException $exception): never
    {
        $violates = fn (string $index, string $column): bool => $exception->index !== null
            ? $exception->index === $index
            : $exception->columns === [$column];

        if ($violates('citizens_nik_hash_unique', 'nik_hash')) {
            throw ValidationException::withMessages(['nik' => [self::DUPLICATE_NIK_MESSAGE]]);
        }

        if ($violates('citizens_single_active_head_unique', 'family_id')) {
            throw ValidationException::withMessages(['family_role' => [self::DUPLICATE_HEAD_MESSAGE]]);
        }

        throw $exception;
    }
}
