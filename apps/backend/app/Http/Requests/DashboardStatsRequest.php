<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DashboardStatsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date'],
            // Id jenis surat (angka) atau "all". Nilai lain ditolak di sini
            // karena dibandingkan langsung dengan kolom angka letter_type_id
            // (PostgreSQL melempar error untuk teks bukan angka).
            'letter_type' => ['nullable', 'regex:/^(all|[0-9]+)$/'],
        ];
    }
}
