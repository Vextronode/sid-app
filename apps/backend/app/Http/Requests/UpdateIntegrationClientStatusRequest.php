<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIntegrationClientStatusRequest extends FormRequest
{
    /** Hanya Staf SIDUTama (middleware route); desa dicek di controller. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Kata sandi diminta ulang hanya saat mengaktifkan: menonaktifkan
     * adalah tindakan darurat yang harus bisa dilakukan cepat.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'is_active' => ['required', 'boolean'],
            'password' => [Rule::excludeIf(! $this->boolean('is_active')), 'required', 'string', 'current_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return IntegrationPasswordRequest::PASSWORD_MESSAGES;
    }
}
