<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IndexVillageOrgPositionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    public function failedAuthorization(): void
    {
        throw new HttpException(403, 'Anda tidka memiliki akses untuk aksi ini.');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'org_type' => ['sometimes', 'string', 'in:bpd,bumdes,lpm,karang_taruna,pkk'],
        ];
    }
}
