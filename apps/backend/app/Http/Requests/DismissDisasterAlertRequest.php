<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DismissDisasterAlertRequest extends FormRequest
{
    /** Hanya Staf SIDUTama (middleware route); desa dicek di controller. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Alasan wajib, supaya penurunan peringatan bencana selalu bisa
     * dipertanggungjawabkan (dicatat di activity log).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan menurunkan peringatan wajib diisi.',
            'reason.max' => 'Alasan maksimal 500 karakter.',
        ];
    }
}
