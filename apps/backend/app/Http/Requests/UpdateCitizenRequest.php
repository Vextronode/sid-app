<?php

namespace App\Http\Requests;

use App\Enums\BloodType;
use App\Enums\DomicileStatus;
use App\Enums\FamilyRole;
use App\Enums\LastEducation;
use App\Enums\Religion;
use App\Enums\ResidencyType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCitizenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $citizenId = $this->route('citizen')?->id;

        return [
            'nik' => ['prohibited'],
            'no_kk' => ['prohibited'],
            'name' => ['sometimes', 'string', 'max:100'],
            'date_of_birth' => ['sometimes', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:100'],
            'gender' => ['sometimes', Rule::in(['L', 'P'])],
            'blood_type' => ['nullable', Rule::enum(BloodType::class)],
            'address' => ['sometimes', 'string'],
            'rt_id' => ['sometimes', 'exists:rts,id'],
            'hamlet_id' => ['nullable', 'exists:hamlets,id'],
            'family_id' => ['nullable', 'exists:families,id'],
            'family_role' => ['nullable', Rule::enum(FamilyRole::class)],
            'father_id' => ['nullable', 'exists:citizens,id', Rule::notIn([$citizenId])],
            'mother_id' => ['nullable', 'exists:citizens,id', Rule::notIn([$citizenId])],
            'father_name_text' => ['nullable', 'string', 'max:255'],
            'mother_name_text' => ['nullable', 'string', 'max:255'],
            'marital_status' => ['nullable', Rule::in(['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'])],
            'occupation' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', Rule::enum(Religion::class)],
            'last_education' => ['nullable', Rule::enum(LastEducation::class)],
            'domicile_status' => ['sometimes', Rule::enum(DomicileStatus::class)],
            'current_domicile' => ['nullable', 'string', 'max:150'],
            'residency_type' => ['sometimes', Rule::enum(ResidencyType::class)],
            'origin_region' => ['nullable', 'string', 'max:255'],
            'last_verified_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nik.prohibited' => 'NIK tidak dapat diubah setelah data warga dibuat',
            'no_kk.prohibited' => 'No KK tidak lagi dikelola di endpoint ini sejak v5.0. Gunakan family_id, atau buat KK baru via POST /families.',
            'father_id.not_in' => 'Warga tidak boleh menjadi ayah dirinya sendiri.',
            'mother_id.not_in' => 'Warga tidak boleh menjadi ibu dirinya sendiri.',
        ];
    }
}
