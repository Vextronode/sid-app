<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class StoreRegulationRequest extends FormRequest
{
    /**
     * UC-24. Aktor HANYA Petugas Desa (SID-ARCH-SYS-001 S2.3).
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang berwenang.');
    }

    /**
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
