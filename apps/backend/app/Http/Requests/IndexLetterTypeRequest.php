<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IndexLetterTypeRequest extends FormRequest
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
     * Daftar aktif terbuka untuk semua user login (warga memilih jenis
     * surat). Daftar lengkap (Draft/Nonaktif) khusus Petugas Desa.
     */
    public function authorize(): bool
    {
        if ($this->input('include_inactive') !== true) {
            return true;
        }

        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang berwenang.');
    }

    public function rules(): array
    {
        return [
            'include_inactive' => ['sometimes', 'boolean'],
        ];
    }
}
