<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApplyLetterFulfillmentRequest extends FormRequest
{
    /**
     * Otorisasi ada di LetterPolicy::fulfill. Kolom yang boleh diisi dan
     * aturan nilainya bergantung pada tipe surat, sehingga divalidasi di
     * LetterFulfillmentService.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'values' => ['nullable', 'array'],
            'values.*' => ['nullable'],
            // Koreksi NIK warga yang datanya diubah, bila subjeknya bukan pemohon.
            'subject_nik' => ['nullable', 'digits:16'],
        ];
    }
}
