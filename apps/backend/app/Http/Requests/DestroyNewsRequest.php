<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DestroyNewsRequest extends FormRequest
{
    /**
     * UC-19. Aktor HANYA Petugas Desa (SID-ARCH-SYS-001 S2.3).
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
