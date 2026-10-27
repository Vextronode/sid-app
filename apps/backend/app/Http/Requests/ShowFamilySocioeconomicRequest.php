<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ShowFamilySocioeconomicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['staf_sid', 'kasi_pemerintahan', 'kaur_tu_umum'], true);
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().', Kasi Pemerintahan, dan Kaur TU & Umum yang berwenang.');
    }

    public function rules(): array
    {
        return [];
    }
}
