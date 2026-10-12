<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateRegulationRequest extends FormRequest
{
    /**
     * UC-24. Aktor HANYA Petugas Desa (SID-ARCH-SYS-001 S2.3).
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya Petugas Desa yang berwenang.');
    }

    /**
     * api_spec memakai skema yang sama dengan create (VillageRegulationCreateRequest)
     * untuk PATCH - regulation_number/title/content tetap wajib, bukan partial update.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'regulation_number' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string'],
            'enacted_date' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'regulation_number.required' => 'Nomor peraturan wajib diisi',
            'title.required' => 'Judul peraturan wajib diisi',
            'content.required' => 'Isi peraturan wajib diisi',
        ];
    }
}
