<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateNewsRequest extends FormRequest
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

    /**
     * Normalisasi is_published sebelum divalidasi - klien (form-data,
     * query string) sering mengirim "true"/"false" sebagai teks, yang
     * ditolak rule `boolean` bawaan Laravel (cuma menerima true/false/0/1/"0"/"1").
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('is_published')) {
            $this->merge([
                'is_published' => filter_var($this->input('is_published'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:200'],
            'content' => ['sometimes', 'string'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}
