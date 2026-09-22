<?php

namespace App\Imports;

use App\Enums\BloodType;
use App\Enums\DomicileStatus;
use App\Enums\FamilyRole;
use App\Enums\LastEducation;
use App\Enums\Religion;
use App\Enums\ResidencyType;
use App\Models\User;
use App\Services\CitizenService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\OnEachRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Row;

/**
 * EV5-11-S2. UC-09 Import Excel. Header kolom (baris pertama) harus
 * persis sesuai nama field CitizenCreateRequest (snake_case) - lihat
 * schemas/citizens/citizens.yaml#/CitizenCreateRequest.
 *
 * Baris gagal (format salah, NIK duplikat) di-skip, BUKAN
 * all-or-nothing (SID-ARCH-BE-001 S5.4) - setiap baris diproses lewat
 * CitizenService::create() yang sama dengan endpoint POST /citizens,
 * jadi guard NIK duplikat & kepala keluarga tunggal otomatis berlaku
 * juga untuk duplikat ANTAR baris di file yang sama (baris sebelumnya
 * sudah tersimpan di DB saat baris berikutnya divalidasi).
 */
class CitizensImport implements OnEachRow, SkipsEmptyRows, WithHeadingRow
{
    private int $successCount = 0;

    /** @var list<array{row: int, message: string}> */
    private array $errors = [];

    public function __construct(
        private readonly CitizenService $citizenService,
        private readonly User $user,
    ) {}

    public function onRow(Row $row): void
    {
        $rowNumber = $row->getRowIndex();
        $data = $row->toArray();

        $validator = Validator::make($data, $this->rules());

        if ($validator->fails()) {
            $this->errors[] = [
                'row' => $rowNumber,
                'message' => $validator->errors()->first(),
            ];

            return;
        }

        try {
            $this->citizenService->create($validator->validated(), $this->user);
            $this->successCount++;
        } catch (ValidationException $e) {
            $this->errors[] = [
                'row' => $rowNumber,
                'message' => collect($e->errors())->flatten()->first(),
            ];
        }
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

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    private function rules(): array
    {
        return [
            'nik' => ['required', 'digits:16'],
            'name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['required', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'blood_type' => ['nullable', Rule::enum(BloodType::class)],
            'address' => ['required', 'string'],
            'rt_id' => ['required', 'integer', 'exists:rts,id'],
            'hamlet_id' => ['nullable', 'integer', 'exists:hamlets,id'],
            'family_id' => ['nullable', 'integer', 'exists:families,id'],
            'family_role' => ['nullable', Rule::enum(FamilyRole::class)],
            'father_id' => ['nullable', 'integer', 'exists:citizens,id'],
            'mother_id' => ['nullable', 'integer', 'exists:citizens,id'],
            'father_name_text' => ['nullable', 'string', 'max:255'],
            'mother_name_text' => ['nullable', 'string', 'max:255'],
            'marital_status' => ['nullable', Rule::in(['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'])],
            'occupation' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', Rule::enum(Religion::class)],
            'last_education' => ['nullable', Rule::enum(LastEducation::class)],
            'domicile_status' => ['nullable', Rule::enum(DomicileStatus::class)],
            'current_domicile' => ['nullable', 'string', 'max:150'],
            'residency_type' => ['nullable', Rule::enum(ResidencyType::class)],
            'origin_region' => ['nullable', 'string', 'max:255'],
        ];
    }
}
