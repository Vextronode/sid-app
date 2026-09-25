<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLetterTypeRequest extends FormRequest
{
    /**
     * Otorisasi peran ditegakkan middleware `role:petugas_desa` di
     * routes/api.php. Cross-validation flow_id vs category_id ada di
     * LetterTypeService::update() (butuh lookup ApprovalFlow).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * UC-21 MVP: hanya field ini yang boleh diedit Petugas Desa -
     * template & requirements_info tetap developer-only (Next Dev
     * Paket 1), lihat schemas/letter-types/letter-types.yaml#/LetterTypeUpdateRequest.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'validity_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'assigned_role' => ['sometimes', 'nullable', Rule::in(['kasi_pelayanan', 'kaur_tu_umum'])],
            'category_id' => ['sometimes', 'exists:letter_categories,id'],
            'flow_id' => ['sometimes', 'exists:approval_flows,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'validity_days.min' => 'Masa berlaku harus lebih dari 0 hari',
        ];
    }
}
