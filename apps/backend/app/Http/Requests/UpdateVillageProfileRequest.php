<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateVillageProfileRequest extends FormRequest
{
    /**
     * UC-18. Aktor HANYA Petugas Desa (SID-ARCH-SYS-001 S2.3 - Kepala
     * Desa/Sekretaris Desa tidak punya akses ke domain CMS meski
     * keduanya approver aktif di domain surat).
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya Petugas Desa yang dapat mengubah profil desa');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'head_name' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:20'],
            'history' => ['nullable', 'string'],
            'vision' => ['nullable', 'string'],
            'mission' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama desa wajib diisi',
            'head_name.required' => 'Nama Kepala Desa wajib diisi',
        ];
    }
}
