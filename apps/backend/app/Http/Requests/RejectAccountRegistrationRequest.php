<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Menolak pendaftaran akun wajib disertai catatan: pendaftar membacanya di
 * halaman login dan bisa memperbaiki datanya sebelum mendaftar ulang.
 */
class RejectAccountRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'notes' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'notes.required' => 'Catatan penolakan wajib diisi.',
            'notes.min' => 'Catatan penolakan minimal 5 karakter.',
            'notes.max' => 'Catatan penolakan maksimal 500 karakter.',
        ];
    }
}
