<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ResolveMapLinkRequest extends FormRequest
{
    /**
     * Bagian dari Kelola Profil Desa (UC-18); aktornya sama dengan
     * UpdateVillageProfileRequest.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang dapat mengubah profil desa');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'url' => ['required', 'string', 'url', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'url.required' => 'Link Google Maps wajib diisi',
            'url.url' => 'Link harus berupa URL lengkap, mis. https://maps.app.goo.gl/...',
        ];
    }
}
