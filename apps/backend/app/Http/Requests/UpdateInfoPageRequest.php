<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Support\InfoPageFields;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateInfoPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang dapat mengubah halaman informasi');
    }

    /**
     * Aturan dibangun dari skema halaman (App\Support\InfoPageFields).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return InfoPageFields::rules((string) $this->route('page'));
    }

    public function messages(): array
    {
        return [
            '*.max' => 'Isian terlalu panjang',
            '*.*.max' => 'Butir daftar paling banyak '.InfoPageFields::TEXT_MAX.' karakter',
            '*.email' => 'Format email tidak valid',
            '*.date_format' => 'Format tanggal tidak valid',
            '*.array' => 'Isian daftar tidak valid',
        ];
    }
}
