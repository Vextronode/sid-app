<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRwRequest extends FormRequest
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
        /** @var Rw $rw */
        $rw = $this->route('rw');

        return [
            'number' => [
                'sometimes',
                'string',
                'max:10',
                Rule::unique('rws')->where(fn ($q) => $q->where('hamlet_id', $rw->hamlet_id))->ignore($rw->id),
            ],
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'number.unique' => 'RW dengan nomor ini sudah ada di dusun tersebut',
        ];
    }
}
