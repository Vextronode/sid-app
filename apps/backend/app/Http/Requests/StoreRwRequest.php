<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRwRequest extends FormRequest
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
            'hamlet_id' => 'required|exists:hamlets,id',
            'number' => [
                'required',
                'string',
                'max:10',
                Rule::unique('rws')->where(fn ($q) => $q->where('hamlet_id', $this->input('hamlet_id'))),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'number.unique' => 'RW dengan nomor ini sudah ada di dusun tersebut',
        ];
    }
}
