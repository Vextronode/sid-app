<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectSignatureResetRequestRequest extends FormRequest
{
    /**
     * Otorisasi peran ditegakkan middleware Staf SIDUTama di routes/api.php
     * dan diperiksa ulang (termasuk kesamaan desa) di service.
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
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
