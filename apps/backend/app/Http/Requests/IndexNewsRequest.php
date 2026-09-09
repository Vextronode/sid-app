<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IndexNewsRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', 'in:draft,published'],
        ];
    }
}
