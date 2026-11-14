<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IndexLetterExpiryReminderSettingRequest extends FormRequest
{
    /** Pengaturan pengingat masa berlaku surat: khusus Staf SIDUTama. */
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
