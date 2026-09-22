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

class StoreCitizenRequest extends FormRequest
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
        return [
            'no_kk' => ['prohibited'],
            'nik' => ['required', 'digits:16'],
            'name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['required', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'blood_type' => ['nullable', Rule::enum(BloodType::class)],
            'address' => ['required', 'string'],
            'rt_id' => ['required', 'exists:rts,id'],
            'hamlet_id' => ['nullable', 'exists:hamlets,id'],
            'family_id' => ['nullable', 'exists:families,id'],
            'family_role' => ['nullable', Rule::enum(FamilyRole::class)],
            'father_id' => ['nullable', 'exists:citizens,id'],
            'mother_id' => ['nullable', 'exists:citizens,id'],
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nik.digits' => 'NIK harus 16 digit angka',
            'no_kk.prohibited' => 'No KK tidak lagi dikelola di endpoint ini sejak v5.0. Gunakan family_id, atau buat KK baru via POST /families.',
        ];
    }
}
