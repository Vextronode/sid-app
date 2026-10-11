<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetUserSignatureRequest extends FormRequest
{
    /**
     * Otorisasi peran ditegakkan middleware Petugas Desa di routes/api.php
     * dan diperiksa ulang (termasuk kesamaan desa) di UserSignatureService.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }
}
