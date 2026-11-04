<?php

namespace App\Imports;

use App\Enums\BloodType;
use App\Enums\DomicileStatus;
use App\Enums\FamilyRole;
use App\Enums\LastEducation;
use App\Enums\Religion;
use App\Enums\ResidencyType;
use App\Imports\Support\CitizenImportColumns;
use App\Imports\Support\CitizenImportFamilyRoles;
use App\Imports\Support\CitizenImportLayout;
use App\Imports\Support\CitizenImportResolver;
use App\Imports\Support\CitizenImportValues;
use App\Models\User;
use App\Repositories\FamilyRepository;
use App\Services\CitizenService;
use App\Services\FamilyService;
use App\Support\CitizenDocumentRules;
use App\Support\CitizenLabels;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Row;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * EV5-11-S2. UC-09 Import Excel. Menerima template sistem (header
 * snake_case, CitizensTemplateExport) maupun file pemutakhiran data pemilih
 * desa (header NIK, NAMA, ... di bawah judul, kolom bantu di sampingnya):
 * kolom yang dikenali CitizenImportColumns diimpor, sisanya diabaikan, dan
 * field yang tidak ada di file dibiarkan kosong.
 *
 * .xlsx dibaca XlsxStreamReader (memanggil importRow()); CSV/XLS lewat
 * Maatwebsite (onRow()).
 *
 * Baris gagal (format salah, NIK duplikat) di-skip, BUKAN
 * all-or-nothing (SID-ARCH-BE-001 S5.4) - setiap baris diproses lewat
 * CitizenService::create() yang sama dengan endpoint POST /citizens,
 * jadi guard NIK duplikat & kepala keluarga tunggal otomatis berlaku
 * juga untuk duplikat ANTAR baris di file yang sama (baris sebelumnya
 * sudah tersimpan di DB saat baris berikutnya divalidasi).
 */
class CitizensImport implements OnEachRow, SkipsEmptyRows
{
    private int $successCount = 0;

    /** @var list<array{row: int, message: string}> */
    private array $errors = [];

    /** @var array<string, string>|null huruf kolom => field; null = header belum ditemukan */
    private ?array $columns;

    private int $headerRow;

    /** @var array<string, list<string>> family_id => id warga impor tanpa SHDK */
    private array $membersWithoutRole = [];

    private readonly CitizenImportResolver $resolver;

    /**
     * Tanpa $layout (mis. CSV dibaca langsung), baris header dicari sendiri
     * di SCAN_ROWS baris pertama.
     */
    public function __construct(
        private readonly CitizenService $citizenService,
        private readonly User $user,
        ?CitizenImportLayout $layout = null,
    ) {
        $this->columns = $layout?->columns;
        $this->headerRow = $layout?->headerRow ?? 0;
        $this->resolver = new CitizenImportResolver($user, app(FamilyService::class), app(FamilyRepository::class));
    }

    public function onRow(Row $row): void
    {
        $cells = [];

        foreach ($row->getDelegate()->getCellIterator() as $cell) {
            $value = $cell->isFormula() ? $cell->getOldCalculatedValue() : $cell->getValue();
            $cells[$cell->getColumn()] = [
                'value' => $value instanceof RichText ? $value->getPlainText() : $value,
                'numeric' => $cell->getDataType() === DataType::TYPE_NUMERIC,
            ];
        }

        $this->importRow($row->getRowIndex(), $cells);
    }

    /**
     * @param  array<string, array{value: mixed, numeric: bool}>  $cells  huruf kolom => sel
     */
    public function importRow(int $rowNumber, array $cells): void
    {
        if ($this->columns === null) {
            $this->detectHeader($rowNumber, $cells);

            return;
        }

        if ($rowNumber <= $this->headerRow) {
            return;
        }

        $data = [];

        foreach ($this->columns as $column => $field) {
            $data[$field] = $cells[$column]['value'] ?? null;
        }

        if (self::isBlank($data) || self::isColumnNumberRow($data)) {
            return;
        }

        // Excel menyimpan angka hanya sampai 15 digit signifikan: NIK di sel
        // Angka bisa sudah berubah digit terakhirnya walau tampak 16 digit.
        // CSV dibaca sebagai teks, jadi tidak terkena pemeriksaan ini.
        $nikColumn = array_search('nik', $this->columns, true);
        if ($cells[$nikColumn]['numeric'] ?? false) {
            $this->fail($rowNumber, 'Format kolom NIK harus Teks');

            return;
        }

        try {
            $data = $this->resolver->region(CitizenImportValues::normalize($data));
            $validated = Validator::make($data, $this->rules())->validate();
            $noKk = $validated['no_kk'] ?? null;
            unset($validated['no_kk']);

            $citizen = DB::transaction(function () use ($validated, $noKk, $data) {
                if ($noKk !== null && ! isset($validated['family_id'])) {
                    $validated['family_id'] = $this->resolver->familyId($noKk, $data);
                }

                return $this->citizenService->create($validated, $this->user, 'import_excel');
            });

            if ($citizen->family_id !== null && $citizen->family_role === null) {
                $this->membersWithoutRole[$citizen->family_id][] = $citizen->id;
            }

            $this->successCount++;
        } catch (ValidationException $e) {
            $this->fail($rowNumber, (string) collect($e->errors())->flatten()->first());
        } catch (HttpException $e) {
            // Guard wilayah/keluarga di service memakai abort(422).
            $this->fail($rowNumber, $e->getMessage());
        }
    }

