<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AddVillageOrgMemberRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
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
            'member_name' => ['required_without:from_member_id', 'nullable', 'string', 'max:150'],
            'from_member_id' => ['nullable', 'integer', 'exists:village_org_members,id'],
            'previous_holder' => ['sometimes', 'string', 'in:end,to_member'],
            'phone_wa' => ['nullable', 'string', 'max:20'],
            'started_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'member_name.required_without' => 'Nama anggota wajib diisi',
            'from_member_id.exists' => 'Anggota yang dipilih tidak ditemukan',
            'previous_holder.in' => 'Pilihan pemegang jabatan lama tidak valid',
            'started_at.required' => 'Tanggal mulai menjabat wajib diisi',
        ];
    }
}
