<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Unggah hasil dari instansi luar; hak unggah diperiksa LetterPolicy::uploadResult.
 */
class StoreLetterResultRequest extends FormRequest
{
    public const MAX_FILES = 5;

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
            'files' => ['required', 'array', 'min:1', 'max:'.self::MAX_FILES],
            'files.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.required' => 'Unggah minimal satu berkas hasil dari instansi.',
            'files.max' => 'Maksimal '.self::MAX_FILES.' berkas per unggahan.',
            'files.*.mimes' => 'Berkas harus berupa PDF, JPG, atau PNG.',
            'files.*.max' => 'Ukuran tiap berkas maksimal 2 MB.',
        ];
    }
}
