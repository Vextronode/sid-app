<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOfficialPositionTypeRequest extends FormRequest
{
    /**
     * Akses dibatasi middleware peran Staf SIDUTama pada route.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `code` sengaja tidak dapat diubah: officials.position menyimpannya.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'label' => ['sometimes', 'required', 'string', 'max:100'],
            'is_single_occupant' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'label.required' => 'Nama jabatan wajib diisi.',
            'label.max' => 'Nama jabatan maksimal 100 karakter.',
        ];
    }
}
