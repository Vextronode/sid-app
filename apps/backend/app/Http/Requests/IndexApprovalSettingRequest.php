<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
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
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang berwenang.');
    }

    public function rules(): array
    {
        return [];
    }
}
