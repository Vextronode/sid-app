<?php

namespace App\Http\Requests;

use App\Models\Rt;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRtRequest extends FormRequest
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
        /** @var Rt $rt */
        $rt = $this->route('rt');
        return [
            'number' => [
                'sometimes',
                'string',
                'max:10',
                Rule::unique('rts')->where(fn ($q) => $q->where('rw_id', $rt->rw_id))->ignore($rt->id),
            ],
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'number.unique' => 'RT dengan nomor ini sudah ada di RW tersebut',
        ];
    }
}
