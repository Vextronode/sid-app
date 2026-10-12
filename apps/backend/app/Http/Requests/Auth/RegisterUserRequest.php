<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nik' => ['required', 'string', 'digits:16'],
            'date_of_birth' => ['required', 'date'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            'nik.digits' => 'NIK harus 16 digit angka.',
            'nik.required' => 'NIK wajib diisi.',
            'nik.string' => 'NIK harus berupa teks.',
            'date_of_birth.required' => 'Tanggal lahir wajib diisi.',
            'date_of_birth.date' => 'Tanggal lahir tidak valid.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'password' => 'Kata sandi tidak memenuhi persyaratan keamanan.',
        ];
    }
}
