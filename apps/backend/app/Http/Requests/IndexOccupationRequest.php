<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class IndexOccupationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->query->has('include_inactive')) {
            $value = $this->query('include_inactive');
            $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $this->merge(['include_inactive' => $parsed ?? $value]);
        }
    }

    /**
     * Semua pengguna boleh membaca katalog untuk isian pekerjaan di form
     * surat; hanya Staf SID yang melihat pekerjaan nonaktif.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function includeInactive(): bool
    {
        return $this->user()?->role === UserRole::StafSid->value && $this->boolean('include_inactive');
    }

    public function rules(): array
    {
        return [
            'include_inactive' => ['sometimes', 'boolean'],
        ];
    }
}
