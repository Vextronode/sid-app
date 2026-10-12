<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateApprovalSettingRequest extends FormRequest
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

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'deadline_hours' => ['required', 'integer', 'min:1'],
            'reminder_hours' => ['required', 'integer', 'min:0', 'lt:deadline_hours'],
        ];
    }

    public function messages(): array
    {
        return [
            'reminder_hours.lt' => 'Reminder hours harus lebih kecil dari deadline hours',
        ];
    }
}
