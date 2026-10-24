<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLetterTypeRequest extends FormRequest
{
    /**
     * Otorisasi peran ditegakkan middleware `role:staf_sid` di
     * routes/api.php.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Hanya field ini yang boleh diedit Petugas Desa. Flow, template,
     * isian form, slot tanda tangan, dan aksi data diset developer
     * lewat seeder dan tidak bisa diubah dari sini.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'validity_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'assigned_role' => ['sometimes', 'nullable', Rule::in(['kasi_pemerintahan', 'kaur_tu_umum'])],
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
