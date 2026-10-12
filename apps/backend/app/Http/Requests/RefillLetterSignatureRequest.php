<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RefillLetterSignatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Salah satu: `nik` (minta tanda tangan digital pemilik NIK), atau
     * `file` + `name` (foto dokumen ber-TTD basah dan nama penanda tangan).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'nik' => ['required_without:file', 'nullable', 'digits:16'],
            'file' => ['required_without:nik', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:2048'],
            'name' => ['required_with:file', 'nullable', 'string', 'max:100'],
        ];
    }
}
