<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFamilyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'family_address' => ['sometimes', 'string'],
            'family_status' => ['sometimes', Rule::in(['aktif', 'pindah', 'bubar'])],
            'rt_id' => ['nullable', 'exists:rts,id'],
            'rw_id' => ['nullable', 'exists:rws,id'],
            'hamlet_id' => ['nullable', 'exists:hamlets,id'],
        ];
    }
}
