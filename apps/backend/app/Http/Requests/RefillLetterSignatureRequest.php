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
     * NIK saksi pengganti; nama (dan No. KK) bila NIK di luar data penduduk.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'nik' => ['required', 'digits:16'],
            'name' => ['nullable', 'string', 'max:100'],
            // Saksi di luar data penduduk: No. KK opsional.
            'family_number' => ['nullable', 'digits:16'],
        ];
    }
}
