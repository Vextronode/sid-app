<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IndexApprovalSettingRequest extends FormRequest
{
    /**
     * UC-22. Konfigurasi deadline approval - domain eksklusif Petugas
     * Desa (SID-ARCH-SYS-001 S2.3), sama seperti domain config lainnya.
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
