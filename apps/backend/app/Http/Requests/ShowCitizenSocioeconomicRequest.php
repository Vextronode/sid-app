<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ShowCitizenSocioeconomicRequest extends FormRequest
{
    /**
     * UC-09 lanjutan. Pengelolaan data citizens (termasuk data
     * sosio-ekonomi) hanya oleh Petugas Desa (SID-ARCH-BE-001 S5.3).
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya Petugas Desa yang berwenang.');
    }

    public function rules(): array
    {
        return [];
    }
}
