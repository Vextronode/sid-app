<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Konfirmasi kata sandi untuk menerbitkan dan mencabut token integrasi,
 * agar tidak bisa dilakukan dari sesi yang tertinggal terbuka.
 */
class IntegrationPasswordRequest extends FormRequest
{
    public const PASSWORD_MESSAGES = [
        'password.required' => 'Masukkan kata sandi Anda untuk melanjutkan.',
        'password.current_password' => 'Kata sandi tidak sesuai.',
    ];

    /** Hanya Staf SIDUTama (middleware route); desa dicek di controller. */
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
            'password' => ['required', 'string', 'current_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return self::PASSWORD_MESSAGES;
    }
}
