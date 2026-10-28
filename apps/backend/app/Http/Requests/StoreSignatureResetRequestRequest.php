<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSignatureResetRequestRequest extends FormRequest
{
    /**
     * Setiap akun login boleh mengajukan untuk TTD-nya sendiri; syarat
     * lain (punya TTD, belum ada pengajuan pending) di service.
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
