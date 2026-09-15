<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class StoreVillageOrgPositionRequest extends FormRequest
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
        throw new HttpException(403, 'Anda tidak memiliki akses untuk aksi ini.');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'org_type' => ['required', 'string', 'in:bpd,bumdes,lpm,karang_taruna,pkk'],
            'position_label' => ['required', 'string', 'max:100'],
            'is_single_occupant' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'org_type.required' => 'Tipe organisasi wajib diisi',
            'org_type.in' => 'Tipe organisasi tidak valid',
            'position_label.required' => 'Nama jabatan wajib diisi',
        ];
    }
}
