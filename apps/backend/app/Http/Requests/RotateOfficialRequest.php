<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RotateOfficialRequest extends FormRequest
{
    /**
     * Otorisasi diperiksa lewat OfficialPolicy::update() di controller
     * (konsisten dengan PATCH /officials/{id}).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'citizen_id' => ['required', 'exists:citizens,id'],
            'user_id' => ['required', 'exists:users,id'],
            'started_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'citizen_id.exists' => 'Data kependudukan tidak ditemukan',
            'user_id.exists' => 'Akun sistem tidak ditemukan',
        ];
    }
}
