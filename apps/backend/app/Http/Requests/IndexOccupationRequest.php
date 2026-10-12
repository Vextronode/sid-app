<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

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
        return [
            'include_inactive' => ['sometimes', 'boolean'],
        ];
    }
}