    /**
     * Dipanggil setelah semua baris diproses: anggota satu KK bisa tersebar
     * di baris mana saja, jadi SHDK baru bisa ditebak setelah KK lengkap.
     */
    public function finish(): void
    {
        CitizenImportFamilyRoles::assign($this->membersWithoutRole);
        $this->membersWithoutRole = [];
    }

    /** Kolom yang dibutuhkan; sel kolom lain tidak perlu diurai. */
    public function wantsColumn(string $column): bool
    {
        return $this->columns === null || array_key_exists($column, $this->columns);
    }

    public function successCount(): int
    {
        return $this->successCount;
    }

    /**
     * @return list<array{row: int, message: string}>
     */
    public function errorList(): array
    {
        return $this->errors;
    }

    /** @param array<string, array{value: mixed, numeric: bool}> $cells */
    private function detectHeader(int $rowNumber, array $cells): void
    {
        if ($rowNumber > CitizenImportColumns::SCAN_ROWS) {
            return;
        }

        $columns = CitizenImportColumns::map(array_map(fn (array $cell) => $cell['value'], $cells));

        if (CitizenImportColumns::isHeader($columns)) {
            $this->columns = $columns;
            $this->headerRow = $rowNumber;
        }
    }

    private function fail(int $row, string $message): void
    {
        $this->errors[] = ['row' => $row, 'message' => $message];
    }

    /** @param array<string, mixed> $data */
    private static function isBlank(array $data): bool
    {
        return collect($data)->every(fn ($value) => $value === null || trim((string) $value) === '');
    }

    /**
     * Baris nomor kolom ("1, 2, 3, ...") di bawah header file pemilih: semua
     * isinya angka pendek.
     *
     * @param  array<string, mixed>  $data
     */
    private static function isColumnNumberRow(array $data): bool
    {
        $filled = array_filter($data, fn ($value) => $value !== null && trim((string) $value) !== '');

        return count($filled) > 1
            && collect($filled)->every(fn ($value) => preg_match('/^\d{1,3}(\.0+)?$/', trim((string) $value)) === 1);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    private function rules(): array
    {
        return [
            'nik' => ['required', 'digits:16'],
            'no_kk' => ['nullable', 'digits:16'],
            'name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['required', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'blood_type' => ['nullable', Rule::enum(BloodType::class)],
            'address' => ['required', 'string'],
            'rt_id' => ['required', 'integer', 'exists:rts,id'],
            'hamlet_id' => ['nullable', 'integer', 'exists:hamlets,id'],
            'family_id' => ['nullable', 'exists:families,id'],
            'family_role' => ['nullable', Rule::enum(FamilyRole::class)],
            'father_id' => ['nullable', 'exists:citizens,id'],
            'mother_id' => ['nullable', 'exists:citizens,id'],
            'father_name_text' => ['nullable', 'string', 'max:255'],
            'mother_name_text' => ['nullable', 'string', 'max:255'],
            'marital_status' => ['nullable', Rule::in(array_keys(CitizenLabels::MARITAL_STATUS))],
            // TODO: Resolve imported occupation labels to village-scoped occupation IDs.
            'religion' => ['nullable', Rule::enum(Religion::class)],
            'last_education' => ['nullable', Rule::enum(LastEducation::class)],
            'domicile_status' => ['nullable', Rule::enum(DomicileStatus::class)],
            'current_domicile' => ['nullable', 'string', 'max:150'],
            'residency_type' => ['nullable', Rule::enum(ResidencyType::class)],
            'origin_region' => ['nullable', 'string', 'max:255'],
            ...CitizenDocumentRules::rules(),
        ];
    }
}
