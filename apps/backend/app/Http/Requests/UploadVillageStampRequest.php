<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UploadVillageStampRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa'
            && $this->user()?->is_active
            && $this->user()?->village_id !== null;
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'stamp' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ];
    }
}
