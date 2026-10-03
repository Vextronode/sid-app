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
            'user_id' => ['required', 'exists:users,id'],
            'started_at' => ['required', 'date'],
            'term_ends_at' => ['nullable', 'date', 'after:started_at'],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'user_id.required' => 'Akun target wajib dipilih.',
            'user_id.exists' => 'Akun sistem tidak ditemukan',
            'started_at.required' => 'Tanggal mulai wajib diisi.',
            'term_ends_at.after' => 'Akhir masa jabatan harus setelah tanggal mulai.',
        ];
    }
}
